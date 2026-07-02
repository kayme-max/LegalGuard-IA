import { GoogleGenAI } from '@google/genai';
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const result = await genAI.models.embedContent({
    model: 'gemini-embedding-2',
    contents: 'hello',
    config: { outputDimensionality: 768 }
  });
  console.log(result.embeddings?.[0]?.values?.length);
}
run();
