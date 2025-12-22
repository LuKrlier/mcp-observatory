import { z } from 'zod';

/**
 * Configuration for file reporter
 */
export const FileReporterConfigSchema = z.object({
  reporter: z.literal('file'),
  filePath: z.string().min(1, 'File path is required'),
  batchSize: z.number().int().positive().default(50),
  batchTimeout: z.number().int().positive().default(5000), // 5 seconds
  sampling: z.number().min(0).max(1).default(1), // 100% sampling by default
  debug: z.boolean().default(false),
});

/**
 * Configuration for console reporter (debugging)
 */
export const ConsoleReporterConfigSchema = z.object({
  reporter: z.literal('console'),
  batchSize: z.number().int().positive().default(50),
  batchTimeout: z.number().int().positive().default(5000),
  sampling: z.number().min(0).max(1).default(1),
  debug: z.boolean().default(false),
});

/**
 * Configuration for cloud reporter
 */
export const CloudReporterConfigSchema = z.object({
  reporter: z.literal('cloud'),
  apiKey: z.string().min(1, 'API key is required'),
  endpoint: z.string().url().default('https://api.mcp-observatory.dev/v1/ingest'),
  batchSize: z.number().int().positive().default(50),
  batchTimeout: z.number().int().positive().default(5000),
  sampling: z.number().min(0).max(1).default(1),
  debug: z.boolean().default(false),
});

/**
 * Union of all reporter configurations
 */
export const ObservatoryConfigSchema = z.discriminatedUnion('reporter', [
  FileReporterConfigSchema,
  ConsoleReporterConfigSchema,
  CloudReporterConfigSchema,
]);

export type FileReporterConfig = z.infer<typeof FileReporterConfigSchema>;
export type ConsoleReporterConfig = z.infer<typeof ConsoleReporterConfigSchema>;
export type CloudReporterConfig = z.infer<typeof CloudReporterConfigSchema>;
export type ObservatoryConfig = z.infer<typeof ObservatoryConfigSchema>;

/**
 * Tool call event schema
 */
export const ToolCallEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  serverId: z.string(),
  toolName: z.string(),
  parameters: z.record(z.unknown()),
  duration: z.number().optional(),
  success: z.boolean(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>;

/**
 * Error event schema
 */
export const ErrorEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  serverId: z.string(),
  errorType: z.string(),
  message: z.string(),
  stack: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

/**
 * Batch payload sent to API
 */
export const BatchPayloadSchema = z.object({
  events: z.array(z.union([ToolCallEventSchema, ErrorEventSchema])),
  serverId: z.string(),
  sdkVersion: z.string(),
});

export type BatchPayload = z.infer<typeof BatchPayloadSchema>;
