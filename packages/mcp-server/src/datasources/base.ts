import type {
  ServerMetrics,
  ToolStats,
  ErrorLogsResponse,
  CostEstimate,
  PerformanceAnalysis,
  TimeRange,
  Severity,
} from '../types.js';

/**
 * Query parameters for metrics
 */
export interface MetricsQueryParams {
  serverId: string;
  timeRange?: TimeRange;
}

/**
 * Query parameters for tool statistics
 */
export interface ToolStatsQueryParams extends MetricsQueryParams {
  toolName: string;
}

/**
 * Query parameters for error logs
 */
export interface ErrorLogsQueryParams {
  serverId: string;
  limit?: number;
  severity?: Severity;
}

/**
 * Query parameters for cost estimation
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CostEstimateQueryParams extends MetricsQueryParams {}

/**
 * Query parameters for performance analysis
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PerformanceAnalysisQueryParams extends MetricsQueryParams {}

/**
 * Base DataSource interface for querying MCP metrics from different sources
 */
export interface DataSource {
  /**
   * Get real-time performance metrics for an MCP server
   */
  getServerMetrics(params: MetricsQueryParams): Promise<ServerMetrics>;

  /**
   * Get detailed statistics for a specific tool
   */
  getToolStats(params: ToolStatsQueryParams): Promise<ToolStats>;

  /**
   * Retrieve recent error logs for debugging
   */
  getErrorLogs(params: ErrorLogsQueryParams): Promise<ErrorLogsResponse>;

  /**
   * Calculate estimated API costs for a server
   */
  getCostEstimate(params: CostEstimateQueryParams): Promise<CostEstimate>;

  /**
   * AI-powered performance analysis with actionable recommendations
   */
  analyzePerformance(params: PerformanceAnalysisQueryParams): Promise<PerformanceAnalysis>;

  /**
   * Cleanup resources on shutdown
   */
  shutdown(): Promise<void>;
}

/**
 * Base configuration for all data sources
 */
export interface BaseDataSourceConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;
}
