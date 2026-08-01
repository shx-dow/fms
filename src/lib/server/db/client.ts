import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { dev } from '$app/environment';
import { createDatabase } from '../local-db';

export const sqlite = createDatabase({ seed: dev });
export const db = drizzle(sqlite);

export type Db = BetterSQLite3Database;
