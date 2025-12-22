import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileReporter } from './file.js';
import type { ToolCallEvent, ErrorEvent } from '../types.js';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileReporter', () => {
  let tempDir: string;
  let tempFile: string;
  let reporter: FileReporter;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(os.tmpdir(), `mcp-observatory-test-${Date.now()}`);
    tempFile = path.join(tempDir, 'test-metrics.ndjson');
  });

  afterEach(async () => {
    // Cleanup
    if (reporter) {
      await reporter.shutdown();
    }

    // Remove temp directory
    if (existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('File Creation', () => {
    it('should create directory if it does not exist', async () => {
      reporter = new FileReporter({ filePath: tempFile });

      const event: ToolCallEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool',
        parameters: {},
        duration: 100,
        success: true,
      };

      await reporter.send([event]);

      expect(existsSync(tempDir)).toBe(true);
      expect(existsSync(tempFile)).toBe(true);
    });

    it('should create file if it does not exist', async () => {
      // Create directory manually
      await fs.mkdir(tempDir, { recursive: true });

      reporter = new FileReporter({ filePath: tempFile });

      const event: ToolCallEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool',
        parameters: {},
        duration: 100,
        success: true,
      };

      await reporter.send([event]);

      expect(existsSync(tempFile)).toBe(true);
    });
  });

  describe('NDJSON Format', () => {
    it('should write events in valid NDJSON format', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      reporter = new FileReporter({ filePath: tempFile });

      const event1: ToolCallEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool',
        parameters: { param: 'value' },
        duration: 100,
        success: true,
      };

      const event2: ErrorEvent = {
        id: 'evt_2',
        timestamp: Date.now(),
        serverId: 'srv_1',
        errorType: 'TestError',
        message: 'Test error',
      };

      await reporter.send([event1, event2]);

      const content = await fs.readFile(tempFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);

      // Each line should be valid JSON
      const parsed1 = JSON.parse(lines[0]);
      const parsed2 = JSON.parse(lines[1]);

      expect(parsed1.id).toBe('evt_1');
      expect(parsed1.toolName).toBe('test_tool');
      expect(parsed2.id).toBe('evt_2');
      expect(parsed2.errorType).toBe('TestError');
    });

    it('should append to existing file', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      reporter = new FileReporter({ filePath: tempFile });

      const event1: ToolCallEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool',
        parameters: {},
        duration: 100,
        success: true,
      };

      await reporter.send([event1]);

      const event2: ToolCallEvent = {
        id: 'evt_2',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool2',
        parameters: {},
        duration: 200,
        success: true,
      };

      await reporter.send([event2]);

      const content = await fs.readFile(tempFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]).id).toBe('evt_1');
      expect(JSON.parse(lines[1]).id).toBe('evt_2');
    });
  });

  describe('Batch Operations', () => {
    it('should write multiple events in a single batch', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      reporter = new FileReporter({ filePath: tempFile });

      const events: ToolCallEvent[] = [
        {
          id: 'evt_1',
          timestamp: Date.now(),
          serverId: 'srv_1',
          toolName: 'tool1',
          parameters: {},
          duration: 100,
          success: true,
        },
        {
          id: 'evt_2',
          timestamp: Date.now(),
          serverId: 'srv_1',
          toolName: 'tool2',
          parameters: {},
          duration: 200,
          success: true,
        },
        {
          id: 'evt_3',
          timestamp: Date.now(),
          serverId: 'srv_1',
          toolName: 'tool3',
          parameters: {},
          duration: 300,
          success: true,
        },
      ];

      await reporter.send(events);

      const content = await fs.readFile(tempFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
    });
  });

  describe('Flush', () => {
    it('should successfully flush (no-op for file reporter)', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      reporter = new FileReporter({ filePath: tempFile });

      const event: ToolCallEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool',
        parameters: {},
        duration: 100,
        success: true,
      };

      await reporter.send([event]);
      await reporter.flush();

      // Should not throw and file should still exist
      expect(existsSync(tempFile)).toBe(true);
    });
  });

  describe('Shutdown', () => {
    it('should successfully shutdown', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      reporter = new FileReporter({ filePath: tempFile });

      const event: ToolCallEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool',
        parameters: {},
        duration: 100,
        success: true,
      };

      await reporter.send([event]);
      await reporter.shutdown();

      // Should not throw and file should still exist
      expect(existsSync(tempFile)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle permission errors gracefully', async () => {
      // This test is OS-specific and may not work on all systems
      // We'll test by trying to write to a read-only location

      // Create directory and file
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(tempFile, '');

      // Make file read-only
      try {
        await fs.chmod(tempFile, 0o444);
      } catch (_err) {
        // Skip test if chmod not supported
        return;
      }

      reporter = new FileReporter({ filePath: tempFile });

      const event: ToolCallEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool',
        parameters: {},
        duration: 100,
        success: true,
      };

      // Should throw due to permission error
      await expect(reporter.send([event])).rejects.toThrow();

      // Restore permissions for cleanup
      await fs.chmod(tempFile, 0o644);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty event arrays', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      reporter = new FileReporter({ filePath: tempFile });

      await reporter.send([]);

      // File should not be created for empty array
      expect(existsSync(tempFile)).toBe(false);
    });

    it('should handle events with complex parameters', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      reporter = new FileReporter({ filePath: tempFile });

      const event: ToolCallEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        toolName: 'test_tool',
        parameters: {
          nested: {
            deep: {
              value: 'test',
              array: [1, 2, 3],
            },
          },
          special: 'chars: "quotes" and \\backslashes\\',
        },
        duration: 100,
        success: true,
      };

      await reporter.send([event]);

      const content = await fs.readFile(tempFile, 'utf-8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.parameters.nested.deep.value).toBe('test');
      expect(parsed.parameters.nested.deep.array).toEqual([1, 2, 3]);
      expect(parsed.parameters.special).toContain('quotes');
    });

    it('should handle events with metadata', async () => {
      await fs.mkdir(tempDir, { recursive: true });
      reporter = new FileReporter({ filePath: tempFile });

      const event: ErrorEvent = {
        id: 'evt_1',
        timestamp: Date.now(),
        serverId: 'srv_1',
        errorType: 'TestError',
        message: 'Test error',
        stack: 'Error: Test error\n    at test.ts:10',
        metadata: {
          userId: '123',
          requestId: 'req_456',
        },
      };

      await reporter.send([event]);

      const content = await fs.readFile(tempFile, 'utf-8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.metadata.userId).toBe('123');
      expect(parsed.metadata.requestId).toBe('req_456');
    });
  });
});
