import type { Reporter, BaseReporterConfig } from './base';
import type { ToolCallEvent, ErrorEvent } from '../types';

/**
 * Configuration for ConsoleReporter
 */
export interface ConsoleReporterConfig extends BaseReporterConfig {
  /**
   * Enable debug logging (always true for console reporter)
   */
  debug?: boolean;
}

/**
 * Reporter that logs events to console (for debugging/development)
 *
 * Useful for:
 * - Development and debugging
 * - Quick testing without file I/O
 * - Verifying SDK integration
 *
 * @example
 * ```typescript
 * const reporter = new ConsoleReporter({ debug: true });
 * await reporter.send([event1, event2]);
 * ```
 */
export class ConsoleReporter implements Reporter {
  private config: ConsoleReporterConfig;

  constructor(config: ConsoleReporterConfig = {}) {
    this.config = { debug: true, ...config };
  }

  async send(events: (ToolCallEvent | ErrorEvent)[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    events.forEach((event) => {
      if ('toolName' in event) {
        // Tool call event
        const status = event.success ? '✓' : '✗';
        const duration = event.duration ? `(${event.duration}ms)` : '';
        console.error(`[Observatory] ToolCall: ${event.toolName} ${duration} ${status}`);

        if (this.config.debug) {
          console.error('  Parameters:', event.parameters);
          if (event.error) {
            console.error('  Error:', event.error);
          }
        }
      } else {
        // Error event
        console.error(`[Observatory] Error: ${event.errorType} - ${event.message}`);

        if (this.config.debug && event.stack) {
          console.error('  Stack:', event.stack);
        }
      }
    });
  }

  async flush(): Promise<void> {
    // Console reporter writes immediately, so nothing to flush
  }

  async shutdown(): Promise<void> {
    if (this.config.debug) {
      console.error('[Observatory] ConsoleReporter shutdown');
    }
  }
}
