import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import os from 'os';

let dbInstance: any;

function createMockDb() {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    offset: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    rightJoin: () => chain,
    returning: () => Promise.resolve([]),
    values: () => chain,
    set: () => chain,
    then: (resolve: any, reject: any) => Promise.resolve([]).then(resolve, reject),
    catch: (reject: any) => Promise.resolve([]).catch(reject),
  };

  return {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    transaction: async (cb: any) => cb(createMockDb()),
    query: {
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve([]),
    },
    $client: {},
  };
}

function initDatabase() {
  let url = process.env.DATABASE_URL;

  // Read .env.local dynamically if present so HMR immediately picks up config changes
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const match = envContent.match(/^DATABASE_URL=(.*)$/m);
      if (match && match[1]) {
        const parsed = match[1].trim();
        if (parsed && !parsed.startsWith('#')) {
          url = parsed;
        }
      }
    }
  } catch {}

  // If in production/Vercel without a real PostgreSQL URL, do not attempt to boot PGlite WASM
  const isPostgresUrl = url && (url.startsWith('postgres://') || url.startsWith('postgresql://'));
  if (process.env.VERCEL || (process.env.NODE_ENV === 'production' && !isPostgresUrl)) {
    if (!isPostgresUrl) {
      console.warn('DATABASE_URL is not set on Vercel. Using fallback mock database.');
      return createMockDb();
    }
  }

  url = url || 'pglite://./data/blush_studio_pg';

  // If pointing to localhost:5432 without local Postgres daemon, fallback to embedded PGlite
  if (
    (url.includes('localhost:5432') || url.includes('127.0.0.1:5432')) &&
    process.env.FORCE_POSTGRES !== 'true'
  ) {
    url = 'pglite://./data/blush_studio_pg';
  }

  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    try {
      const postgresModule = require('postgres');
      const postgres = postgresModule.default || postgresModule;
      const { drizzle } = require('drizzle-orm/postgres-js');
      const client = postgres(url, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
      });
      return drizzle(client, { schema });
    } catch (err) {
      console.warn('Failed to connect to PostgreSQL via postgres-js:', err);
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        return createMockDb();
      }
    }
  }

  // Fallback to embedded PostgreSQL via PGlite for local development
  try {
    const { PGlite } = require('@electric-sql/pglite');
    const { drizzle } = require('drizzle-orm/pglite');

    const folderName = process.env.VITEST ? 'blush_studio_test_pg' : 'blush_studio_pg';
    const baseDir = process.env.LOCALAPPDATA || (process.env.VERCEL ? '/tmp' : os.homedir());
    const resolvedPath = path.join(baseDir, folderName);

    if (!fs.existsSync(resolvedPath)) {
      try {
        fs.mkdirSync(resolvedPath, { recursive: true });
      } catch {}
    }

    // Use global to preserve PGlite instance across Next.js HMR in development
    const globalForDb = globalThis as unknown as {
      pgliteInstance?: any;
      dbInstance?: any;
    };

    if (!globalForDb.pgliteInstance) {
      globalForDb.pgliteInstance = new PGlite(resolvedPath);
      globalForDb.dbInstance = drizzle(globalForDb.pgliteInstance, { schema });
    }

    return globalForDb.dbInstance;
  } catch (err) {
    console.warn('PGlite fallback unavailable:', err);
    return createMockDb();
  }
}

export async function migrateSchema() {
  try {
    const globalForDb = globalThis as any;
    if (!globalForDb.pgliteInstance) return;

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
