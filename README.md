# MCP Observatory

[![CI](https://github.com/LuKrlier/mcp-observatory/actions/workflows/test.yml/badge.svg)](https://github.com/LuKrlier/mcp-observatory/actions/workflows/test.yml)
[![MCP Server](https://img.shields.io/badge/MCP-Server-blue?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTIgMkw0IDYuNVYxNy41TDEyIDIyTDIwIDE3LjVWNi41TDEyIDJaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K)](https://modelcontextprotocol.io/)
[![npm SDK](https://img.shields.io/npm/v/@lukrlier/mcp-observatory-sdk?label=SDK&color=blue)](https://www.npmjs.com/package/@lukrlier/mcp-observatory-sdk)
[![npm MCP Server](https://img.shields.io/npm/v/@lukrlier/mcp-observatory-server?label=MCP%20Server&color=blue)](https://www.npmjs.com/package/@lukrlier/mcp-observatory-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.x-orange?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen?logo=node.js&logoColor=white)](https://nodejs.org/)

> The New Relic for MCP Servers - **Now Open Source!**

Real-time observability, monitoring, and cost tracking platform for Model Context Protocol servers with **conversational monitoring** via Claude.

## 🎯 Vision

Monitor your MCP servers by simply asking Claude:

- _"Is my server healthy?"_
- _"Which tools are running slow?"_
- _"Show me the recent errors"_

Claude uses the MCP Observatory tools to answer in natural language with actionable insights.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Your MCP Server                                                │
│  ├─ Instrumented with @lukrlier/mcp-observatory-sdk           │
│  └─ Events → FileReporter → metrics.ndjson                     │
│                                                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  MCP Observatory Server                                         │
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

## ✨ Features

### ✅ **100% Open Source & Self-Hosted**

- All code is open source (SDK + MCP Server)
- Data stays 100% local (NDJSON files)
- No external dependencies required
- Optional cloud service for teams

### 📊 **Comprehensive Metrics**

- Tool call statistics (count, duration, success rate)
- Performance analysis (P50, P95, P99 latencies)
- Error tracking and debugging
- Cost estimation
- Health scoring and recommendations

### 🔌 **Plugin Architecture**

- **SDK Reporters**: File, Console, Cloud
- **MCP DataSources**: File, PostgreSQL, Cloud
- Easy to extend with custom implementations

### 🤖 **Conversational Monitoring**

Query metrics via natural language through Claude:

- "Show me slow tools"
- "What errors occurred today?"
- "How much will this cost?"

## 🚀 Quick Start (5 minutes)

### 1. Install SDK

```bash
npm install @lukrlier/mcp-observatory-sdk
```

### 2. Instrument Your MCP Server

```typescript
import { createObservatory } from '@lukrlier/mcp-observatory-sdk';

const observatory = createObservatory({
  reporter: 'file',
  filePath: './metrics.ndjson',
});

// Track tool calls
server.onToolCall(async (toolName, params) => {
  const start = Date.now();
  try {
    const result = await executeTool(toolName, params);
    observatory.trackToolCall({
      toolName,
      parameters: params,
      duration: Date.now() - start,
      success: true,
    });
    return result;
  } catch (error) {
    observatory.trackError({
      errorType: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
});
```

### 3. Install MCP Observatory Server

```bash
npm install -g @lukrlier/mcp-observatory-server
```

### 4. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mcp-observatory": {
      "command": "mcp-observatory-server",
      "args": ["--file", "/path/to/your/metrics.ndjson"]
    }
  }
}
```

### 5. Ask Claude

Restart Claude Desktop and ask:

- _"What are the metrics for my MCP server?"_
- _"Are there any performance issues?"_

## 📦 Project Structure

```
mcp-observatory/
├── packages/
│   ├── sdk/                # @lukrlier/mcp-observatory-sdk
│   │   ├── src/
│   │   │   ├── reporters/  # FileReporter, ConsoleReporter, CloudReporter
│   │   │   ├── factory.ts  # createObservatory()
│   │   │   └── types.ts    # Type definitions
│   │   └── package.json
│   │
│   └── mcp-server/         # @lukrlier/mcp-observatory-server
│       ├── src/
│       │   ├── datasources/ # FileDataSource, PostgresDataSource, CloudDataSource
│       │   ├── index.ts     # MCP Server implementation
│       │   └── types.ts     # Type definitions
│       └── package.json
│
├── examples/
│   └── basic-file-reporter/  # Complete example with SDK + MCP Server
```

## 🎓 Examples

### Basic File Reporter

Complete standalone example: [examples/basic-file-reporter](./examples/basic-file-reporter)

```bash
cd examples/basic-file-reporter
pnpm install
pnpm start    # Generate sample metrics
pnpm test     # Test MCP Server reads them correctly
```

See [examples/basic-file-reporter/README.md](./examples/basic-file-reporter/README.md) for detailed walkthrough.

## 🔧 Reporter Options

### File Reporter (Recommended for 95% of users)

```typescript
createObservatory({
  reporter: 'file',
  filePath: './metrics.ndjson',
  batchSize: 50,
  batchTimeout: 5000,
  sampling: 1.0, // 100%
});
```

### Console Reporter (Debugging)

```typescript
createObservatory({
  reporter: 'console',
  debug: true,
});
```

### Cloud Reporter (Optional hosted service) (coming soon)

```typescript
createObservatory({
  reporter: 'cloud',
  apiKey: 'sk_xxx',
  endpoint: 'https://api.mcp-observatory.dev/v1/ingest',
});
```

## 🛠️ MCP Server Options

### File DataSource (Standalone)

```bash
mcp-observatory-server --file ./metrics.ndjson --debug
```

### PostgreSQL DataSource (Production) (coming soon)

```bash
mcp-observatory-server --postgres "postgresql://localhost:5432/mcp"
```

### Cloud DataSource (Hosted) (coming soon)

```bash
mcp-observatory-server --cloud sk_xxx
```

## 📊 Available MCP Tools

The MCP Server exposes 5 tools that Claude can use:

1. **get_server_metrics** - Overall server health and performance
   - Optional `server_id` - if omitted, returns aggregated metrics for all servers
2. **get_tool_stats** - Detailed statistics for a specific tool
   - Optional `server_id` - if omitted, returns stats across all servers
3. **get_error_logs** - Recent errors for debugging
   - Optional `server_id` - if omitted, returns errors from all servers
4. **get_cost_estimate** - Estimated API costs
   - Optional `server_id` - if omitted, returns costs for all servers
5. **analyze_performance** - AI-powered performance insights
   - Optional `server_id` - if omitted, analyzes all servers

**Note**: All tools support querying without `server_id` to get aggregated metrics across all your MCP servers.

## 🧪 Development Status

✅ **Completed**:

- SDK with plugin architecture (FileReporter, ConsoleReporter, CloudReporter)
- MCP Server with FileDataSource
- Complete end-to-end example
- Tests passing (SDK: 12/12)
- Documentation

🚧 **In Progress**:

- PostgreSQL DataSource
- Cloud DataSource
- Additional examples
- Integration tests

📅 **Planned**:

- Dashboard (optional cloud service)
- Alerting
- Multi-server monitoring
- Team collaboration

## ❓ FAQ

### Does this send data to external servers?

No! By default, all data stays 100% local using the FileReporter. Metrics are stored in NDJSON files on your machine. The cloud reporter is optional and disabled by default.

### What's the performance overhead?

Minimal. The SDK uses:
- Async event batching (default: 50 events or 5s timeout)
- Sampling support (optional: track only X% of calls)
- Non-blocking writes

Typical overhead: <1ms per tool call.

### Can I use this in production?

Yes! The file-based approach is production-ready for most use cases. For high-volume scenarios (>1000 req/s), consider:
- Using the PostgreSQL DataSource (coming soon)
- Adjusting batch sizes
- Enabling sampling (e.g., 10% of calls)

### What's the difference between SDK and MCP Server?

- **SDK** (`@lukrlier/mcp-observatory-sdk`): Instrument your MCP server to collect metrics
- **MCP Server** (`@lukrlier/mcp-observatory-server`): Query metrics through Claude Desktop

You need both: SDK collects data → MCP Server lets Claude query it.

### How often are metrics written to disk?

Metrics are batched and written:
- Every 50 events (configurable via `batchSize`)
- Every 5 seconds (configurable via `batchTimeout`)
- On shutdown (graceful flush)

### Can I create custom reporters?

Yes! Implement the `Reporter` interface:

```typescript
interface Reporter {
  reportToolCall(event: ToolCallEvent): Promise<void>;
  reportError(event: ErrorEvent): Promise<void>;
  shutdown(): Promise<void>;
}
```

See `packages/sdk/src/reporters/` for examples.

### What data is collected?

The SDK collects:
- Tool name, parameters, duration, success/error status
- Timestamps, server ID
- Error types, messages, stack traces (opt-in)
- Custom metadata (optional)

No sensitive data is collected unless you explicitly include it in parameters or metadata.

### Is there a size limit for metrics files?

No hard limit, but:
- NDJSON files grow linearly with events
- Recommended: rotate files daily or weekly
- Use log rotation tools (e.g., logrotate) for production
- Consider PostgreSQL DataSource for long-term storage

### How do I test my instrumentation?

Run the basic example:

```bash
cd examples/basic-file-reporter
pnpm install
pnpm start  # Generates sample metrics
pnpm test   # Verifies MCP Server reads them
```

Or use the ConsoleReporter for debugging:

```typescript
createObservatory({ reporter: 'console', debug: true });
```

### Can I monitor multiple MCP servers?

Yes! Each server should:
1. Write to a unique metrics file (e.g., `server1.ndjson`, `server2.ndjson`)
2. Have a unique `serverId` in the SDK configuration
3. Be configured separately in `claude_desktop_config.json`

**New in v1.0.1**: You can now query metrics across all servers without specifying a `server_id`:

```
User: "What are my overall server metrics?"
Claude: Calls get_server_metrics() without server_id
        Returns aggregated metrics for all servers
```

This is useful for:
- Getting an overview of all your MCP servers at once
- Comparing performance across servers
- Identifying which server has issues

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📜 License

MIT - See [LICENSE](./LICENSE) for details.

## 🙏 Credits

Built with:

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Zod](https://zod.dev/) for validation
- TypeScript, Node.js, pnpm

---

**Questions?** Open an issue
