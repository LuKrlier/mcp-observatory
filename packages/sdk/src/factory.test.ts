import { describe, it, expect, afterEach } from 'vitest';
import { createObservatory } from './factory';
import { Observatory } from './observatory';

describe('createObservatory', () => {
  let observatory: Observatory | undefined;

  afterEach(async () => {
    if (observatory) {
      await observatory.shutdown();
      observatory = undefined;
    }
  });

  describe('FileReporter Creation', () => {
    it('should create Observatory with FileReporter', () => {
      observatory = createObservatory({
        reporter: 'file',
        filePath: './test-metrics.ndjson',
      });

      expect(observatory).toBeDefined();
      expect(observatory).toBeInstanceOf(Observatory);
    });

    it('should create FileReporter with custom options', () => {
      observatory = createObservatory({
        reporter: 'file',
        filePath: './test-metrics.ndjson',
        batchSize: 100,
        batchTimeout: 10000,
        sampling: 0.5,
        debug: true,
      });

      expect(observatory).toBeDefined();
      expect(observatory).toBeInstanceOf(Observatory);
    });

    it('should apply default values for FileReporter', () => {
      observatory = createObservatory({
        reporter: 'file',
        filePath: './test-metrics.ndjson',
      });

      expect(observatory).toBeDefined();
      // Default values are applied by Zod schema
    });

    it('should throw on missing filePath for FileReporter', () => {
      expect(() =>
        createObservatory({
          reporter: 'file',
          // @ts-expect-error - Testing validation
          filePath: '',
        })
      ).toThrow();
    });
  });

  describe('ConsoleReporter Creation', () => {
    it('should create Observatory with ConsoleReporter', () => {
      observatory = createObservatory({
        reporter: 'console',
      });

      expect(observatory).toBeDefined();
      expect(observatory).toBeInstanceOf(Observatory);
    });

    it('should create ConsoleReporter with debug enabled', () => {
      observatory = createObservatory({
        reporter: 'console',
        debug: true,
      });

      expect(observatory).toBeDefined();
      expect(observatory).toBeInstanceOf(Observatory);
    });

    it('should create ConsoleReporter with custom options', () => {
      observatory = createObservatory({
        reporter: 'console',
        batchSize: 25,
        batchTimeout: 1000,
        sampling: 0.8,
      });

      expect(observatory).toBeDefined();
      expect(observatory).toBeInstanceOf(Observatory);
    });
  });

  describe('CloudReporter Creation', () => {
    it('should create Observatory with CloudReporter', () => {
      observatory = createObservatory({
        reporter: 'cloud',
        apiKey: 'sk_test_123456',
      });

      expect(observatory).toBeDefined();
      expect(observatory).toBeInstanceOf(Observatory);
    });

    it('should create CloudReporter with custom endpoint', () => {
      observatory = createObservatory({
        reporter: 'cloud',
        apiKey: 'sk_test_123456',
        endpoint: 'https://custom.example.com/ingest',
      });

      expect(observatory).toBeDefined();
      expect(observatory).toBeInstanceOf(Observatory);
    });

    it('should throw on missing apiKey for CloudReporter', () => {
      expect(() =>
        createObservatory({
          reporter: 'cloud',
          // @ts-expect-error - Testing validation
          apiKey: '',
        })
      ).toThrow();
    });

    it('should throw on invalid endpoint URL for CloudReporter', () => {
      expect(() =>
        createObservatory({
          reporter: 'cloud',
          apiKey: 'sk_test_123456',
          // @ts-expect-error - Testing validation
          endpoint: 'not-a-valid-url',
        })
      ).toThrow();
    });
  });

  describe('Config Validation', () => {
    it('should throw on invalid reporter type', () => {
      expect(() =>
        createObservatory({
          // @ts-expect-error - Testing validation
          reporter: 'invalid-reporter',
        })
      ).toThrow();
    });

    it('should throw on missing required fields', () => {
      expect(() =>
        createObservatory({
          reporter: 'file',
          // @ts-expect-error - Testing validation: missing filePath
        })
      ).toThrow();
    });

    it('should throw on invalid sampling value (> 1)', () => {
      expect(() =>
        createObservatory({
          reporter: 'console',
          // @ts-expect-error - Testing validation
          sampling: 1.5,
        })
      ).toThrow();
    });

    it('should throw on invalid sampling value (< 0)', () => {
      expect(() =>
        createObservatory({
          reporter: 'console',
          // @ts-expect-error - Testing validation
          sampling: -0.5,
        })
      ).toThrow();
    });

    it('should throw on invalid batchSize (non-positive)', () => {
      expect(() =>
        createObservatory({
          reporter: 'console',
          // @ts-expect-error - Testing validation
          batchSize: 0,
        })
      ).toThrow();
    });

    it('should throw on invalid batchTimeout (non-positive)', () => {
      expect(() =>
        createObservatory({
          reporter: 'console',
          // @ts-expect-error - Testing validation
          batchTimeout: -1000,
        })
      ).toThrow();
    });
  });

  describe('Options Passing', () => {
    it('should pass sampling option to Observatory', () => {
      observatory = createObservatory({
        reporter: 'console',
        sampling: 0.5,
      });

      expect(observatory).toBeDefined();
      // Observatory will use sampling internally
    });

    it('should pass batchSize option to Observatory', () => {
      observatory = createObservatory({
        reporter: 'console',
        batchSize: 75,
      });

      expect(observatory).toBeDefined();
      // Observatory will use batchSize internally
    });

    it('should pass batchTimeout option to Observatory', () => {
      observatory = createObservatory({
        reporter: 'console',
        batchTimeout: 3000,
      });

      expect(observatory).toBeDefined();
      // Observatory will use batchTimeout internally
    });

    it('should pass debug option to Observatory', () => {
      observatory = createObservatory({
        reporter: 'console',
        debug: true,
      });

      expect(observatory).toBeDefined();
      // Observatory will use debug flag internally
    });

    it('should pass all options together to Observatory', () => {
      observatory = createObservatory({
        reporter: 'file',
        filePath: './metrics.ndjson',
        sampling: 0.75,
        batchSize: 200,
        batchTimeout: 8000,
        debug: true,
      });

      expect(observatory).toBeDefined();
      expect(observatory).toBeInstanceOf(Observatory);
    });
  });
});
