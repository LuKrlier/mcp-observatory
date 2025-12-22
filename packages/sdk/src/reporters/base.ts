import type { ToolCallEvent, ErrorEvent } from '../types';

/**
 * Base Reporter interface for sending events to different destinations
 */
export interface Reporter {
  /**
   * Send a batch of events to the destination
   * @param events - Array of tool call or error events
   */
  send(events: (ToolCallEvent | ErrorEvent)[]): Promise<void>;

  /**
   * Flush any pending events
   */
  flush(): Promise<void>;

  /**
   * Cleanup resources on shutdown
   */
  shutdown(): Promise<void>;
}

/**
 * Base configuration for all reporters
 */
export interface BaseReporterConfig {
  /**
   * Enable debug logging
   */
  debug?: boolean;
}
