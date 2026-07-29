import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';

const connectionString = env.DATABASE_URL;

export const db = connectionString ? drizzle(postgres(connectionString, { max: 1 })) : null;
