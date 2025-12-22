import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { Reporter, BaseReporterConfig } from './base';
import type { ToolCallEvent, ErrorEvent } from '../types';

/**
 * Configuration for FileReporter
 */
export interface FileReporterConfig extends BaseReporterConfig {
  /**
   * Path to the NDJSON file where events will be written
   */
  filePath: string;
}

/**
 * Reporter that writes events to a local NDJSON file
 *
 * Each event is written as a single line of JSON, making it easy to:
 * - Stream process with tools like jq, grep, awk
 * - Import into databases (PostgreSQL, ClickHouse, etc.)
 * - Analyze with data processing tools
 *
 * @example
 * ```typescript
 * const reporter = new FileReporter({
 *   filePath: './logs/mcp-metrics.ndjson',
 *   debug: true
 * });
 *
 * await reporter.send([event1, event2]);
 * ```
 */
export class FileReporter implements Reporter {
  private config: FileReporterConfig;
  private fileCreated = false;

  constructor(config: FileReporterConfig) {
    this.config = config;
  }

  async send(events: (ToolCallEvent | ErrorEvent)[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    try {
      // Ensure directory exists
      if (!this.fileCreated) {
        await this.ensureDirectoryExists();
        this.fileCreated = true;
      }

      // Convert events to NDJSON format
      const ndjson = events.map((event) => JSON.stringify(event)).join('\n') + '\n';

      // Append to file
      await appendFile(this.config.filePath, ndjson, 'utf-8');

      if (this.config.debug) {
        console.error(`[FileReporter] Wrote ${events.length} events to ${this.config.filePath}`);
      }
    } catch (error) {
      console.error('[FileReporter] Failed to write events:', error);
      throw error;
    }
  }

  async flush(): Promise<void> {
    // File reporter writes immediately, so nothing to flush
    if (this.config.debug) {
      console.error('[FileReporter] Flush called (no-op for file reporter)');
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();

    if (this.config.debug) {
      console.error('[FileReporter] Shutdown complete');
    }
  }

  /**
   * Ensure the directory for the file exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    const dir = dirname(this.config.filePath);
    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
