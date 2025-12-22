# Basic File Reporter Example

This example demonstrates the complete standalone flow of MCP Observatory:

```
SDK (FileReporter) → metrics.ndjson → MCP Server (FileDataSource) → Claude
```

## Prerequisites

- Node.js ≥20.0.0
- pnpm ≥9.0.0
- Claude Desktop (for MCP Server integration)

## Step 1: Run the Example

Generate sample metrics with the SDK:

```bash
# From project root
pnpm install

# Run the example
cd examples/basic-file-reporter
pnpm start
```

This will:

- Create an Observatory instance with FileReporter
- Track 6 tool calls (mix of success and failures)
- Track 2 errors
- Write all events to `metrics.ndjson`

## Step 2: Inspect the Generated File

```bash
# View the NDJSON file
cat metrics.ndjson

# Pretty print with jq
cat metrics.ndjson | jq .

# Count events
wc -l metrics.ndjson
```

Example output:

```json
{"id":"evt_1234","timestamp":1702989123456,"serverId":"srv_abc","toolName":"get_weather","parameters":{"city":"Paris"},"duration":145,"success":true}
{"id":"evt_1235","timestamp":1702989125796,"serverId":"srv_abc","toolName":"search_database","parameters":{"query":"users"},"duration":2340,"success":true}
```

## Step 3: Start the MCP Server

```bash
# From project root
cd packages/mcp-server

# Build the server (if not already done)
pnpm build

# Start with file data source
node dist/index.js --file ../../examples/basic-file-reporter/metrics.ndjson --debug
```

The server is now running and waiting for MCP requests via stdio.

## Step 4: Configure Claude Desktop

Add the MCP server to your Claude Desktop configuration:

**macOS/Linux**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-observatory": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-observatory/packages/mcp-server/dist/index.js",
        "--file",
        "/absolute/path/to/mcp-observatory/examples/basic-file-reporter/metrics.ndjson"
      ]
    }
  }
}
```

**Important**: Replace `/absolute/path/to/` with your actual project path.

## Step 5: Query Metrics with Claude

Restart Claude Desktop and ask:

**Example questions**:

1. "What are the metrics for my MCP server?"
2. "Show me the statistics for the get_weather tool"
3. "Are there any errors in my server?"
4. "Analyze the performance of my server"
5. "What's the estimated cost?"

**Example conversation**:

```
You: What are the metrics for my server?

Claude: Let me check your MCP Observatory metrics.
[Uses get_server_metrics tool]

Here's what I found:
- Total calls: 6
- Success rate: 83.3%
- Average duration: 947ms
- P95 duration: 2340ms
- Error rate: 16.7%

Top tools:
1. get_weather - 3 calls, avg 148ms
2. search_database - 2 calls, avg 2095ms
3. send_email - 1 call (failed)

You have a relatively high error rate. Let me check the error logs...
```

## Step 6: Add More Data

Keep the MCP Server running and generate more events:

```bash
# In another terminal
cd examples/basic-file-reporter
pnpm start
```

The new events will be appended to `metrics.ndjson` and Claude can query the updated data immediately (with a 5-second cache).

## Cleanup

```bash
# Remove generated metrics
rm metrics.ndjson
```

## What's Next?

- Try the **Console Reporter** example for real-time debugging
- Explore **PostgreSQL DataSource** for production deployments
- Learn about **Cloud Reporter** for hosted dashboard

## Troubleshooting

### "File not found" error

- Make sure you're using absolute paths in Claude Desktop config
- Check that `metrics.ndjson` exists in the example directory

### "No events" in metrics

- Run the example script first: `pnpm start`
- Check that the file is not empty: `cat metrics.ndjson`

### MCP Server not responding

- Check that the server is running: `ps aux | grep "mcp-observatory"`
- Verify the path in Claude Desktop config is correct
- Restart Claude Desktop after config changes
