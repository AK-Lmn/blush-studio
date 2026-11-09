import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables strictly in local development environments (never in Vercel serverless production)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  try {
    dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });
    dotenvConfig({ path: path.resolve(process.cwd(), '.env') });
  } catch {}
}

export { assertDatabaseIsolation, checkDatabaseIsolation } from './safety';

function getDatabaseUrl(): string | undefined {
  const isTestEnv = Boolean(process.env.PLAYWRIGHT_TEST || (process.env.NODE_ENV as string) === 'test');

  // 1. In test environments (Playwright or test runner), strictly prioritize dedicated test database
  if (isTestEnv) {
    return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  }

  // 2. In Vercel preview environments, strictly require PREVIEW_DATABASE_URL (never fall back to production)
  if (process.env.VERCEL_ENV === 'preview') {
    const previewUrl = process.env.PREVIEW_DATABASE_URL;
    if (!previewUrl && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
      throw new Error(
        '[Database Configuration Error] PREVIEW_DATABASE_URL is required for preview deployments. Configure PREVIEW_DATABASE_URL in Vercel project environment variables (scoped to Preview).'
      );
    }
    return previewUrl;
  }

  let url = process.env.DATABASE_URL || process.env.PREVIEW_DATABASE_URL || process.env.TEST_DATABASE_URL;

  // In local development only, inspect .env.local if not already injected
  if (!url && !process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    try {
      const envLocalPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envLocalPath)) {
        const envContent = fs.readFileSync(envLocalPath, 'utf8');
        const testMatch = isTestEnv
          ? envContent.match(/^TEST_DATABASE_URL=(.*)$/m)
          : null;
        const match = testMatch || envContent.match(/^DATABASE_URL=(.*)$/m);
        if (match && match[1]) {
          const parsed = match[1].trim();
          if (parsed && !parsed.startsWith('#')) {
            url = parsed;
          }
        }
      }
    } catch {}
  }

  // Strip surrounding quotes if present
  if (url) {
    url = url.replace(/^["']|["']$/g, '').trim();
  }

  return url;
}

function initDatabase() {
  const url = getDatabaseUrl();

  // 1. Vitest Test Environment Isolation: always use dedicated test PGlite
  if (process.env.VITEST) {
    const { PGlite } = require('@electric-sql/pglite');
    const { drizzle } = require('drizzle-orm/pglite');
    const baseDir = process.env.LOCALAPPDATA || (os.platform() === 'win32' ? os.homedir() : '/tmp');
    const testDir = path.join(baseDir, 'blush_studio_test_pg');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const globalForDb = globalThis as any;
    if (!globalForDb.pgliteInstance) {
      globalForDb.pgliteInstance = new PGlite(testDir);
      globalForDb.dbInstance = drizzle(globalForDb.pgliteInstance, { schema });
    }
    return globalForDb.dbInstance;
  }

  // 2. Production / Cloud PostgreSQL Connection (Neon, Supabase, self-hosted)
  if (url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))) {
    const postgresModule = require('postgres');
    const postgres = postgresModule.default || postgresModule;
    const { drizzle } = require('drizzle-orm/postgres-js');

    const client = postgres(url, {
      max: process.env.NODE_ENV === 'production' ? 10 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Required for Neon / Supabase connection poolers
    });

    return drizzle(client, { schema });
  }

  // 3. In cloud/Vercel mode, require a valid database connection string (no silent mock proxies)
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    const varName = process.env.VERCEL_ENV === 'preview' ? 'PREVIEW_DATABASE_URL' : 'DATABASE_URL';
    throw new Error(
      `[Database Configuration Error] ${varName} is not set or invalid for this deployment. Configure your Neon PostgreSQL connection string in Vercel environment variables.`
    );
  }

  // 4. Local Development Fallback: Embedded PGlite
  const { PGlite } = require('@electric-sql/pglite');
  const { drizzle } = require('drizzle-orm/pglite');

  const baseDir = process.env.LOCALAPPDATA || (os.platform() === 'win32' ? os.homedir() : '/tmp');
  const resolvedPath = path.join(baseDir, 'blush_studio_pg');

  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
  }

  const globalForDb = globalThis as unknown as {
    pgliteInstance?: any;
    dbInstance?: any;
  };

  if (!globalForDb.pgliteInstance) {
    globalForDb.pgliteInstance = new PGlite(resolvedPath);
    globalForDb.dbInstance = drizzle(globalForDb.pgliteInstance, { schema });
  }

  return globalForDb.dbInstance;
}

export async function migrateSchema() {
  try {
    const globalForDb = globalThis as any;
    if (!globalForDb?.pgliteInstance) return;

    await globalForDb.pgliteInstance.ready;

    const migrationDir = path.resolve(process.cwd(), 'drizzle');
    if (!fs.existsSync(migrationDir)) return;

    const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql'));
    for (const file of files) {
      const sqlContent = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      const statements = sqlContent.split('--> statement-breakpoint');
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed) {
          try {
            await globalForDb.pgliteInstance.query(trimmed);
          } catch {
            // ignore duplicate table or type errors
          }
        }
      }
    }
  } catch (err) {
    console.error('Migration error:', err);
  }
}

export const db = initDatabase();
export type Database = typeof db;
