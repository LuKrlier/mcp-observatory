import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileDataSource } from './file.js';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileDataSource', () => {
  let tempDir: string;
  let tempFile: string;
  let dataSource: FileDataSource;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(os.tmpdir(), `mcp-server-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    tempFile = path.join(tempDir, 'test-metrics.ndjson');
  });

  afterEach(async () => {
    // Cleanup
    if (dataSource) {
      await dataSource.shutdown();
    }

    // Remove temp directory
    if (existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('File Reading', () => {
    it('should read and parse NDJSON correctly', async () => {
      const events = [
        {
          id: 'evt_1',
          timestamp: Date.now(),
          serverId: 'srv_test',
          toolName: 'get_weather',
          parameters: { city: 'Paris' },
          duration: 145,
          success: true,
        },
        {
          id: 'evt_2',
          timestamp: Date.now(),
          serverId: 'srv_test',
          toolName: 'search_database',
          parameters: { query: 'users' },
          duration: 2340,
          success: true,
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });

      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      expect(metrics.metrics.total_calls).toBe(2);
      expect(metrics.metrics.success_rate).toBe(1.0);
    });

    it('should handle empty file', async () => {
      await fs.writeFile(tempFile, '');

      dataSource = new FileDataSource({ filePath: tempFile });

      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      expect(metrics.metrics.total_calls).toBe(0);
      expect(metrics.metrics.success_rate).toBe(0);
    });

    it('should handle non-existent file', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.ndjson');

      dataSource = new FileDataSource({ filePath: nonExistentFile });

      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Should return empty metrics when file doesn't exist
      expect(metrics.metrics.total_calls).toBe(0);
    });

    it('should skip corrupted NDJSON lines', async () => {
      const content = `{"id":"evt_1","timestamp":${Date.now()},"serverId":"srv_test","toolName":"tool1","duration":100,"success":true}
this is not valid json
{"id":"evt_2","timestamp":${Date.now()},"serverId":"srv_test","toolName":"tool2","duration":200,"success":true}
`;

      await fs.writeFile(tempFile, content);

      dataSource = new FileDataSource({ filePath: tempFile, debug: false });

      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Should have parsed 2 valid events, skipped the corrupted line
      expect(metrics.metrics.total_calls).toBe(2);
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;

      const events = [
        // Server 1, recent
        {
          id: 'evt_1',
          timestamp: now - 1000,
          serverId: 'srv_1',
          toolName: 'tool1',
          duration: 100,
          success: true,
        },
        // Server 1, 1 hour ago
        {
          id: 'evt_2',
          timestamp: oneHourAgo,
          serverId: 'srv_1',
          toolName: 'tool2',
          duration: 200,
          success: true,
        },
        // Server 1, 2 days ago
        {
          id: 'evt_3',
          timestamp: twoDaysAgo,
          serverId: 'srv_1',
          toolName: 'tool3',
          duration: 300,
          success: true,
        },
        // Server 2, recent
        {
          id: 'evt_4',
          timestamp: now - 2000,
          serverId: 'srv_2',
          toolName: 'tool4',
          duration: 400,
          success: true,
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });
    });

    it('should filter by server_id', async () => {
      const metrics1 = await dataSource.getServerMetrics({
        serverId: 'srv_1',
        timeRange: '7d',
      });

      const metrics2 = await dataSource.getServerMetrics({
        serverId: 'srv_2',
        timeRange: '7d',
      });

      expect(metrics1.metrics.total_calls).toBe(3);
      expect(metrics2.metrics.total_calls).toBe(1);
    });

    it('should filter by time range - 1h', async () => {
      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_1',
        timeRange: '1h',
      });

      // Should only include events from the last hour (evt_1)
      // evt_2 is exactly at the 1h boundary and might not be included due to timing
      expect(metrics.metrics.total_calls).toBeGreaterThanOrEqual(1);
      expect(metrics.metrics.total_calls).toBeLessThanOrEqual(2);
    });

    it('should filter by time range - 24h', async () => {
      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_1',
        timeRange: '24h',
      });

      // Should include evt_1 and evt_2, not evt_3 (2 days ago)
      expect(metrics.metrics.total_calls).toBe(2);
    });

    it('should filter by time range - 7d', async () => {
      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_1',
        timeRange: '7d',
      });

      // Should include all 3 events for srv_1
      expect(metrics.metrics.total_calls).toBe(3);
    });
  });

  describe('Metrics Calculation', () => {
    beforeEach(async () => {
      const now = Date.now();
      const events = [
        {
          id: 'evt_1',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'get_weather',
          parameters: {},
          duration: 100,
          success: true,
        },
        {
          id: 'evt_2',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'get_weather',
          parameters: {},
          duration: 200,
          success: true,
        },
        {
          id: 'evt_3',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'get_weather',
          parameters: {},
          duration: 300,
          success: true,
        },
        {
          id: 'evt_4',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'search_db',
          parameters: {},
          duration: 50,
          success: false,
          error: 'Connection failed',
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });
    });

    it('should calculate success rate correctly', async () => {
      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      expect(metrics.metrics.total_calls).toBe(4);
      expect(metrics.metrics.success_rate).toBe(0.75); // 3 out of 4
      expect(metrics.metrics.error_rate).toBe(0.25);
    });

    it('should calculate average duration correctly', async () => {
      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // (100 + 200 + 300 + 50) / 4 = 162.5
      expect(metrics.metrics.avg_duration_ms).toBe(162.5);
    });

    it('should calculate percentiles correctly', async () => {
      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Sorted: [50, 100, 200, 300]
      // P50 = index 2 (0.5 * 4) = 200
      // P95 = index 3 (0.95 * 4 = 3.8, floor = 3) = 300
      // P99 = index 3 (0.99 * 4 = 3.96, floor = 3) = 300
      expect(metrics.metrics.p50_duration_ms).toBe(200); // 50th percentile
      expect(metrics.metrics.p95_duration_ms).toBe(300); // 95th percentile
      expect(metrics.metrics.p99_duration_ms).toBe(300); // 99th percentile
    });

    it('should identify top tools', async () => {
      const metrics = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      expect(metrics.metrics.top_tools).toHaveLength(2);
      expect(metrics.metrics.top_tools[0].name).toBe('get_weather');
      expect(metrics.metrics.top_tools[0].calls).toBe(3);
      expect(metrics.metrics.top_tools[1].name).toBe('search_db');
      expect(metrics.metrics.top_tools[1].calls).toBe(1);
    });
  });

  describe('Tool Stats', () => {
    beforeEach(async () => {
      const now = Date.now();
      const events = [
        {
          id: 'evt_1',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'get_weather',
          parameters: {},
          duration: 100,
          success: true,
        },
        {
          id: 'evt_2',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'get_weather',
          parameters: {},
          duration: 200,
          success: true,
        },
        {
          id: 'evt_3',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'get_weather',
          parameters: {},
          duration: 150,
          success: false,
          error: 'API error',
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });
    });

    it('should get stats for specific tool', async () => {
      const stats = await dataSource.getToolStats({
        serverId: 'srv_test',
        toolName: 'get_weather',
        timeRange: '1h',
      });

      expect(stats.tool_name).toBe('get_weather');
      expect(stats.stats.total_calls).toBe(3);
      expect(stats.stats.success_count).toBe(2);
      expect(stats.stats.error_count).toBe(1);
      expect(stats.stats.avg_duration_ms).toBe(150); // (100 + 200 + 150) / 3
    });

    it('should return zero stats for non-existent tool', async () => {
      const stats = await dataSource.getToolStats({
        serverId: 'srv_test',
        toolName: 'non_existent_tool',
        timeRange: '1h',
      });

      expect(stats.tool_name).toBe('non_existent_tool');
      expect(stats.stats.total_calls).toBe(0);
      expect(stats.stats.success_count).toBe(0);
      expect(stats.stats.error_count).toBe(0);
      expect(stats.stats.avg_duration_ms).toBe(0);
    });
  });

  describe('Error Logs', () => {
    beforeEach(async () => {
      const now = Date.now();
      const events = [
        {
          id: 'evt_1',
          timestamp: now,
          serverId: 'srv_test',
          errorType: 'ValidationError',
          message: 'Invalid input',
          stack: 'Error: Invalid input...',
        },
        {
          id: 'evt_2',
          timestamp: now - 1000,
          serverId: 'srv_test',
          errorType: 'TimeoutError',
          message: 'Request timeout',
          stack: 'Error: Request timeout...',
        },
        {
          id: 'evt_3',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'tool1',
          duration: 100,
          success: true,
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });
    });

    it('should get error logs', async () => {
      const result = await dataSource.getErrorLogs({
        serverId: 'srv_test',
        limit: 10,
      });

      expect(result.errors).toHaveLength(2);
      expect(result.total_count).toBe(2);
      expect(result.errors[0].error_type).toBe('ValidationError');
      expect(result.errors[1].error_type).toBe('TimeoutError');
    });

    it('should respect limit parameter', async () => {
      const result = await dataSource.getErrorLogs({
        serverId: 'srv_test',
        limit: 1,
      });

      expect(result.errors).toHaveLength(1);
      expect(result.total_count).toBe(2);
    });

    it('should return empty array when no errors', async () => {
      const eventsNoErrors = [
        {
          id: 'evt_1',
          timestamp: Date.now(),
          serverId: 'srv_test',
          toolName: 'tool1',
          duration: 100,
          success: true,
        },
      ];

      const ndjson = eventsNoErrors.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });

      const result = await dataSource.getErrorLogs({
        serverId: 'srv_test',
        limit: 10,
      });

      expect(result.errors).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });
  });

  describe('Cost Estimation', () => {
    beforeEach(async () => {
      const now = Date.now();
      const events = Array.from({ length: 100 }, (_, i) => ({
        id: `evt_${i}`,
        timestamp: now,
        serverId: 'srv_test',
        toolName: 'tool1',
        duration: 100,
        success: true,
      }));

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });
    });

    it('should estimate costs correctly', async () => {
      const result = await dataSource.getCostEstimate({
        serverId: 'srv_test',
        timeRange: '24h',
      });

      expect(result.breakdown.total_calls).toBe(100);
      expect(result.estimated_cost_usd).toBe(0.1); // 100 * 0.001
      expect(result.breakdown.cost_per_call).toBe(0.001);
    });
  });

  describe('Performance Analysis', () => {
    beforeEach(async () => {
      const now = Date.now();
      const events = [
        // Fast tool
        {
          id: 'evt_1',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'fast_tool',
          duration: 50,
          success: true,
        },
        // Slow tool
        {
          id: 'evt_2',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'slow_tool',
          duration: 3000,
          success: true,
        },
        // Failed tool
        {
          id: 'evt_3',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'error_tool',
          duration: 100,
          success: false,
          error: 'Failed',
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });
    });

    it('should analyze performance and identify slow tools', async () => {
      const result = await dataSource.analyzePerformance({
        serverId: 'srv_test',
        timeRange: '24h',
      });

      expect(result.insights).toBeDefined();
      expect(result.health_score).toBeGreaterThan(0);
      expect(result.health_score).toBeLessThanOrEqual(1);

      // Should identify slow_tool as slow
      const slowToolInsight = result.insights.find(
        (i) => i.type === 'slow_tool' && i.tool_name === 'slow_tool'
      );
      expect(slowToolInsight).toBeDefined();
    });

    it('should identify high error rates', async () => {
      const now = Date.now();
      const events = [
        {
          id: 'evt_1',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'error_tool',
          duration: 100,
          success: false,
          error: 'Failed',
        },
        {
          id: 'evt_2',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'error_tool',
          duration: 100,
          success: false,
          error: 'Failed',
        },
        {
          id: 'evt_3',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'ok_tool',
          duration: 100,
          success: true,
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });

      const result = await dataSource.analyzePerformance({
        serverId: 'srv_test',
        timeRange: '24h',
      });

      // Should identify high error rate
      const errorInsight = result.insights.find((i) => i.type === 'error_spike');
      expect(errorInsight).toBeDefined();
    });
  });

  describe('Cache', () => {
    beforeEach(async () => {
      const now = Date.now();
      const events = [
        {
          id: 'evt_1',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'tool1',
          duration: 100,
          success: true,
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });
    });

    it('should use cache for subsequent reads within TTL when file unchanged', async () => {
      // First call - loads from file
      const metrics1 = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Second call immediately WITHOUT modifying file - should use cache
      const metrics2 = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Should still be 1 because cache is used and file unchanged
      expect(metrics1.metrics.total_calls).toBe(1);
      expect(metrics2.metrics.total_calls).toBe(1);
    });

    it('should reload after cache TTL expires', async () => {
      // First call
      const metrics1 = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      expect(metrics1.metrics.total_calls).toBe(1);

      // Add new event
      const newEvent = {
        id: 'evt_2',
        timestamp: Date.now(),
        serverId: 'srv_test',
        toolName: 'tool2',
        duration: 200,
        success: true,
      };
      await fs.appendFile(tempFile, JSON.stringify(newEvent) + '\n');

      // Wait for cache to expire (5 seconds + buffer)
      await new Promise((resolve) => setTimeout(resolve, 5500));

      // Should reload from file
      const metrics2 = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      expect(metrics2.metrics.total_calls).toBe(2);
    }, 10000); // 10 second timeout
  });

  describe('File Modification Detection', () => {
    beforeEach(async () => {
      const now = Date.now();
      const events = [
        {
          id: 'evt_1',
          timestamp: now,
          serverId: 'srv_test',
          toolName: 'tool1',
          duration: 100,
          success: true,
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile, debug: true });
    });

    it('should invalidate cache when file is modified', async () => {
      // First call - loads from file
      const metrics1 = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      expect(metrics1.metrics.total_calls).toBe(1);

      // Wait a bit to ensure mtime changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify file by adding new event
      const newEvent = {
        id: 'evt_2',
        timestamp: Date.now(),
        serverId: 'srv_test',
        toolName: 'tool2',
        duration: 200,
        success: true,
      };
      await fs.appendFile(tempFile, JSON.stringify(newEvent) + '\n');

      // Second call IMMEDIATELY (within cache TTL)
      // Should detect file modification and reload
      const metrics2 = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Should be 2 because file was modified and cache invalidated
      expect(metrics2.metrics.total_calls).toBe(2);
    });

    it('should use cache when file has NOT been modified', async () => {
      // First call
      const metrics1 = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      expect(metrics1.metrics.total_calls).toBe(1);

      // Second call immediately without modifying file
      // Should use cache
      const metrics2 = await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Should still be 1 (cache used)
      expect(metrics2.metrics.total_calls).toBe(1);
    });

    it('should reload data after file modification even with valid cache', async () => {
      // First call
      await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Wait to ensure mtime changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify file multiple times
      for (let i = 2; i <= 5; i++) {
        const newEvent = {
          id: `evt_${i}`,
          timestamp: Date.now(),
          serverId: 'srv_test',
          toolName: `tool${i}`,
          duration: i * 100,
          success: true,
        };
        await fs.appendFile(tempFile, JSON.stringify(newEvent) + '\n');

        // Wait for mtime to update
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check that data is reloaded
        const metrics = await dataSource.getServerMetrics({
          serverId: 'srv_test',
          timeRange: '1h',
        });

        expect(metrics.metrics.total_calls).toBe(i);
      }
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      const events = [
        {
          id: 'evt_1',
          timestamp: Date.now(),
          serverId: 'srv_test',
          toolName: 'tool1',
          duration: 100,
          success: true,
        },
      ];

      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(tempFile, ndjson);

      dataSource = new FileDataSource({ filePath: tempFile });

      await dataSource.getServerMetrics({
        serverId: 'srv_test',
        timeRange: '1h',
      });

      // Should not throw
      await expect(dataSource.shutdown()).resolves.not.toThrow();
    });
  });
});
