import type { ToolCallEvent, ErrorEvent } from './types';
import type { Reporter } from './reporters';

/**
 * Options for Observatory instance
 */
export interface ObservatoryOptions {
  /**
   * Sampling rate (0-1). Default: 1 (100%)
   */
  sampling?: number;

  /**
   * Batch size before automatic flush. Default: 50
   */
  batchSize?: number;

  /**
   * Batch timeout in milliseconds. Default: 5000
   */
  batchTimeout?: number;

  /**
   * Enable debug logging. Default: false
   */
  debug?: boolean;
}

/**
 * Main Observatory SDK class
 * Handles event collection, batching, and transmission to reporters
 */
export class Observatory {
  private reporter: Reporter;
  private eventQueue: (ToolCallEvent | ErrorEvent)[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private serverId: string;
  private sampling: number;
  private batchSize: number;
  private batchTimeout: number;
  private debug: boolean;

  constructor(reporter: Reporter, options: ObservatoryOptions = {}) {
    this.reporter = reporter;
    this.serverId = this.generateServerId();
    this.sampling = options.sampling ?? 1;
    this.batchSize = options.batchSize ?? 50;
    this.batchTimeout = options.batchTimeout ?? 5000;
    this.debug = options.debug ?? false;

    if (this.debug) {
      console.error('[Observatory] Initialized with options:', {
        sampling: this.sampling,
        batchSize: this.batchSize,
        batchTimeout: this.batchTimeout,
      });
    }
  }

  /**
   * Track a tool call event
   */
  trackToolCall(event: Omit<ToolCallEvent, 'id' | 'timestamp' | 'serverId'>): void {
    // Apply sampling
    if (Math.random() > this.sampling) {
      return;
    }

    const fullEvent: ToolCallEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      serverId: this.serverId,
    };

    this.addEvent(fullEvent);
  }

  /**
   * Track an error event
   */
  trackError(event: Omit<ErrorEvent, 'id' | 'timestamp' | 'serverId'>): void {
    const fullEvent: ErrorEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      serverId: this.serverId,
    };

    this.addEvent(fullEvent);
  }

  /**
   * Add event to queue and trigger batch if needed
   */
  private addEvent(event: ToolCallEvent | ErrorEvent): void {
    this.eventQueue.push(event);

    if (this.debug) {
      console.error('[Observatory] Event queued:', event);
    }

    // Send immediately if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
      return;
    }

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flush();
      }, this.batchTimeout);
    }
  }

  /**
   * Flush current batch to reporter
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await this.reporter.send(events);

      if (this.debug) {
        console.error(`[Observatory] Flushed ${events.length} events`);
      }
    } catch (error) {
      console.error('[Observatory] Failed to send events:', error);
      // Re-queue events for retry (simple strategy)
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Shutdown and flush remaining events
   */
  async shutdown(): Promise<void> {
    await this.flush();
    await this.reporter.shutdown();
  }

  private generateServerId(): string {
    return `srv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
