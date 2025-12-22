import type { Reporter, BaseReporterConfig } from './base';
import type { ToolCallEvent, ErrorEvent, BatchPayload } from '../types';
import { version } from '../version';

/**
 * Configuration for CloudReporter
 */
export interface CloudReporterConfig extends BaseReporterConfig {
  /**
   * API key for authentication
   */
  apiKey: string;

  /**
   * API endpoint URL
   */
  endpoint: string;

  /**
   * Server ID for identifying the source
   */
  serverId: string;
}

/**
 * Reporter that sends events to the cloud API
 *
 * Sends batched events to the MCP Observatory cloud service for:
 * - Real-time dashboard visualization
 * - Long-term storage and analytics
 * - Alerting and notifications
 * - Multi-server monitoring
 *
 * @example
 * ```typescript
 * const reporter = new CloudReporter({
 *   apiKey: 'sk_xxx',
 *   endpoint: 'https://api.mcp-observatory.dev/v1/ingest',
 *   serverId: 'srv_123',
 *   debug: true
 * });
 *
 * await reporter.send([event1, event2]);
 * ```
 */
export class CloudReporter implements Reporter {
  private config: CloudReporterConfig;

  constructor(config: CloudReporterConfig) {
    this.config = config;
  }

  async send(events: (ToolCallEvent | ErrorEvent)[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const payload: BatchPayload = {
      events,
      serverId: this.config.serverId,
      sdkVersion: version,
    };

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
      }

      if (this.config.debug) {
        console.error(`[CloudReporter] Sent ${events.length} events to ${this.config.endpoint}`);
      }
    } catch (error) {
      console.error('[CloudReporter] Failed to send events:', error);
      throw error;
    }
  }

  async flush(): Promise<void> {
    // Cloud reporter sends immediately, so nothing to flush
    if (this.config.debug) {
      console.error('[CloudReporter] Flush called (no-op for cloud reporter)');
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();

    if (this.config.debug) {
      console.error('[CloudReporter] Shutdown complete');
    }
  }
}
