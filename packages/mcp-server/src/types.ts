import { z } from 'zod';

/**
 * Time range options for queries
 */
export const TimeRangeSchema = z.enum(['5m', '1h', '24h', '7d', '30d']);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

/**
 * Severity levels for errors
 */
export const SeveritySchema = z.enum(['all', 'error', 'critical']);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Metrics for a single server
 */
export const SingleServerMetricsSchema = z.object({
  server_id: z.string(),
  time_range: TimeRangeSchema,
  metrics: z.object({
    total_calls: z.number(),
    success_rate: z.number(),
    avg_duration_ms: z.number(),
    p50_duration_ms: z.number(),
    p95_duration_ms: z.number(),
    p99_duration_ms: z.number(),
    error_rate: z.number(),
    top_tools: z.array(
      z.object({
        name: z.string(),
        calls: z.number(),
        avg_duration_ms: z.number(),
      })
    ),
  }),
});

/**
 * Server metrics response (single server or all servers)
 */
export const ServerMetricsSchema = z.union([
  SingleServerMetricsSchema,
  z.object({
    server_id: z.literal('all'),
    time_range: TimeRangeSchema,
    servers: z.array(SingleServerMetricsSchema),
    aggregated_metrics: z.object({
      total_calls: z.number(),
      success_rate: z.number(),
      avg_duration_ms: z.number(),
      p50_duration_ms: z.number(),
      p95_duration_ms: z.number(),
      p99_duration_ms: z.number(),
      error_rate: z.number(),
      total_servers: z.number(),
    }),
  }),
]);
export type ServerMetrics = z.infer<typeof ServerMetricsSchema>;

/**
 * Tool statistics response (single server or all servers)
 */
export const ToolStatsSchema = z.union([
  z.object({
    server_id: z.string(),
    tool_name: z.string(),
    time_range: TimeRangeSchema,
    stats: z.object({
      total_calls: z.number(),
      success_count: z.number(),
      error_count: z.number(),
      avg_duration_ms: z.number(),
      p50_duration_ms: z.number(),
      p95_duration_ms: z.number(),
      p99_duration_ms: z.number(),
    }),
  }),
  z.object({
    server_id: z.literal('all'),
    tool_name: z.string(),
    time_range: TimeRangeSchema,
    servers: z.array(
      z.object({
        server_id: z.string(),
        stats: z.object({
          total_calls: z.number(),
          success_count: z.number(),
          error_count: z.number(),
          avg_duration_ms: z.number(),
          p50_duration_ms: z.number(),
          p95_duration_ms: z.number(),
          p99_duration_ms: z.number(),
        }),
      })
    ),
    aggregated_stats: z.object({
      total_calls: z.number(),
      success_count: z.number(),
      error_count: z.number(),
      avg_duration_ms: z.number(),
      p50_duration_ms: z.number(),
      p95_duration_ms: z.number(),
      p99_duration_ms: z.number(),
      total_servers: z.number(),
    }),
  }),
]);
export type ToolStats = z.infer<typeof ToolStatsSchema>;

/**
 * Error log entry
 */
export const ErrorLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  tool_name: z.string(),
  error_type: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  frequency: z.number(),
});
export type ErrorLog = z.infer<typeof ErrorLogSchema>;

/**
 * Error logs response (single server or all servers)
 */
export const ErrorLogsResponseSchema = z.union([
  z.object({
    server_id: z.string(),
    errors: z.array(ErrorLogSchema),
    total_count: z.number(),
    time_range: z.string(),
  }),
  z.object({
    server_id: z.literal('all'),
    servers: z.array(
      z.object({
        server_id: z.string(),
        errors: z.array(ErrorLogSchema),
        total_count: z.number(),
      })
    ),
    total_count: z.number(),
    time_range: z.string(),
  }),
]);
export type ErrorLogsResponse = z.infer<typeof ErrorLogsResponseSchema>;

/**
 * Cost estimate response (single server or all servers)
 */
export const CostEstimateSchema = z.union([
  z.object({
    server_id: z.string(),
    time_range: TimeRangeSchema,
    estimated_cost_usd: z.number(),
    breakdown: z.object({
      tool_calls: z.number(),
      cost_per_call: z.number(),
      total_calls: z.number(),
    }),
  }),
  z.object({
    server_id: z.literal('all'),
    time_range: TimeRangeSchema,
    servers: z.array(
      z.object({
        server_id: z.string(),
        estimated_cost_usd: z.number(),
        breakdown: z.object({
          tool_calls: z.number(),
          cost_per_call: z.number(),
          total_calls: z.number(),
        }),
      })
    ),
    total_estimated_cost_usd: z.number(),
    total_calls: z.number(),
  }),
]);
export type CostEstimate = z.infer<typeof CostEstimateSchema>;

/**
 * Performance insight
 */
export const PerformanceInsightSchema = z.object({
  type: z.enum(['slow_tool', 'error_spike', 'high_volume', 'recommendation']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  tool_name: z.string().optional(),
  message: z.string(),
  recommendation: z.string(),
});
export type PerformanceInsight = z.infer<typeof PerformanceInsightSchema>;

/**
 * Performance analysis response (single server or all servers)
 */
export const PerformanceAnalysisSchema = z.union([
  z.object({
    server_id: z.string(),
    time_range: TimeRangeSchema,
    insights: z.array(PerformanceInsightSchema),
    health_score: z.number().min(0).max(1),
    trend: z.enum(['improving', 'stable', 'degrading']),
  }),
  z.object({
    server_id: z.literal('all'),
    time_range: TimeRangeSchema,
    servers: z.array(
      z.object({
        server_id: z.string(),
        insights: z.array(PerformanceInsightSchema),
        health_score: z.number().min(0).max(1),
        trend: z.enum(['improving', 'stable', 'degrading']),
      })
    ),
    overall_health_score: z.number().min(0).max(1),
    overall_trend: z.enum(['improving', 'stable', 'degrading']),
    critical_insights: z.array(PerformanceInsightSchema),
  }),
]);
export type PerformanceAnalysis = z.infer<typeof PerformanceAnalysisSchema>;

/**
 * File data source configuration
 */
export const FileDataSourceConfigSchema = z.object({
  dataSource: z.literal('file'),
  filePath: z.string().min(1, 'File path is required'),
  debug: z.boolean().default(false),
});

/**
 * PostgreSQL data source configuration
 */
export const PostgresDataSourceConfigSchema = z.object({
  dataSource: z.literal('postgres'),
  connectionString: z.string().min(1, 'Connection string is required'),
  debug: z.boolean().default(false),
});

/**
 * Cloud data source configuration (calls MCP Observatory API)
 */
export const CloudDataSourceConfigSchema = z.object({
  dataSource: z.literal('cloud'),
  apiKey: z.string().min(1, 'API key is required'),
  endpoint: z.string().url().default('https://api.mcp-observatory.dev/v1'),
  debug: z.boolean().default(false),
});

/**
 * Union of all data source configurations
 */
export const DataSourceConfigSchema = z.discriminatedUnion('dataSource', [
  FileDataSourceConfigSchema,
  PostgresDataSourceConfigSchema,
  CloudDataSourceConfigSchema,
]);

export type FileDataSourceConfig = z.infer<typeof FileDataSourceConfigSchema>;
export type PostgresDataSourceConfig = z.infer<typeof PostgresDataSourceConfigSchema>;
export type CloudDataSourceConfig = z.infer<typeof CloudDataSourceConfigSchema>;
export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>;

/**
 * MCP Observatory server configuration
 */
export interface ObservatoryServerConfig {
  dataSourceConfig: DataSourceConfig;
}
