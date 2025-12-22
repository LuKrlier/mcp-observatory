# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-12-22

### Added

- 🎉 Initial release of @lukrlier/mcp-observatory-sdk
- Plugin architecture with Reporter interface
- FileReporter for local NDJSON storage
- ConsoleReporter for debugging
- CloudReporter for optional hosted service (future)
- `trackToolCall()` method for tracking tool executions
- `trackError()` method for error logging
- Automatic batching (configurable size and timeout)
- Configurable sampling (0-1 range)
- Full TypeScript support with type definitions
- Zod schema validation for configurations
- Zero external dependencies for file reporter
- Debug mode support

### Technical Details

- Event batching with configurable batch size (default: 50)
- Batch timeout support (default: 5000ms)
- Automatic server ID generation
- Graceful shutdown with event flushing
- NDJSON format for streaming data
- Directory creation for file paths

### Documentation

- Comprehensive README with examples
- API reference documentation
- Configuration options guide
- TypeScript type definitions

[Unreleased]: https://github.com/LuKrlier/mcp-observatory/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/LuKrlier/mcp-observatory/releases/tag/v1.0.0
