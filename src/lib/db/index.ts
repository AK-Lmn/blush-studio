import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import os from 'os';

let dbInstance: any;

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
        connect_timeout: 5,
      });
      return drizzle(client, { schema });
    } catch (err) {
      console.warn('Failed to connect to PostgreSQL via postgres-js, falling back to PGlite:', err);
    }
  }

  // Fallback to embedded PostgreSQL via PGlite
  const { PGlite } = require('@electric-sql/pglite');
  const { drizzle } = require('drizzle-orm/pglite');

  // Store local database in LOCALAPPDATA to avoid OneDrive file locking on Windows
  // Use a dedicated folder for Vitest so test runs never collide with the active dev server
  const folderName = process.env.VITEST ? 'blush_studio_test_pg' : 'blush_studio_pg';
  const resolvedPath = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, folderName)
    : path.join(os.homedir(), `.${folderName}`);

  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
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
