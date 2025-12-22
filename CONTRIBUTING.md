# Contributing to MCP Observatory

Thank you for your interest in contributing to MCP Observatory! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Actual behavior**
- **Environment details** (OS, Node version, package versions)
- **Error messages** and stack traces if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** - why this enhancement would be useful
- **Proposed solution** - how you envision this working
- **Alternatives considered**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** if you've added code that should be tested
4. **Ensure tests pass** - run `pnpm test` in the relevant package
5. **Update documentation** if you've changed APIs or added features
6. **Follow commit message conventions** (see below)
7. **Submit the pull request**

## Development Setup

### Prerequisites

- Node.js ≥20.0.0
- pnpm ≥8.0.0
- Git

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/LuKrlier/mcp-observatory.git
cd mcp-observatory

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Project Structure

```
mcp-observatory/
├── packages/
│   ├── sdk/           # @lukrlier/mcp-observatory-sdk
│   └── mcp-server/    # @lukrlier/mcp-observatory-mcp-server
├── examples/          # Usage examples
```

### Working on Packages

#### SDK Package

```bash
cd packages/sdk

# Development mode (watch)
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

#### MCP Server Package

```bash
cd packages/mcp-server

# Development mode (watch)
pnpm dev

# Run tests
pnpm test

# Build
pnpm build

# Test locally
node dist/index.js --file ./test-metrics.ndjson --debug
```

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Export public types from `types.ts`
- Use Zod for runtime validation
- Prefer interfaces over types for public APIs

### Code Style

- Follow existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused (single responsibility)
- Avoid deep nesting (max 3 levels)

### Naming Conventions

- **Files**: kebab-case (e.g., `file-reporter.ts`)
- **Classes**: PascalCase (e.g., `FileReporter`)
- **Interfaces**: PascalCase (e.g., `Reporter`)
- **Functions**: camelCase (e.g., `createObservatory`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_BATCH_SIZE`)

### Example

````typescript
/**
 * Creates an Observatory instance with the specified configuration.
 *
 * @param config - Observatory configuration with reporter type
 * @returns Configured Observatory instance
 *
 * @example
 * ```typescript
 * const observatory = createObservatory({
 *   reporter: 'file',
 *   filePath: './metrics.ndjson'
 * });
 * ```
 */
export function createObservatory(config: ObservatoryConfig): Observatory {
  const validatedConfig = ObservatoryConfigSchema.parse(config);
  // ...
}
````

## Testing

### Writing Tests

- Use Vitest for all tests
- Place tests next to source files (`.test.ts`)
- Aim for >80% code coverage
- Test both success and error cases
- Use descriptive test names

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('FileReporter', () => {
  let reporter: FileReporter;
  let tempFile: string;

  beforeEach(() => {
    tempFile = path.join(os.tmpdir(), `test-${Date.now()}.ndjson`);
    reporter = new FileReporter({ filePath: tempFile });
  });

  afterEach(async () => {
    await reporter.shutdown();
    await fs.unlink(tempFile).catch(() => {});
  });

  it('should write events to file', async () => {
    const events = [createTestEvent()];
    await reporter.send(events);

    const content = await fs.readFile(tempFile, 'utf-8');
    expect(content).toContain('tool_call');
  });

  it('should handle filesystem errors gracefully', async () => {
    const reporter = new FileReporter({ filePath: '/invalid/path.ndjson' });
    await expect(reporter.send([createTestEvent()])).rejects.toThrow();
  });
});
```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Scopes

- `sdk`: Changes to SDK package
- `mcp-server`: Changes to MCP Server package
- `examples`: Changes to examples
- `docs`: Documentation changes
- `ci`: CI/CD changes

### Examples

```
feat(sdk): add PostgreSQL reporter support

Implement PostgresReporter class with connection pooling and batch inserts.

Closes #42
```

```
fix(mcp-server): handle corrupted NDJSON lines gracefully

Skip invalid JSON lines instead of crashing. Log warnings when debug mode is enabled.

Fixes #38
```

## Adding a New Reporter (SDK)

1. **Create reporter file**: `packages/sdk/src/reporters/your-reporter.ts`
2. **Implement Reporter interface**:

```typescript
import { Reporter, BaseReporterConfig } from './base.js';

export interface YourReporterConfig extends BaseReporterConfig {
  // Your config options
}

export class YourReporter implements Reporter {
  constructor(private config: YourReporterConfig) {}

  async send(events: (ToolCallEvent | ErrorEvent)[]): Promise<void> {
    // Implementation
  }

  async flush(): Promise<void> {
    // Implementation
  }

  async shutdown(): Promise<void> {
    // Implementation
  }
}
```

3. **Add config schema**: Update `packages/sdk/src/types.ts`
4. **Update factory**: Modify `packages/sdk/src/factory.ts`
5. **Add tests**: Create `packages/sdk/src/reporters/your-reporter.test.ts`
6. **Update exports**: Add to `packages/sdk/src/reporters/index.ts`
7. **Document**: Add example to SDK README

## Adding a New DataSource (MCP Server)

1. **Create datasource file**: `packages/mcp-server/src/datasources/your-datasource.ts`
2. **Implement DataSource interface**
3. **Add config schema**: Update `packages/mcp-server/src/types.ts`
4. **Update CLI parser**: Modify `packages/mcp-server/src/index.ts`
5. **Add tests**: Create `packages/mcp-server/src/datasources/your-datasource.test.ts`
6. **Document**: Add example to MCP Server README

## Documentation

### README Updates

When adding features:

- Update relevant package README
- Add code examples
- Update configuration tables
- Add to FAQ if applicable

### API Documentation

- Use JSDoc for all public APIs
- Include `@example` tags
- Document all parameters with `@param`
- Document return values with `@returns`
- Document thrown errors with `@throws`

## Release Process

Maintainers handle releases. The process:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Push tag to trigger CI/CD
5. Publish to npm
6. Create GitHub release

## Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/mcp-observatory/discussions)
- **Bugs**: Open a [GitHub Issue](https://github.com/mcp-observatory/issues)

## Recognition

Contributors will be:

- Listed in release notes
- Mentioned in project README
- Invited to join as collaborators (after consistent contributions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to MCP Observatory! 🎉
