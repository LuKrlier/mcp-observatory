# @lukrlier/mcp-observatory-sdk

> Observability SDK for MCP Servers - Track metrics, errors, and performance

## Installation

```bash
npm install @lukrlier/mcp-observatory-sdk
```

## Quick Start

```typescript
import { createObservatory } from '@lukrlier/mcp-observatory-sdk';

const observatory = createObservatory({
  reporter: 'file',
  filePath: './metrics.ndjson',
});

// Track tool calls
observatory.trackToolCall({
  toolName: 'get_weather',
  parameters: { city: 'Paris' },
  duration: 145,
  success: true,
});

// Track errors
observatory.trackError({
  errorType: 'ValidationError',
  message: 'Invalid parameter',
  stack: error.stack,
});

// Flush and cleanup
await observatory.flush();
await observatory.shutdown();
```

## Reporters

### File Reporter (Recommended)

Writes events to local NDJSON file for standalone monitoring.

```typescript
createObservatory({
  reporter: 'file',
  filePath: './metrics.ndjson',
  batchSize: 50, // Events per batch
  batchTimeout: 5000, // Max ms before flush
  sampling: 1.0, // 100% sampling
  debug: false,
});
```

**Use Cases:**

- Local development and debugging
- Self-hosted monitoring
- No external dependencies
- 95% of use cases

### Console Reporter

Logs events to console for debugging.

```typescript
createObservatory({
  reporter: 'console',
  debug: true,
});
```

**Use Cases:**

- Development debugging
- Quick testing
- Troubleshooting instrumentation

### Cloud Reporter (coming soon)

Sends events to hosted MCP Observatory service.

```typescript
createObservatory({
  reporter: 'cloud',
  apiKey: 'sk_xxx',
  endpoint: 'https://api.mcp-observatory.dev/v1/ingest',
  batchSize: 50,
  batchTimeout: 5000,
  sampling: 1.0,
  debug: false,
});
```

**Use Cases:**

- Team collaboration
- Multi-server monitoring
- Centralized dashboard
- Optional hosted service

## API Reference

### `createObservatory(config)`

Creates an Observatory instance with the specified reporter.

**Parameters:**

- `config`: Reporter configuration (see Reporters section)

**Returns:** `Observatory` instance

### `Observatory`

#### `trackToolCall(event: ToolCallEvent): void`

Records a tool execution.

```typescript
observatory.trackToolCall({
  toolName: string;
  parameters: Record<string, any>;
  duration: number;        // milliseconds
  success: boolean;
  error?: string;         // if success = false
});
```

#### `trackError(event: ErrorEvent): void`

Records an error occurrence.

```typescript
observatory.trackError({
  errorType: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
});
```

#### `flush(): Promise<void>`

Flushes pending events immediately.

```typescript
await observatory.flush();
```

#### `shutdown(): Promise<void>`

Flushes events and cleans up resources.

```typescript
await observatory.shutdown();
```

## Configuration Options

### Common Options

| Option         | Type    | Default | Description          |
| -------------- | ------- | ------- | -------------------- |
| `batchSize`    | number  | 50      | Events per batch     |
| `batchTimeout` | number  | 5000    | Max ms before flush  |
| `sampling`     | number  | 1.0     | Sample rate (0-1)    |
| `debug`        | boolean | false   | Enable debug logging |

### File Reporter Options

| Option     | Type   | Required | Description         |
| ---------- | ------ | -------- | ------------------- |
| `reporter` | 'file' | Yes      | Reporter type       |
| `filePath` | string | Yes      | Path to NDJSON file |

### Console Reporter Options

| Option     | Type      | Required | Description   |
| ---------- | --------- | -------- | ------------- |
| `reporter` | 'console' | Yes      | Reporter type |

### Cloud Reporter Options

| Option     | Type    | Required | Description   |
| ---------- | ------- | -------- | ------------- |
| `reporter` | 'cloud' | Yes      | Reporter type |
| `apiKey`   | string  | Yes      | API key       |
| `endpoint` | string  | Yes      | API endpoint  |

## Advanced Usage

### Custom Reporter

```typescript
import { Reporter, Observatory } from '@lukrlier/mcp-observatory-sdk';

class CustomReporter implements Reporter {
  async send(events: (ToolCallEvent | ErrorEvent)[]): Promise<void> {
    // Custom implementation
  }

  async flush(): Promise<void> {
    // Custom flush logic
  }

  async shutdown(): Promise<void> {
    // Custom cleanup
  }
}

const reporter = new CustomReporter();
const observatory = new Observatory(reporter, {
  batchSize: 100,
  debug: true,
});
```

### Sampling

Reduce overhead by sampling a percentage of events:

```typescript
createObservatory({
  reporter: 'file',
  filePath: './metrics.ndjson',
  sampling: 0.1, // 10% sampling
});
```

### Error Handling

```typescript
try {
  const result = await executeTool(toolName, params);
  observatory.trackToolCall({
    toolName,
    parameters: params,
    duration: Date.now() - start,
    success: true,
  });
} catch (error) {
  observatory.trackToolCall({
    toolName,
    parameters: params,
    duration: Date.now() - start,
    success: false,
    error: error.message,
  });

  observatory.trackError({
    errorType: error.name,
    message: error.message,
    stack: error.stack,
  });

  throw error;
}
```

## Examples

See [examples/basic-file-reporter](../../examples/basic-file-reporter) for a complete working example.

## TypeScript Support

Full TypeScript support with type definitions included.

```typescript
import type {
  Observatory,
  ObservatoryConfig,
  ToolCallEvent,
  ErrorEvent,
  Reporter,
} from '@lukrlier/mcp-observatory-sdk';
```

## License

MIT
