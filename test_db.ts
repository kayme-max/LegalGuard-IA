import { db } from './backend/src/db/db.js';
import { baseConocimiento } from './backend/src/db/schema.js';
async function test() {
  try {
    const res = await db.select().from(baseConocimiento).limit(1);
    console.log("Success:", res.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
