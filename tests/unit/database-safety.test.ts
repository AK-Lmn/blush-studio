// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  checkDatabaseIsolation,
  assertDatabaseIsolation,
} from '@/lib/db/safety';

describe('Database Isolation & Safety Guard for Test Suites', () => {
  it('strictly rejects running tests when NODE_ENV is production', () => {
    const result = checkDatabaseIsolation(
      'postgresql://user:pass@localhost:5432/testdb',
      { nodeEnv: 'production', allowUnsafe: false }
    );

    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('NODE_ENV=production');
  });

  it('strictly rejects running tests targeting production Neon database host/branch', () => {
    const prodUrl =
      'postgresql://neondb_owner:secret@ep-long-sky-bezcntwa-pooler.c-9.us-east-2.aws.neon.tech/neondb';
    const result = checkDatabaseIsolation(prodUrl, {
      nodeEnv: 'test',
      testDbUrl: undefined,
    });

    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('Refusing to run tests against production database');
    expect(() => assertDatabaseIsolation(prodUrl)).toThrow(
      /\[E2E Safety Guard\] Refusing to run tests against production database/
    );
  });

  it('rejects execution when no database URL is provided', () => {
    const result = checkDatabaseIsolation('', {
      nodeEnv: 'test',
      testDbUrl: undefined,
    });

    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('No database URL configured');
  });

  it('allows execution when explicit TEST_DATABASE_URL is provided', () => {
    const testBranchUrl =
      'postgresql://neondb_owner:secret@ep-delicate-surf-be1b1s28.c-9.us-east-2.aws.neon.tech/neondb';
    const result = checkDatabaseIsolation('unused_default_url', {
      nodeEnv: 'test',
      testDbUrl: testBranchUrl,
    });

    expect(result.isSafe).toBe(true);
    expect(result.target).toBe(testBranchUrl);
  });

  it('allows execution when database URL points to a dedicated Neon test branch', () => {
    const testBranchUrl =
      'postgresql://neondb_owner:secret@ep-delicate-surf-be1b1s28-pooler.c-9.us-east-2.aws.neon.tech/neondb';
    const result = checkDatabaseIsolation(testBranchUrl, {
      nodeEnv: 'test',
    });

    expect(result.isSafe).toBe(true);
  });

  it('allows execution when database URL points to local development/test database', () => {
    const localUrl = 'postgresql://postgres:postgres@localhost:5432/blush_studio_test';
    const result = checkDatabaseIsolation(localUrl, {
      nodeEnv: 'test',
    });

    expect(result.isSafe).toBe(true);
  });
});
