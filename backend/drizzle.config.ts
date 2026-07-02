import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
dotenv.config();

export default defineConfig({
  schema: './backend/src/db/schema.ts',
  out: './backend/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.SQL_HOST!,
    user: process.env.SQL_ADMIN_USER!,
    password: process.env.SQL_ADMIN_PASSWORD!,
    database: process.env.SQL_DB_NAME!,
    ssl: false,
  },
});
