import { GoogleGenAI } from '@google/genai';
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const result = await genAI.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: 'hello',
    });
    console.log(result.text);
  } catch (e) {
    console.log("ERROR CODE:", e.status);
    console.log("ERROR MESSAGE:", e.message);
  }
}
run();
