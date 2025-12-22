import { Observatory, ObservatoryOptions } from './observatory';
import type { ObservatoryConfig } from './types';
import { ObservatoryConfigSchema } from './types';
import { FileReporter, ConsoleReporter, CloudReporter } from './reporters';
import type { Reporter } from './reporters';

/**
 * Factory function to create Observatory instance with the appropriate reporter
 *
 * @example File reporter
 * ```typescript
 * const observatory = createObservatory({
 *   reporter: 'file',
 *   filePath: './logs/mcp-metrics.ndjson',
 *   debug: true
 * });
 * ```
 *
 * @example Console reporter
 * ```typescript
 * const observatory = createObservatory({
 *   reporter: 'console',
 *   debug: true
 * });
 * ```
 *
 * @example Cloud reporter
 * ```typescript
 * const observatory = createObservatory({
 *   reporter: 'cloud',
 *   apiKey: 'sk_xxx',
 *   endpoint: 'https://api.mcp-observatory.dev/v1/ingest'
 * });
 * ```
 */
export function createObservatory(config: ObservatoryConfig): Observatory {
  // Validate configuration with Zod
  const validatedConfig = ObservatoryConfigSchema.parse(config);

  // Create reporter based on configuration
  let reporter: Reporter;

  switch (validatedConfig.reporter) {
    case 'file':
      reporter = new FileReporter({
        filePath: validatedConfig.filePath,
        debug: validatedConfig.debug,
      });
      break;

    case 'console':
      reporter = new ConsoleReporter({
        debug: validatedConfig.debug,
      });
      break;

    case 'cloud': {
      // For cloud reporter, we need to generate a server ID that will be passed to the reporter
      const serverId = `srv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      reporter = new CloudReporter({
        apiKey: validatedConfig.apiKey,
        endpoint: validatedConfig.endpoint,
        serverId,
        debug: validatedConfig.debug,
      });
      break;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = validatedConfig;
      throw new Error(
        `Unknown reporter type: ${(validatedConfig as { reporter: string }).reporter}`
      );
    }
  }

  // Create Observatory options from config
  const options: ObservatoryOptions = {
    sampling: validatedConfig.sampling,
    batchSize: validatedConfig.batchSize,
    batchTimeout: validatedConfig.batchTimeout,
    debug: validatedConfig.debug,
  };

  return new Observatory(reporter, options);
}
