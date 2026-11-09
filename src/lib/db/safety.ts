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
  env: { nodeEnv?: string; testDbUrl?: string } = {}
): DatabaseIsolationResult {
  const nodeEnv = env.nodeEnv ?? process.env.NODE_ENV;
  const testDbUrl = env.testDbUrl ?? process.env.TEST_DATABASE_URL;

  // 1. Strict invariant: tests cannot run in production runtime environment
  if (nodeEnv === 'production') {
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

  const cleanUrl = targetUrl.replace(/:[^:@]+@/, '@'); // strip password before checking

  const prodIndicators = [
    'ep-long-sky-bezcntwa',
    'br-super-surf-be6vauzb',
    'demo-prod-one.vercel.app',
    'branch=production',
    '/production',
  ];

  const targetsProduction = prodIndicators.some((indicator) =>
    cleanUrl.toLowerCase().includes(indicator.toLowerCase())
  );

  // UNCONDITIONAL REJECTION: Never allow tests against production under any circumstances
  if (targetsProduction) {
    return {
      isSafe: false,
      reason: `Refusing to run tests against production database (${cleanUrl.split('@')[1]?.split('/')[0] || 'production'}). Production databases are strictly forbidden in test suites, even if passed via TEST_DATABASE_URL.`,
      target: targetUrl,
    };
  }

  const isDedicatedTestTarget =
    cleanUrl.includes('test') ||
    cleanUrl.includes('ep-delicate-surf') ||
    cleanUrl.includes('localhost') ||
    cleanUrl.includes('127.0.0.1') ||
    cleanUrl.includes('pglite') ||
    Boolean(process.env.PLAYWRIGHT_TEST_DB);

  if (!isDedicatedTestTarget) {
    return {
      isSafe: false,
      reason: `Database target (${cleanUrl.split('@')[1]?.split('/')[0] || 'unknown'}) is not recognized as a dedicated test database or Neon test branch. Configure TEST_DATABASE_URL pointing to an isolated test branch (e.g. branch 'test' or localhost).`,
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
