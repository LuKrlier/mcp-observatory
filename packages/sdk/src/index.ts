/**
 * @lukrlier/mcp-observatory-sdk
 *
 * Auto-instrumentation SDK for MCP servers with plugin architecture
 * Supports file, console, and cloud reporters
 */

export { Observatory } from './observatory';
export type { ObservatoryOptions } from './observatory';
export { createObservatory } from './factory';
export type {
  ObservatoryConfig,
  FileReporterConfig,
  ConsoleReporterConfig,
  CloudReporterConfig,
  ToolCallEvent,
  ErrorEvent,
} from './types';
export { version } from './version';

// Export reporters for advanced usage
export type { Reporter } from './reporters';
export { FileReporter, ConsoleReporter, CloudReporter } from './reporters';
