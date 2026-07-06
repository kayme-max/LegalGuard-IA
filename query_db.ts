import { db } from './src/db/db.js';
import { baseConocimiento } from './src/db/schema.js';

async function main() {
  const res = await db.select().from(baseConocimiento).limit(5);
  console.log(res);
  process.exit(0);
}
main();
