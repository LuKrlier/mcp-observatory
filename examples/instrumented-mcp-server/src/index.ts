/**
 * Instrumented MCP Server Example
 *
 * This is a minimal MCP server that demonstrates how to integrate
 * the MCP Observatory SDK to track tool calls and errors.
 *
 * Tools:
 * - echo: Returns the input message
 * - calculate: Performs basic arithmetic operations
 * - random: Generates a random number in a range
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createObservatory } from '@lukrlier/mcp-observatory-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Observatory instance
const observatory = createObservatory({
  reporter: 'file',
  filePath: join(__dirname, '..', 'metrics.ndjson'),
  batchSize: 10,
  batchTimeout: 3000,
  debug: true,
});

// Create MCP server
const server = new Server(
  {
    name: 'instrumented-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const TOOLS = [
  {
    name: 'echo',
    description: 'Returns the input message',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to echo back',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'calculate',
    description: 'Performs basic arithmetic operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'The operation to perform',
        },
        a: {
          type: 'number',
          description: 'First number',
        },
        b: {
          type: 'number',
          description: 'Second number',
        },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'random',
    description: 'Generates a random number within a range',
    inputSchema: {
      type: 'object',
      properties: {
        min: {
          type: 'number',
          description: 'Minimum value (inclusive)',
          default: 0,
        },
        max: {
          type: 'number',
          description: 'Maximum value (inclusive)',
          default: 100,
        },
      },
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call tool handler with Observatory tracking
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: args } = request.params;
  const start = performance.now();

  try {
    let result: string;

    // Execute tool logic
    switch (toolName) {
      case 'echo': {
        const { message } = args as { message: string };
        result = message;
        break;
      }

      case 'calculate': {
        const { operation, a, b } = args as {
          operation: 'add' | 'subtract' | 'multiply' | 'divide';
          a: number;
          b: number;
        };

        // Validation
        if (typeof a !== 'number' || typeof b !== 'number') {
          throw new Error('Both a and b must be numbers');
        }

        if (operation === 'divide' && b === 0) {
          throw new Error('Division by zero is not allowed');
        }

        let value: number;
        switch (operation) {
          case 'add':
            value = a + b;
            break;
          case 'subtract':
            value = a - b;
            break;
          case 'multiply':
            value = a * b;
            break;
          case 'divide':
            value = a / b;
            break;
        }

        result = `${a} ${operation} ${b} = ${value}`;
        break;
      }

      case 'random': {
        const { min = 0, max = 100 } = args as { min?: number; max?: number };

        if (typeof min !== 'number' || typeof max !== 'number') {
          throw new Error('Both min and max must be numbers');
        }

        if (min > max) {
          throw new Error('min cannot be greater than max');
        }

        const value = Math.floor(Math.random() * (max - min + 1)) + min;
        result = `Random number between ${min} and ${max}: ${value}`;
        break;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    // Track successful tool call
    observatory.trackToolCall({
      toolName,
      parameters: args || {},
      duration: performance.now() - start,
      success: true,
    });

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    const err = error as Error;

    // Track error
    observatory.trackError({
      errorType: err.name || 'Error',
      message: err.message,
      stack: err.stack || '',
      metadata: { toolName }, // IMPORTANT: Include toolName in metadata
    });

    // Track failed tool call
    observatory.trackToolCall({
      toolName,
      parameters: args || {},
      duration: performance.now() - start,
      success: false,
      error: err.message,
    });

    throw error;
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  await observatory.flush();
  await observatory.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down...');
  await observatory.flush();
  await observatory.shutdown();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Instrumented MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
