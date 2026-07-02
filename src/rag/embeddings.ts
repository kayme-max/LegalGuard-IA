import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // To avoid rate limits, we should batch or delay if there are too many, but for now we'll process sequentially or small batches.
  // We'll process them in batches of 5 to avoid overloading the API
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const results = await Promise.all(batch.map(async text => {
        try {
            const result = await genAI.models.embedContent({
                model: 'gemini-embedding-2',
                contents: text,
                config: { outputDimensionality: 768 }
            });
            return result.embeddings && result.embeddings.length > 0 ? result.embeddings[0].values : null;
        } catch (error) {
            console.error("Error generating embedding for chunk:", error);
            return null; // Return null on error, will filter out
        }
    }));
    
    // Add valid embeddings
    embeddings.push(...results as number[][]);
  }
  
  return embeddings;
}
