/**
 * Database Isolation & Safety Verification for E2E and Test Suites.
 * Prevents tests from running against production databases and protects visitor data.
 */

export interface DatabaseIsolationResult {
  isSafe: boolean;
  reason?: string;
  target: string;
}

export function checkDatabaseIsolation(
  dbUrl?: string,
  env: { nodeEnv?: string; testDbUrl?: string; allowUnsafe?: boolean } = {}
): DatabaseIsolationResult {
  const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV;
  const testDbUrl = env.testDbUrl ?? process.env.TEST_DATABASE_URL;
  const allowUnsafe = env.allowUnsafe ?? Boolean(process.env.ALLOW_UNSAFE_PRODUCTION_TESTS);

  if (nodeEnv === 'production' && !allowUnsafe) {
    return {
      isSafe: false,
      reason: 'E2E tests cannot be executed when NODE_ENV=production.',
      target: 'production_environment',
    };
  }

  const targetUrl = testDbUrl || dbUrl || process.env.DATABASE_URL || '';

  if (!targetUrl) {
    return {
      isSafe: false,
      reason: 'No database URL configured. A dedicated test database or Neon test branch (TEST_DATABASE_URL) is required.',
      target: 'unknown',
    };
  }

  const prodIndicators = [
    'ep-long-sky-bezcntwa',
    'br-super-surf-be6vauzb',
    'demo-prod-one.vercel.app',
  ];

  const targetsProduction = prodIndicators.some((indicator) =>
    targetUrl.toLowerCase().includes(indicator.toLowerCase())
  );

  const hasDedicatedTestTarget =
    Boolean(testDbUrl) ||
    targetUrl.includes('test') ||
    targetUrl.includes('ep-delicate-surf') ||
    targetUrl.includes('localhost') ||
    targetUrl.includes('127.0.0.1') ||
    targetUrl.includes('pglite');

  if (targetsProduction && !hasDedicatedTestTarget) {
    return {
      isSafe: false,
      reason: `Refusing to run tests against production database (${targetUrl.split('@')[1]?.split('/')[0] || 'production'}). Configure a dedicated test database or Neon test branch via TEST_DATABASE_URL.`,
      target: targetUrl,
    };
  }

  return {
    isSafe: true,
    target: targetUrl,
  };
}

export function assertDatabaseIsolation(dbUrl?: string): void {
  const result = checkDatabaseIsolation(dbUrl);
  if (!result.isSafe) {
    throw new Error(`[E2E Safety Guard] ${result.reason}`);
  }
}
