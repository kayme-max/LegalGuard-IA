import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const dbConfig = {
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
};

if (!dbConfig.host || !dbConfig.database || !dbConfig.user) {
  console.warn('SQL_* environment variables are not fully set. Database operations might fail.');
}

const client = postgres(dbConfig);
export const db = drizzle(client, { schema });
