/**
 * Basic File Reporter Example
 *
 * This example demonstrates the complete flow:
 * 1. SDK collects metrics with FileReporter
 * 2. Events are written to NDJSON file
 * 3. MCP Server reads the file with FileDataSource
 * 4. Claude can query metrics via MCP tools
 */

import { createObservatory } from '@lukrlier/mcp-observatory-sdk';
import { setTimeout as sleep } from 'timers/promises';

async function main() {
  console.log('🚀 Starting MCP Observatory Basic Example\n');

  // Step 1: Create Observatory with FileReporter
  const observatory = createObservatory({
    reporter: 'file',
    filePath: './metrics.ndjson',
    batchSize: 5,
    batchTimeout: 2000,
    debug: true,
  });

  console.log('✅ Observatory initialized with FileReporter\n');

  // Step 2: Simulate some tool calls
  console.log('📊 Simulating tool calls...\n');

  // Successful tool calls
  observatory.trackToolCall({
    toolName: 'get_weather',
    parameters: { city: 'Paris' },
    duration: 145,
    success: true,
  });

  observatory.trackToolCall({
    toolName: 'search_database',
    parameters: { query: 'users' },
    duration: 2340,
    success: true,
  });

  observatory.trackToolCall({
    toolName: 'get_weather',
    parameters: { city: 'London' },
    duration: 120,
    success: true,
  });

  // Failed tool call
  observatory.trackToolCall({
    toolName: 'send_email',
    parameters: { to: 'invalid' },
    duration: 50,
    success: false,
    error: 'Invalid email address',
  });

  // More successful calls
  observatory.trackToolCall({
    toolName: 'search_database',
    parameters: { query: 'products' },
    duration: 1850,
    success: true,
  });

  observatory.trackToolCall({
    toolName: 'get_weather',
    parameters: { city: 'New York' },
    duration: 180,
    success: true,
  });

  // Track some errors
  observatory.trackError({
    errorType: 'ValidationError',
    message: 'Invalid city parameter',
    stack: 'Error: Invalid city parameter\n    at validateCity (weather.ts:15)',
    metadata: { toolName: 'get_weather' },
  });

  observatory.trackError({
    errorType: 'TimeoutError',
    message: 'Database query timeout',
    stack: 'Error: Database query timeout\n    at query (db.ts:42)',
    metadata: { toolName: 'search_database' },
  });

  console.log('✅ Tracked 6 tool calls and 2 errors\n');

  // Step 3: Wait a bit and flush
  console.log('⏳ Waiting for batch to flush...\n');
  await sleep(3000);

  // Step 4: Flush and shutdown
  await observatory.flush();
  await observatory.shutdown();

  console.log('✅ All events written to metrics.ndjson\n');
  console.log('📁 File location: ./examples/basic-file-reporter/metrics.ndjson\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔍 Next steps:\n');
  console.log('1. Inspect the NDJSON file:');
  console.log('   cat examples/basic-file-reporter/metrics.ndjson\n');
  console.log('2. Start the MCP Server:');
  console.log('   cd packages/mcp-server');
  console.log(
    '   node dist/index.js --file ../../examples/basic-file-reporter/metrics.ndjson --debug\n'
  );
  console.log('3. Configure Claude Desktop to use the MCP Server');
  console.log('4. Ask Claude: "What are the metrics for my server?"\n');
}

main().catch(console.error);
