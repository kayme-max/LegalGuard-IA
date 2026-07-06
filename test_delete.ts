import { db } from './src/db/db.js';
import { baseConocimiento } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function main() {
  const res = await db.select().from(baseConocimiento).where(eq(baseConocimiento.numero_riesgo, '#OXI-00005'));
  console.log("Riesgo #OXI-00005:", res);
  process.exit(0);
}
main();
