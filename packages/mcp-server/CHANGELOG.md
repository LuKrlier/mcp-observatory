# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-12-22

### Added

- 🎉 Initial release of @lukrlier/mcp-observatory-mcp-server
- MCP Server for conversational monitoring with Claude
- Plugin architecture with DataSource interface
- FileDataSource for reading local NDJSON files
- 5 MCP tools for querying metrics:
  - `get_server_metrics` - Overall server performance
  - `get_tool_stats` - Individual tool statistics
  - `get_error_logs` - Recent error logs
  - `get_cost_estimate` - API cost estimation
  - `analyze_performance` - AI-powered performance insights
- CLI argument parsing (--file, --postgres, --cloud, --debug)
- Time range filtering (5m, 1h, 24h, 7d, 30d)
- Percentile calculations (P50, P95, P99)
- Performance health scoring
- Smart caching (5-second TTL)
- Full TypeScript support
- Zod schema validation

### Technical Details

- NDJSON file parsing with error handling
- Event filtering by server_id and timestamp
- Metrics aggregation and calculation
- Corrupted line handling (skip with warning)
- Debug mode with detailed logging
- Graceful shutdown support
- stdio transport for Claude Desktop

### Documentation

- Comprehensive README with examples
- Claude Desktop configuration guide
- Tool reference documentation
- Troubleshooting section
- TypeScript type definitions

[Unreleased]: https://github.com/LuKrlier/mcp-observatory/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/LuKrlier/mcp-observatory/releases/tag/v1.0.0
