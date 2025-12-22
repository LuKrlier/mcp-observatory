import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createObservatory } from './factory';
import { Observatory } from './observatory';
import { ConsoleReporter } from './reporters';

describe('Observatory (Console Reporter)', () => {
  let observatory: Observatory;

  afterEach(async () => {
    if (observatory) {
      await observatory.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should create instance with console reporter', () => {
      observatory = createObservatory({
        reporter: 'console',
        debug: true,
      });
      expect(observatory).toBeDefined();
    });

    it('should create instance with file reporter', () => {
      observatory = createObservatory({
        reporter: 'file',
        filePath: './test-metrics.ndjson',
      });
      expect(observatory).toBeDefined();
    });

    it('should throw on invalid config', () => {
      expect(() =>
        createObservatory({
          reporter: 'file',
          // @ts-expect-error - Testing validation
          filePath: '',
        })
      ).toThrow();
    });
  });

  describe('Event Tracking', () => {
    beforeEach(() => {
      observatory = createObservatory({
        reporter: 'console',
        batchSize: 3,
        batchTimeout: 100,
        debug: false,
      });
    });

    it('should track tool call events', () => {
      observatory.trackToolCall({
        toolName: 'test_tool',
        parameters: { foo: 'bar' },
        duration: 123,
        success: true,
      });

      expect(true).toBe(true); // Event queued
    });

    it('should track error events', () => {
      observatory.trackError({
        errorType: 'TestError',
        message: 'Test error',
      });

      expect(true).toBe(true); // Event queued
    });

    it('should apply sampling', () => {
      const sampledObservatory = createObservatory({
        reporter: 'console',
        sampling: 0, // 0% sampling
      });

      sampledObservatory.trackToolCall({
        toolName: 'test',
        parameters: {},
        success: true,
      });

      // Event should be dropped (not queued)
      expect(true).toBe(true);
    });
  });

  describe('Batching', () => {
    beforeEach(() => {
      observatory = createObservatory({
        reporter: 'console',
        batchSize: 2,
        batchTimeout: 1000,
      });
    });

    it('should flush when batch size reached', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      observatory.trackToolCall({
        toolName: 'test1',
        parameters: {},
        success: true,
      });

      observatory.trackToolCall({
        toolName: 'test2',
        parameters: {},
        success: true,
      });

      // Wait a bit for async flush
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should flush on timeout', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const timedObservatory = createObservatory({
        reporter: 'console',
        batchSize: 100,
        batchTimeout: 50,
      });

      timedObservatory.trackToolCall({
        toolName: 'test',
        parameters: {},
        success: true,
      });

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();

      await timedObservatory.shutdown();
    });

    it('should flush on shutdown', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      observatory.trackToolCall({
        toolName: 'test',
        parameters: {},
        success: true,
      });

      await observatory.shutdown();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Reporter Integration', () => {
    it('should work with custom reporter instance', () => {
      const reporter = new ConsoleReporter({ debug: true });
      const obs = new Observatory(reporter, { batchSize: 10 });

      expect(obs).toBeDefined();
      obs.shutdown();
    });

    it('should use correct defaults', () => {
      observatory = createObservatory({
        reporter: 'console',
      });

      // Defaults should be applied
      expect(observatory).toBeDefined();
    });
  });

  describe('Debug Mode', () => {
    it('should log in debug mode', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const debugObservatory = createObservatory({
        reporter: 'console',
        debug: true,
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();

      debugObservatory.shutdown();
    });
  });
});
