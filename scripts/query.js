import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
const sql = postgres({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});
async function run() {
  const res = await sql`SELECT id, tipo_contrato, sector, categoria, subcategoria FROM base_conocimiento LIMIT 10`;
  console.log("DB Rows:", res);
  process.exit(0);
}
run();
