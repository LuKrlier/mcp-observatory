# @lukrlier/mcp-observatory-server

> MCP Server for conversational monitoring - Query metrics via natural language with Claude

## Features

- 🔍 **Real-time Metrics** - Query performance metrics for instrumented MCP servers
- 📊 **Tool Statistics** - Detailed stats for individual tools
- 🐛 **Error Tracking** - Browse and analyze error logs
- 💰 **Cost Estimation** - Calculate API usage costs
- 🤖 **AI Analysis** - Get intelligent performance recommendations
- 🔌 **Plugin Architecture** - File, PostgreSQL, or Cloud data sources

## Installation

### Install globally

```bash
npm install -g @lukrlier/mcp-observatory-server
```

### Install from source

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

## Quick Start

### 1. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

**File DataSource (Standalone)**:

```json
{
  "mcpServers": {
    "mcp-observatory": {
      "command": "mcp-observatory-server",
      "args": ["--file", "/path/to/metrics.ndjson"]
    }
  }
}
```

**From source**:

```json
{
  "mcpServers": {
    "mcp-observatory": {
      "command": "node",
      "args": [
        "/path/to/mcp-observatory/packages/mcp-server/dist/index.js",
        "--file",
        "/path/to/metrics.ndjson"
      ]
    }
  }
}
```

### 2. Ask Claude

Restart Claude Desktop and ask:

- "What are the metrics for my MCP server?"
- "Show me slow tools in the last hour"
- "Are there any errors I should know about?"

## Data Sources

### File DataSource (Recommended)

Reads metrics from local NDJSON file. Perfect for standalone monitoring.

```bash
mcp-observatory-server --file ./metrics.ndjson --debug
```

**Configuration**:

```json
{
  "command": "mcp-observatory-server",
  "args": ["--file", "/path/to/metrics.ndjson", "--debug"]
}
```

**Use Cases:**

- Local development
- Self-hosted monitoring
- No external dependencies
- 95% of use cases

### PostgreSQL DataSource (coming soon)

Reads metrics from PostgreSQL database. For production deployments.

```bash
mcp-observatory-server --postgres "postgresql://localhost:5432/mcp"
```

**Configuration**:

```json
{
  "command": "mcp-observatory-server",
  "args": ["--postgres", "postgresql://user:pass@host:5432/db"]
}
```

**Use Cases:**

- Production environments
- Multi-server monitoring
- Long-term storage
- Advanced queries

**Status:** Coming soon

### Cloud DataSource (coming soon)

Connects to hosted MCP Observatory service.

```bash
mcp-observatory-server --cloud sk_xxx
```

**Configuration**:

```json
{
  "command": "mcp-observatory-server",
  "args": ["--cloud", "sk_your_api_key"]
}
```

**Use Cases:**

- Team collaboration
- Centralized dashboard
- Multi-server monitoring
- Optional hosted service

**Status:** Coming soon

## CLI Arguments

| Argument           | Description            | Example                       |
| ------------------ | ---------------------- | ----------------------------- |
| `--file <path>`    | File data source       | `--file ./metrics.ndjson`     |
| `--postgres <url>` | PostgreSQL data source | `--postgres postgresql://...` |
| `--cloud <key>`    | Cloud data source      | `--cloud sk_xxx`              |
| `--debug`          | Enable debug logging   | `--debug`                     |

**Priority**: `--file` > `--postgres` > `--cloud` > environment variables

## Available Tools

### 1. `get_server_metrics`

Get real-time performance metrics for an MCP server.

**Parameters:**

- `server_id` (required): MCP server identifier
- `time_range` (optional): `5m`, `1h`, `24h`, `7d`, `30d` (default: `1h`)

**Returns:**

```json
{
  "serverId": "srv_xxx",
  "timeRange": "1h",
  "totalCalls": 1543,
  "successRate": 0.987,
  "avgDuration": 145,
  "p50": 120,
  "p95": 280,
  "p99": 450,
  "errorRate": 0.013,
  "topTools": [
    {
      "toolName": "get_weather",
      "calls": 456,
      "avgDuration": 123
    }
  ]
}
```

**Example:**

```
"Show me the performance metrics for my server in the last 24 hours"
```

### 2. `get_tool_stats`

Get detailed statistics for a specific tool.

**Parameters:**

- `server_id` (required): MCP server identifier
- `tool_name` (required): Name of the tool to analyze
- `time_range` (optional): Time range (default: `1h`)

**Returns:**

```json
{
  "serverId": "srv_xxx",
  "toolName": "get_weather",
  "timeRange": "24h",
  "totalCalls": 456,
  "successCount": 448,
  "errorCount": 8,
  "avgDuration": 123,
  "p50": 110,
  "p95": 245,
  "p99": 389
}
```

**Example:**

```
"What are the statistics for the get_weather tool?"
```

### 3. `get_error_logs`

Retrieve recent error logs for debugging.

**Parameters:**

- `server_id` (required): MCP server identifier
- `limit` (optional): Maximum errors to return (default: 50, max: 100)

**Returns:**

```json
{
  "serverId": "srv_xxx",
  "errors": [
    {
      "id": "evt_xxx",
      "timestamp": 1766162308300,
      "errorType": "ValidationError",
      "message": "Invalid city parameter",
      "stack": "Error: Invalid city parameter..."
    }
  ],
  "total": 23
}
```

**Example:**

```
"Show me the recent errors from my server"
```

### 4. `get_cost_estimate`

Calculate estimated API costs for a server.

**Parameters:**

- `server_id` (required): MCP server identifier
- `time_range` (optional): Time range (default: `24h`)

**Returns:**

```json
{
  "serverId": "srv_xxx",
  "timeRange": "24h",
  "totalCalls": 1543,
  "estimatedCost": 0.0154,
  "costPerCall": 0.00001
}
```

**Example:**

```
"What are the estimated costs for my server this week?"
```

### 5. `analyze_performance`

AI-powered performance analysis with actionable recommendations.

**Parameters:**

- `server_id` (required): MCP server identifier
- `time_range` (optional): Time range (default: `24h`)

**Returns:**

```json
{
  "serverId": "srv_xxx",
  "timeRange": "24h",
  "insights": [
    {
      "type": "slow_tool",
      "severity": "high",
      "toolName": "search_web",
      "message": "Tool is significantly slower than average",
      "avgDuration": 567,
      "recommendation": "Consider optimizing or implementing caching"
    }
  ],
  "healthScore": 0.85
}
```

**Example:**

```
"Analyze the performance of my server and give me recommendations"
```

## Development

### Build

```bash
pnpm build
```

### Watch mode

```bash
pnpm dev
```

### Run locally

```bash
node dist/index.js --file ./metrics.ndjson --debug
```

### Testing

```bash
pnpm test
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Your MCP Server                                                │
│  ├─ Instrumented with @lukrlier/mcp-observatory-sdk             │
│  └─ Events → FileReporter → metrics.ndjson                     │
│                                                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  MCP Observatory Server (this package)                          │
│  ├─ FileDataSource reads metrics.ndjson                        │
│  └─ Exposes 5 MCP tools for querying metrics                   │
│                                                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Claude Desktop                                                 │
│  ├─ User asks: "What are my server metrics?"                   │
│  ├─ Claude calls get_server_metrics tool                       │
│  └─ Claude responds with natural language insights             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Examples

See [examples/basic-file-reporter](../../examples/basic-file-reporter) for a complete working example.

## Advanced Usage

### Custom DataSource

```typescript
import { DataSource, ObservatoryServer } from '@lukrlier/mcp-observatory-server';

class CustomDataSource implements DataSource {
  async getServerMetrics(params: MetricsQueryParams): Promise<ServerMetrics> {
    // Custom implementation
  }

  async getToolStats(params: ToolStatsQueryParams): Promise<ToolStats> {
    // Custom implementation
  }

  // ... other methods
}

const dataSource = new CustomDataSource();
const server = new ObservatoryServer({ dataSourceConfig: {...} }, dataSource);
```

## Troubleshooting

### Server not showing up in Claude Desktop

1. Check `claude_desktop_config.json` syntax
2. Verify absolute paths are correct
3. Restart Claude Desktop completely
4. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

### File not found errors

1. Verify file path is absolute, not relative
2. Check file permissions
3. Ensure SDK has created the file first
4. Enable debug mode: `--debug`

### No metrics returned

1. Verify `server_id` matches SDK configuration
2. Check time range is valid
3. Ensure events have been written to file
4. Check file contains valid NDJSON

### Tool errors

1. Enable debug mode: `--debug`
2. Check Claude Desktop developer tools
3. Verify data source is accessible
4. Check file format is valid NDJSON

## TypeScript Support

Full TypeScript support with type definitions included.

```typescript
import type {
  DataSource,
  ObservatoryServer,
  ServerMetrics,
  ToolStats,
  ErrorLogsResponse,
} from '@lukrlier/mcp-observatory-server';
```

## License

MIT
