import { GoogleGenAI } from '@google/genai';
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = await genAI.models.list();
  for await (const m of models) {
    if (m.name?.includes('embed')) console.log(m.name);
  }
}
run();
