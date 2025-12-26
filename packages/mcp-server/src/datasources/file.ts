import { readFile, stat } from 'fs/promises';
import type {
  DataSource,
  BaseDataSourceConfig,
  MetricsQueryParams,
  ToolStatsQueryParams,
  ErrorLogsQueryParams,
  CostEstimateQueryParams,
  PerformanceAnalysisQueryParams,
} from './base.js';
import type {
  ServerMetrics,
  ToolStats,
  ErrorLogsResponse,
  CostEstimate,
  PerformanceAnalysis,
  PerformanceInsight,
  TimeRange,
} from '../types.js';

/**
 * Configuration for FileDataSource
 */
export interface FileDataSourceConfig extends BaseDataSourceConfig {
  /**
   * Path to the NDJSON file where events are stored
   */
  filePath: string;
}

/**
 * Event types from SDK
 */
interface ToolCallEvent {
  id: string;
  timestamp: number;
  serverId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorEvent {
  id: string;
  timestamp: number;
  serverId: string;
  errorType: string;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

type Event = ToolCallEvent | ErrorEvent;

/**
 * DataSource that reads events from a local NDJSON file
 *
 * Reads events written by the SDK's FileReporter and provides
 * metrics, statistics, and analysis capabilities.
 *
 * @example
 * ```typescript
 * const dataSource = new FileDataSource({
 *   filePath: './logs/mcp-metrics.ndjson',
 *   debug: true
 * });
 *
 * const metrics = await dataSource.getServerMetrics({
 *   serverId: 'srv_123',
 *   timeRange: '1h'
 * });
 * ```
 */
export class FileDataSource implements DataSource {
  private config: FileDataSourceConfig;
  private eventsCache: Event[] | null = null;
  private lastCacheTime: number = 0;
  private lastFileModificationTime: number = 0;
  private readonly CACHE_TTL_MS = 5000; // 5 seconds cache

  constructor(config: FileDataSourceConfig) {
    this.config = config;
  }

  /**
   * Load and parse events from NDJSON file
   * Automatically detects file modifications and invalidates cache
   */
  private async loadEvents(): Promise<Event[]> {
    try {
      // Check if file has been modified
      const stats = await stat(this.config.filePath);
      const fileModificationTime = stats.mtimeMs;

      // Invalidate cache if file has been modified
      const fileHasChanged = fileModificationTime !== this.lastFileModificationTime;

      // Use cache if valid and file hasn't changed
      const now = Date.now();
      const cacheIsValid =
        this.eventsCache && now - this.lastCacheTime < this.CACHE_TTL_MS && !fileHasChanged;

      if (cacheIsValid) {
        if (this.config.debug) {
          console.log('[FileDataSource] Using cached events');
        }
        return this.eventsCache!;
      }

      // File has changed or cache expired, reload
      if (this.config.debug && fileHasChanged) {
        console.log('[FileDataSource] File modified, reloading events');
      }

      const content = await readFile(this.config.filePath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);

      this.eventsCache = lines
        .map((line) => {
          try {
            return JSON.parse(line) as Event;
          } catch (_error) {
            if (this.config.debug) {
              console.warn(`[FileDataSource] Skipping corrupted line: ${line.substring(0, 50)}...`);
            }
            return null;
          }
        })
        .filter((event): event is Event => event !== null);

      this.lastCacheTime = now;
      this.lastFileModificationTime = fileModificationTime;

      if (this.config.debug) {
        console.log(
          `[FileDataSource] Loaded ${this.eventsCache.length} events from ${this.config.filePath}`
        );
      }

      return this.eventsCache;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist yet, return empty array
        if (this.config.debug) {
          console.log(
            `[FileDataSource] File not found: ${this.config.filePath}, returning empty events`
          );
        }
        return [];
      }
      throw error;
    }
  }

  /**
   * Filter events by time range
   */
  private filterByTimeRange(events: Event[], timeRange: TimeRange = '1h'): Event[] {
    const now = Date.now();
    const ranges: Record<TimeRange, number> = {
      '5m': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - ranges[timeRange];
    return events.filter((event) => event.timestamp >= cutoff);
  }

  /**
   * Check if event is a ToolCallEvent
   */
  private isToolCallEvent(event: Event): event is ToolCallEvent {
    return 'toolName' in event;
  }

  /**
   * Check if event is an ErrorEvent
   */
  private isErrorEvent(event: Event): event is ErrorEvent {
    return 'errorType' in event;
  }

  async getServerMetrics(params: MetricsQueryParams): Promise<ServerMetrics> {
    const events = await this.loadEvents();
    const timeRange = params.timeRange || '1h';

    // If serverId is not provided, return metrics for all servers
    if (!params.serverId) {
      return this.getAllServersMetrics(events, timeRange);
    }

    // Single server metrics
    const filtered = this.filterByTimeRange(events, timeRange).filter(
      (e) => e.serverId === params.serverId && this.isToolCallEvent(e)
    ) as ToolCallEvent[];

    const totalCalls = filtered.length;
    const successfulCalls = filtered.filter((e) => e.success).length;
    const successRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;

    // Calculate durations
    const durations = filtered
      .filter((e) => e.duration !== undefined)
      .map((e) => e.duration!)
      .sort((a, b) => a - b);

    const avgDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

    // Top tools
    const toolCounts: Record<string, { calls: number; totalDuration: number }> = {};
    filtered.forEach((event) => {
      if (!toolCounts[event.toolName]) {
        toolCounts[event.toolName] = { calls: 0, totalDuration: 0 };
      }
      toolCounts[event.toolName].calls++;
      if (event.duration) {
        toolCounts[event.toolName].totalDuration += event.duration;
      }
    });

    const topTools = Object.entries(toolCounts)
      .map(([name, data]) => ({
        name,
        calls: data.calls,
        avg_duration_ms: data.calls > 0 ? data.totalDuration / data.calls : 0,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    return {
      server_id: params.serverId,
      time_range: timeRange,
      metrics: {
        total_calls: totalCalls,
        success_rate: successRate,
        avg_duration_ms: avgDuration,
        p50_duration_ms: p50,
        p95_duration_ms: p95,
        p99_duration_ms: p99,
        error_rate: 1 - successRate,
        top_tools: topTools,
      },
    };
  }

  /**
   * Get aggregated metrics for all servers
   */
  private getAllServersMetrics(events: Event[], timeRange: TimeRange): ServerMetrics {
    const filteredEvents = this.filterByTimeRange(events, timeRange);
    const toolCallEvents = filteredEvents.filter(this.isToolCallEvent) as ToolCallEvent[];

    // Group events by serverId
    const serverIds = Array.from(new Set(toolCallEvents.map((e) => e.serverId)));

    // Calculate metrics for each server
    const servers = serverIds.map((serverId) => {
      const serverEvents = toolCallEvents.filter((e) => e.serverId === serverId);
      const totalCalls = serverEvents.length;
      const successfulCalls = serverEvents.filter((e) => e.success).length;
      const successRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;

      const durations = serverEvents
        .filter((e) => e.duration !== undefined)
        .map((e) => e.duration!)
        .sort((a, b) => a - b);

      const avgDuration =
        durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

      const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
      const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
      const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

      const toolCounts: Record<string, { calls: number; totalDuration: number }> = {};
      serverEvents.forEach((event) => {
        if (!toolCounts[event.toolName]) {
          toolCounts[event.toolName] = { calls: 0, totalDuration: 0 };
        }
        toolCounts[event.toolName].calls++;
        if (event.duration) {
          toolCounts[event.toolName].totalDuration += event.duration;
        }
      });

      const topTools = Object.entries(toolCounts)
        .map(([name, data]) => ({
          name,
          calls: data.calls,
          avg_duration_ms: data.calls > 0 ? data.totalDuration / data.calls : 0,
        }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 10);

      return {
        server_id: serverId,
        time_range: timeRange,
        metrics: {
          total_calls: totalCalls,
          success_rate: successRate,
          avg_duration_ms: avgDuration,
          p50_duration_ms: p50,
          p95_duration_ms: p95,
          p99_duration_ms: p99,
          error_rate: 1 - successRate,
          top_tools: topTools,
        },
      };
    });

    // Calculate aggregated metrics
    const totalCalls = toolCallEvents.length;
    const successfulCalls = toolCallEvents.filter((e) => e.success).length;
    const successRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;

    const allDurations = toolCallEvents
      .filter((e) => e.duration !== undefined)
      .map((e) => e.duration!)
      .sort((a, b) => a - b);

    const avgDuration =
      allDurations.length > 0
        ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
        : 0;

    const p50 = allDurations[Math.floor(allDurations.length * 0.5)] || 0;
    const p95 = allDurations[Math.floor(allDurations.length * 0.95)] || 0;
    const p99 = allDurations[Math.floor(allDurations.length * 0.99)] || 0;

    return {
      server_id: 'all',
      time_range: timeRange,
      servers,
      aggregated_metrics: {
        total_calls: totalCalls,
        success_rate: successRate,
        avg_duration_ms: avgDuration,
        p50_duration_ms: p50,
        p95_duration_ms: p95,
        p99_duration_ms: p99,
        error_rate: 1 - successRate,
        total_servers: serverIds.length,
      },
    };
  }

  async getToolStats(params: ToolStatsQueryParams): Promise<ToolStats> {
    const events = await this.loadEvents();
    const timeRange = params.timeRange || '1h';

    // If serverId is not provided, return stats for this tool across all servers
    if (!params.serverId) {
      return this.getAllServersToolStats(events, params.toolName, timeRange);
    }

    // Single server tool stats
    const filtered = this.filterByTimeRange(events, timeRange).filter(
      (e) =>
        e.serverId === params.serverId && this.isToolCallEvent(e) && e.toolName === params.toolName
    ) as ToolCallEvent[];

    const totalCalls = filtered.length;
    const successCount = filtered.filter((e) => e.success).length;
    const errorCount = totalCalls - successCount;

    const durations = filtered
      .filter((e) => e.duration !== undefined)
      .map((e) => e.duration!)
      .sort((a, b) => a - b);

    const avgDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

    return {
      server_id: params.serverId,
      tool_name: params.toolName,
      time_range: timeRange,
      stats: {
        total_calls: totalCalls,
        success_count: successCount,
        error_count: errorCount,
        avg_duration_ms: avgDuration,
        p50_duration_ms: p50,
        p95_duration_ms: p95,
        p99_duration_ms: p99,
      },
    };
  }

  /**
   * Get tool statistics across all servers
   */
  private getAllServersToolStats(
    events: Event[],
    toolName: string,
    timeRange: TimeRange
  ): ToolStats {
    const filteredEvents = this.filterByTimeRange(events, timeRange);
    const toolCallEvents = filteredEvents.filter(
      (e) => this.isToolCallEvent(e) && e.toolName === toolName
    ) as ToolCallEvent[];

    // Group events by serverId
    const serverIds = Array.from(new Set(toolCallEvents.map((e) => e.serverId)));

    // Calculate stats for each server
    const servers = serverIds.map((serverId) => {
      const serverEvents = toolCallEvents.filter((e) => e.serverId === serverId);
      const totalCalls = serverEvents.length;
      const successCount = serverEvents.filter((e) => e.success).length;
      const errorCount = totalCalls - successCount;

      const durations = serverEvents
        .filter((e) => e.duration !== undefined)
        .map((e) => e.duration!)
        .sort((a, b) => a - b);

      const avgDuration =
        durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

      const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
      const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
      const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

      return {
        server_id: serverId,
        stats: {
          total_calls: totalCalls,
          success_count: successCount,
          error_count: errorCount,
          avg_duration_ms: avgDuration,
          p50_duration_ms: p50,
          p95_duration_ms: p95,
          p99_duration_ms: p99,
        },
      };
    });

    // Calculate aggregated stats
    const totalCalls = toolCallEvents.length;
    const successCount = toolCallEvents.filter((e) => e.success).length;
    const errorCount = totalCalls - successCount;

    const allDurations = toolCallEvents
      .filter((e) => e.duration !== undefined)
      .map((e) => e.duration!)
      .sort((a, b) => a - b);

    const avgDuration =
      allDurations.length > 0
        ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
        : 0;

    const p50 = allDurations[Math.floor(allDurations.length * 0.5)] || 0;
    const p95 = allDurations[Math.floor(allDurations.length * 0.95)] || 0;
    const p99 = allDurations[Math.floor(allDurations.length * 0.99)] || 0;

    return {
      server_id: 'all',
      tool_name: toolName,
      time_range: timeRange,
      servers,
      aggregated_stats: {
        total_calls: totalCalls,
        success_count: successCount,
        error_count: errorCount,
        avg_duration_ms: avgDuration,
        p50_duration_ms: p50,
        p95_duration_ms: p95,
        p99_duration_ms: p99,
        total_servers: serverIds.length,
      },
    };
  }

  async getErrorLogs(params: ErrorLogsQueryParams): Promise<ErrorLogsResponse> {
    const events = await this.loadEvents();

    // If serverId is not provided, return errors from all servers
    if (!params.serverId) {
      return this.getAllServersErrorLogs(events, params.limit, params.severity);
    }

    // Single server error logs
    const errorEvents = events.filter(
      (e) => e.serverId === params.serverId && this.isErrorEvent(e)
    ) as ErrorEvent[];

    // Group by error type and message
    const errorGroups: Map<string, ErrorEvent[]> = new Map();
    errorEvents.forEach((event) => {
      const key = `${event.errorType}:${event.message}`;
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(event);
    });

    const errors = Array.from(errorGroups.entries())
      .map(([, events]) => {
        const latest = events[events.length - 1];
        return {
          id: latest.id,
          timestamp: new Date(latest.timestamp).toISOString(),
          tool_name: (latest.metadata?.toolName as string) || 'unknown',
          error_type: latest.errorType,
          message: latest.message,
          stack: latest.stack,
          frequency: events.length,
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, params.limit || 50);

    return {
      server_id: params.serverId,
      errors,
      total_count: errorEvents.length,
      time_range: 'all',
    };
  }

  /**
   * Get error logs from all servers
   */
  private getAllServersErrorLogs(
    events: Event[],
    limit?: number,
    _severity?: import('../types.js').Severity
  ): ErrorLogsResponse {
    const errorEvents = events.filter(this.isErrorEvent) as ErrorEvent[];

    // Group by serverId
    const serverIds = Array.from(new Set(errorEvents.map((e) => e.serverId)));

    // Group all errors by error type and message globally
    const errorGroups: Map<string, ErrorEvent[]> = new Map();
    errorEvents.forEach((event) => {
      const key = `${event.serverId}:${event.errorType}:${event.message}`;
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(event);
    });

    // Convert to array and sort by frequency, then apply global limit
    const allErrors = Array.from(errorGroups.entries())
      .map(([, events]) => {
        const latest = events[events.length - 1];
        return {
          serverId: latest.serverId,
          id: latest.id,
          timestamp: new Date(latest.timestamp).toISOString(),
          tool_name: (latest.metadata?.toolName as string) || 'unknown',
          error_type: latest.errorType,
          message: latest.message,
          stack: latest.stack,
          frequency: events.length,
        };
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit || 50);

    // Group limited errors by serverId
    const servers = serverIds.map((serverId) => {
      const serverErrors = allErrors.filter((e) => e.serverId === serverId);
      const serverErrorCount = errorEvents.filter((e) => e.serverId === serverId).length;

      return {
        server_id: serverId,
        errors: serverErrors.map(({ serverId: _, ...error }) => error),
        total_count: serverErrorCount,
      };
    });

    // Calculate total errors across all servers
    const totalCount = errorEvents.length;

    return {
      server_id: 'all',
      servers,
      total_count: totalCount,
      time_range: 'all',
    };
  }

  async getCostEstimate(params: CostEstimateQueryParams): Promise<CostEstimate> {
    const events = await this.loadEvents();
    const timeRange = params.timeRange || '24h';

    // If serverId is not provided, return costs for all servers
    if (!params.serverId) {
      return this.getAllServersCostEstimate(events, timeRange);
    }

    // Single server cost estimate
    const filtered = this.filterByTimeRange(events, timeRange).filter(
      (e) => e.serverId === params.serverId && this.isToolCallEvent(e)
    );

    const totalCalls = filtered.length;
    // Rough estimate: $0.001 per tool call (placeholder)
    const costPerCall = 0.001;
    const estimatedCost = totalCalls * costPerCall;

    return {
      server_id: params.serverId,
      time_range: timeRange,
      estimated_cost_usd: estimatedCost,
      breakdown: {
        tool_calls: totalCalls,
        cost_per_call: costPerCall,
        total_calls: totalCalls,
      },
    };
  }

  /**
   * Get cost estimates for all servers
   */
  private getAllServersCostEstimate(events: Event[], timeRange: TimeRange): CostEstimate {
    const filteredEvents = this.filterByTimeRange(events, timeRange);
    const toolCallEvents = filteredEvents.filter(this.isToolCallEvent) as ToolCallEvent[];

    // Group by serverId
    const serverIds = Array.from(new Set(toolCallEvents.map((e) => e.serverId)));

    const costPerCall = 0.001;

    // Calculate costs for each server
    const servers = serverIds.map((serverId) => {
      const serverEvents = toolCallEvents.filter((e) => e.serverId === serverId);
      const totalCalls = serverEvents.length;
      const estimatedCost = totalCalls * costPerCall;

      return {
        server_id: serverId,
        estimated_cost_usd: estimatedCost,
        breakdown: {
          tool_calls: totalCalls,
          cost_per_call: costPerCall,
          total_calls: totalCalls,
        },
      };
    });

    // Calculate total costs
    const totalCalls = toolCallEvents.length;
    const totalEstimatedCost = totalCalls * costPerCall;

    return {
      server_id: 'all',
      time_range: timeRange,
      servers,
      total_estimated_cost_usd: totalEstimatedCost,
      total_calls: totalCalls,
    };
  }

  async analyzePerformance(params: PerformanceAnalysisQueryParams): Promise<PerformanceAnalysis> {
    const metrics = await this.getServerMetrics(params);
    const timeRange = params.timeRange || '24h';

    // Type guard: check if this is all-servers metrics
    if (metrics.server_id === 'all') {
      return this.analyzeAllServersPerformance(metrics, timeRange);
    }

    // Single server performance analysis
    // TypeScript needs help here - we know metrics has 'metrics' property because server_id !== 'all'
    const singleServerMetrics = metrics as Extract<
      ServerMetrics,
      { server_id: string; metrics: unknown }
    >;
    const insights: PerformanceInsight[] = [];

    // Detect slow tools
    singleServerMetrics.metrics.top_tools
      .filter((tool) => tool.avg_duration_ms > 1000)
      .forEach((tool) => {
        insights.push({
          type: 'slow_tool',
          severity: tool.avg_duration_ms > 5000 ? 'high' : 'medium',
          tool_name: tool.name,
          message: `Tool "${tool.name}" has high average duration: ${tool.avg_duration_ms.toFixed(0)}ms`,
          recommendation: `Consider optimizing "${tool.name}" or adding caching`,
        });
      });

    // Detect high error rate
    if (singleServerMetrics.metrics.error_rate > 0.1) {
      insights.push({
        type: 'error_spike',
        severity: singleServerMetrics.metrics.error_rate > 0.3 ? 'critical' : 'high',
        message: `High error rate detected: ${(singleServerMetrics.metrics.error_rate * 100).toFixed(1)}%`,
        recommendation: 'Review error logs and fix failing tools',
      });
    }

    // Calculate health score
    const healthScore = Math.max(0, 1 - singleServerMetrics.metrics.error_rate);

    return {
      server_id: singleServerMetrics.server_id,
      time_range: timeRange,
      insights,
      health_score: healthScore,
      trend: 'stable', // Would need historical data for real trend
    };
  }

  /**
   * Analyze performance across all servers
   */
  private analyzeAllServersPerformance(
    metrics: ServerMetrics,
    timeRange: TimeRange
  ): PerformanceAnalysis {
    if (metrics.server_id !== 'all') {
      throw new Error('Expected all-servers metrics for all-servers analysis');
    }

    // Type assertion to help TypeScript
    const allServersMetrics = metrics as Extract<ServerMetrics, { server_id: 'all'; servers: unknown }>;
    const criticalInsights: PerformanceInsight[] = [];

    // Analyze each server
    const servers = allServersMetrics.servers.map((serverMetrics) => {
      const insights: PerformanceInsight[] = [];

      // Detect slow tools
      serverMetrics.metrics.top_tools
        .filter((tool) => tool.avg_duration_ms > 1000)
        .forEach((tool) => {
          const severity: 'high' | 'medium' = tool.avg_duration_ms > 5000 ? 'high' : 'medium';
          const insight: PerformanceInsight = {
            type: 'slow_tool',
            severity,
            tool_name: tool.name,
            message: `[${serverMetrics.server_id}] Tool "${tool.name}" has high average duration: ${tool.avg_duration_ms.toFixed(0)}ms`,
            recommendation: `Consider optimizing "${tool.name}" or adding caching`,
          };
          insights.push(insight);

          // Add to critical insights if severity is high
          if (severity === 'high') {
            criticalInsights.push(insight);
          }
        });

      // Detect high error rate
      if (serverMetrics.metrics.error_rate > 0.1) {
        const severity: 'critical' | 'high' =
          serverMetrics.metrics.error_rate > 0.3 ? 'critical' : 'high';
        const insight: PerformanceInsight = {
          type: 'error_spike',
          severity,
          message: `[${serverMetrics.server_id}] High error rate: ${(serverMetrics.metrics.error_rate * 100).toFixed(1)}%`,
          recommendation: 'Review error logs and fix failing tools',
        };
        insights.push(insight);
        criticalInsights.push(insight);
      }

      const healthScore = Math.max(0, 1 - serverMetrics.metrics.error_rate);

      return {
        server_id: serverMetrics.server_id,
        insights,
        health_score: healthScore,
        trend: 'stable' as 'improving' | 'stable' | 'degrading',
      };
    });

    // Calculate overall health score
    const overallHealthScore =
      servers.length > 0
        ? servers.reduce((sum: number, s) => sum + s.health_score, 0) / servers.length
        : 1;

    return {
      server_id: 'all',
      time_range: timeRange,
      servers,
      overall_health_score: overallHealthScore,
      overall_trend: 'stable',
      critical_insights: criticalInsights,
    };
  }

  async shutdown(): Promise<void> {
    // Clear cache
    this.eventsCache = null;

    if (this.config.debug) {
      console.log('[FileDataSource] Shutdown complete');
    }
  }
}
