/**
 * MCP Observatory Server
 *
 * Provides MCP tools for querying observability metrics from MCP servers.
 * Supports file, PostgreSQL, and cloud data sources.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type {
  ObservatoryServerConfig,
  DataSourceConfig,
  TimeRange,
  Severity,
} from './types.js';
import { FileDataSource } from './datasources/index.js';
import type { DataSource } from './datasources/index.js';

/**
 * MCP Observatory Server
 */
class ObservatoryServer {
  private server: Server;
  private dataSource: DataSource;
  private tools: Map<string, Tool>;

  constructor(config: ObservatoryServerConfig, dataSource: DataSource) {
    this.dataSource = dataSource;
    this.tools = new Map();

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'mcp-observatory',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registerTools();
    this.setupHandlers();
  }

  /**
   * Register all available tools
   */
  private registerTools(): void {
    const tools: Tool[] = [
      {
        name: 'get_server_metrics',
        description: 'Get real-time performance metrics for an MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            server_id: {
              type: 'string',
              description: 'MCP server identifier',
            },
            time_range: {
              type: 'string',
              enum: ['5m', '1h', '24h', '7d', '30d'],
              description: 'Time range for metrics',
              default: '1h',
            },
          },
          required: ['server_id'],
        },
      },
      {
        name: 'get_tool_stats',
        description: 'Get detailed statistics for a specific tool',
        inputSchema: {
          type: 'object',
          properties: {
            server_id: {
              type: 'string',
              description: 'MCP server identifier',
            },
            tool_name: {
              type: 'string',
              description: 'Name of the tool to analyze',
            },
            time_range: {
              type: 'string',
              enum: ['5m', '1h', '24h', '7d', '30d'],
              description: 'Time range for statistics',
              default: '1h',
            },
          },
          required: ['server_id', 'tool_name'],
        },
      },
      {
        name: 'get_error_logs',
        description: 'Retrieve recent error logs for debugging',
        inputSchema: {
          type: 'object',
          properties: {
            server_id: {
              type: 'string',
              description: 'MCP server identifier',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of errors to return',
              default: 50,
              maximum: 100,
            },
            severity: {
              type: 'string',
              enum: ['all', 'error', 'critical'],
              description: 'Filter by severity level',
              default: 'all',
            },
          },
          required: ['server_id'],
        },
      },
      {
        name: 'get_cost_estimate',
        description: 'Calculate estimated API costs for a server',
        inputSchema: {
          type: 'object',
          properties: {
            server_id: {
              type: 'string',
              description: 'MCP server identifier',
            },
            time_range: {
              type: 'string',
              enum: ['5m', '1h', '24h', '7d', '30d'],
              description: 'Time range for cost calculation',
              default: '24h',
            },
          },
          required: ['server_id'],
        },
      },
      {
        name: 'analyze_performance',
        description: 'AI-powered performance analysis with actionable recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            server_id: {
              type: 'string',
              description: 'MCP server identifier',
            },
            time_range: {
              type: 'string',
              enum: ['5m', '1h', '24h', '7d', '30d'],
              description: 'Time range for analysis',
              default: '24h',
            },
          },
          required: ['server_id'],
        },
      },
    ];

    tools.forEach((tool) => this.tools.set(tool.name, tool));
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      if (!this.tools.has(name)) {
        throw new Error(`Unknown tool: ${name}`);
      }

      // Type assertion for tool arguments
      const toolArgs = args as Record<string, unknown>;

      try {
        let result;

        switch (name) {
          case 'get_server_metrics':
            result = await this.dataSource.getServerMetrics({
              serverId: toolArgs.server_id as string,
              timeRange: toolArgs.time_range as TimeRange | undefined,
            });
            break;

          case 'get_tool_stats':
            result = await this.dataSource.getToolStats({
              serverId: toolArgs.server_id as string,
              toolName: toolArgs.tool_name as string,
              timeRange: toolArgs.time_range as TimeRange | undefined,
            });
            break;

          case 'get_error_logs':
            result = await this.dataSource.getErrorLogs({
              serverId: toolArgs.server_id as string,
              limit: toolArgs.limit as number | undefined,
              severity: toolArgs.severity as Severity | undefined,
            });
            break;

          case 'get_cost_estimate':
            result = await this.dataSource.getCostEstimate({
              serverId: toolArgs.server_id as string,
              timeRange: toolArgs.time_range as TimeRange | undefined,
            });
            break;

          case 'analyze_performance':
            result = await this.dataSource.analyzePerformance({
              serverId: toolArgs.server_id as string,
              timeRange: toolArgs.time_range as TimeRange | undefined,
            });
            break;

          default:
            throw new Error(`Tool not implemented: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error executing tool ${name}:`, error);
        throw new Error(`Tool execution failed: ${errorMessage}`);
      }
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('MCP Observatory Server running on stdio');
  }

  /**
   * Shutdown the server
   */
  async shutdown(): Promise<void> {
    await this.dataSource.shutdown();
  }
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
MCP Observatory Server v1.0.0

Usage:
  mcp-observatory-server [options]

Options:
  --file <path>              Use file-based data source
  --postgres <connection>    Use PostgreSQL data source (coming soon)
  --cloud <apiKey> [endpoint] Use cloud-based data source (coming soon)
  --debug                    Enable debug logging
  --help, -h                 Show this help message
  --version, -v              Show version number

Examples:
  # File-based (local development)
  mcp-observatory-server --file ./metrics.ndjson

  # PostgreSQL (production)
  mcp-observatory-server --postgres "postgresql://user:pass@localhost:5432/metrics"

  # Cloud (SaaS)
  mcp-observatory-server --cloud sk_prod_xxx https://api.example.com/v1

  # With debug logging
  mcp-observatory-server --file ./metrics.ndjson --debug

Documentation: https://github.com/LuKrlier/mcp-observatory#readme
`);
  process.exit(0);
}

/**
 * Display version
 */
function showVersion(): void {
  console.log('1.0.0');
  process.exit(0);
}

/**
 * Parse CLI arguments or use environment variables for configuration
 */
function parseConfig(): DataSourceConfig {
  const args = process.argv.slice(2);

  // Check for help flags
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  }

  // Check for version flags
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
  }

  // Check for --file flag
  const fileIndex = args.indexOf('--file');
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    return {
      dataSource: 'file',
      filePath: args[fileIndex + 1],
      debug: args.includes('--debug'),
    };
  }

  // Check for --postgres flag
  const postgresIndex = args.indexOf('--postgres');
  if (postgresIndex !== -1 && args[postgresIndex + 1]) {
    return {
      dataSource: 'postgres',
      connectionString: args[postgresIndex + 1],
      debug: args.includes('--debug'),
    };
  }

  // Check for --cloud flag
  const cloudIndex = args.indexOf('--cloud');
  if (cloudIndex !== -1) {
    const apiKey = args[cloudIndex + 1];
    const endpoint = args[cloudIndex + 2];

    if (!apiKey) {
      throw new Error('--cloud requires API key');
    }

    return {
      dataSource: 'cloud',
      apiKey,
      endpoint: endpoint || 'https://api.mcp-observatory.dev/v1',
      debug: args.includes('--debug'),
    };
  }

  // Fallback to environment variables
  const filePath = process.env.MCP_OBSERVATORY_FILE;
  if (filePath) {
    return {
      dataSource: 'file',
      filePath,
      debug: process.env.DEBUG === 'true',
    };
  }

  // Default to file data source with default path
  return {
    dataSource: 'file',
    filePath: './mcp-metrics.ndjson',
    debug: false,
  };
}

/**
 * Create data source from configuration
 */
function createDataSource(config: DataSourceConfig): DataSource {
  switch (config.dataSource) {
    case 'file':
      return new FileDataSource({
        filePath: config.filePath,
        debug: config.debug,
      });

    case 'postgres':
      throw new Error('PostgreSQL data source not yet implemented');

    case 'cloud':
      throw new Error('Cloud data source not yet implemented');

    default: {
      const _exhaustive: never = config;
      throw new Error(
        `Unknown data source: ${(config as { dataSource: string }).dataSource}`
      );
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  const dataSourceConfig = parseConfig();
  const dataSource = createDataSource(dataSourceConfig);

  const config: ObservatoryServerConfig = {
    dataSourceConfig,
  };

  const server = new ObservatoryServer(config, dataSource);
  await server.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });
}

// Run server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
