import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function run() {
  const models = await ai.models.list();
  for await (const m of models) {
    if (m.name.includes("embed") || m.name.includes("flash")) {
        console.log(m.name);
    }
  }
}
run();
