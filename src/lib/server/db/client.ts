import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { env } from '$env/dynamic/private';
import { createDatabase } from '../local-db';

export const sqlite = createDatabase({ seed: env.SEED === 'true' });
export const db = drizzle(sqlite);

export type Db = BetterSQLite3Database;
