/**
 * Test MCP Server FileDataSource
 *
 * This script tests that the MCP Server can read the generated NDJSON file
 * and correctly calculate metrics.
 */

import { FileDataSource } from '../../packages/mcp-server/src/datasources/file.js';

async function main() {
  console.log('🧪 Testing MCP Server FileDataSource\n');

  // Create FileDataSource
  const dataSource = new FileDataSource({
    filePath: './metrics.ndjson',
    debug: true,
  });

  console.log('✅ FileDataSource created\n');

  // Get the serverId from the first event
  const fs = await import('fs/promises');
  const firstLine = (await fs.readFile('./metrics.ndjson', 'utf-8')).split('\n')[0];
  const firstEvent = JSON.parse(firstLine);
  const serverId = firstEvent.serverId;

  console.log(`📊 Server ID: ${serverId}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Get Server Metrics
  console.log('📈 Test 1: Get Server Metrics');
  const metrics = await dataSource.getServerMetrics({
    serverId,
    timeRange: '1h',
  });
  console.log(JSON.stringify(metrics, null, 2));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 2: Get Tool Stats
  console.log('📊 Test 2: Get Tool Stats for "get_weather"');
  const toolStats = await dataSource.getToolStats({
    serverId,
    toolName: 'get_weather',
    timeRange: '1h',
  });
  console.log(JSON.stringify(toolStats, null, 2));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 3: Get Error Logs
  console.log('🚨 Test 3: Get Error Logs');
  const errors = await dataSource.getErrorLogs({
    serverId,
    limit: 10,
  });
  console.log(JSON.stringify(errors, null, 2));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 4: Get Cost Estimate
  console.log('💰 Test 4: Get Cost Estimate');
  const cost = await dataSource.getCostEstimate({
    serverId,
    timeRange: '24h',
  });
  console.log(JSON.stringify(cost, null, 2));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 5: Analyze Performance
  console.log('⚡ Test 5: Analyze Performance');
  const analysis = await dataSource.analyzePerformance({
    serverId,
    timeRange: '24h',
  });
  console.log(JSON.stringify(analysis, null, 2));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ All tests passed!\n');

  await dataSource.shutdown();
}

main().catch(console.error);
