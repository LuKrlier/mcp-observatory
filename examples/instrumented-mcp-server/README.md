# Instrumented MCP Server Example

Minimal MCP server demonstrating integration with MCP Observatory SDK for tracking tool calls and errors.

## Available Tools

- **echo**: Returns the provided message
- **calculate**: Performs arithmetic operations (add, subtract, multiply, divide)
- **random**: Generates a random number within a range

## Installation

```bash
cd examples/instrumented-mcp-server
pnpm install
pnpm build
```

## Manual Testing

### 1. Start the server manually

```bash
pnpm start
```

The server expects JSON-RPC requests on stdin. Example:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello!"}}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"calculate","arguments":{"operation":"add","a":5,"b":3}}}
```

Stop with Ctrl+C to flush metrics.

### 2. Integration with Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "instrumented-mcp-server": {
      "command": "node",
      "args": [
        "C:\\Users\\lucas\\projects\\mcp\\mcp-observatory\\examples\\instrumented-mcp-server\\dist\\index.js"
      ]
    }
  }
}
```

Restart Claude Desktop, then test:

- "Echo 'Hello Observatory!'"
- "Calculate 42 + 58"
- "Generate a random number between 1 and 100"
- "Divide 10 by 0" (to generate an error)

### 3. Query metrics

Metrics are saved in `metrics.ndjson`.

Configure the MCP Observatory Server to query them:

```json
{
  "mcpServers": {
    "mcp-observatory": {
      "command": "mcp-observatory-server",
      "args": [
        "--file",
        "C:\\Users\\lucas\\projects\\mcp\\mcp-observatory\\examples\\instrumented-mcp-server\\metrics.ndjson"
      ]
    }
  }
}
```

Then in Claude Desktop:

- "Show me the server metrics"
- "What are the recent errors?"
- "Performance of the calculate tool"

## Key Implementation Points

### 1. Observatory Initialization

```typescript
const observatory = createObservatory({
  reporter: 'file',
  filePath: join(__dirname, '..', 'metrics.ndjson'),
  batchSize: 10,
  batchTimeout: 3000,
  debug: true,
});
```

### 2. Tracking successful calls

```typescript
observatory.trackToolCall({
  toolName,
  parameters: args || {},
  duration: Date.now() - start,
  success: true,
});
```

### 3. Tracking errors

```typescript
// Track error
observatory.trackError({
  errorType: err.name || 'Error',
  message: err.message,
  stack: err.stack || '',
  metadata: { toolName }, // ⚠️ IMPORTANT to identify the tool
});

// Track failed tool call
observatory.trackToolCall({
  toolName,
  parameters: args || {},
  duration: Date.now() - start,
  success: false,
  error: err.message,
});
```

### 4. Graceful Shutdown

```typescript
process.on('SIGINT', async () => {
  await observatory.flush();
  await observatory.shutdown();
  process.exit(0);
});
```

## File Structure

```
instrumented-mcp-server/
├── src/
│   └── index.ts         # MCP server with tracking
├── dist/                # Build output
├── metrics.ndjson       # Generated metrics
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Example Claude Requests

**Normal calls:**

- "Echo 'Test message'"
- "What's 15 + 27?"
- "Multiply 6 by 7"
- "Give me a random number"

**Error generation:**

- "Divide 10 by 0"
- "Calculate with invalid operation"
- "Random number with min > max"

**Metrics queries:**

- "Show me the server metrics"
- "What errors occurred?"
- "How many successful calls?"
- "Performance of the echo tool"
