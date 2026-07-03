import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

export async function auditCoverage(
  systemPrompt: string,
  allDiscoveredRisks: any[]
): Promise<any[]> {
  console.log(`[Phase 8] Coverage Audit`);
  
  const userPrompt = `AUDITORÍA DE COBERTURA (META-ANÁLISIS)
Has detectado los siguientes riesgos hasta ahora:
${JSON.stringify(allDiscoveredRisks.map(r => r.riesgo_identificado), null, 2)}

INSTRUCCIONES:
1. Analiza esta lista y determina si existen áreas evidentes de contratación que parezcan haber sido ignoradas.
2. Si detectas vacíos temáticos, propone CÓMO reportarlos como riesgos de omisión.

Responde ÚNICAMENTE con un arreglo JSON (puede estar vacío):
[
  {
    "riesgo_identificado": "Riesgo de Omisión: ...",
    "foco_revision": "Documento completo",
    "categoria": "Riesgo de Omisión Documental",
    "subcategoria": "...",
    "evidencia_licitacion": "[VACÍO CONTRACTUAL DETECTADO]",
    "justificacion": "..."
  }
]`;

  const result = await genAI.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.2
      }
  });

  try {
      return JSON.parse(result.text || '[]');
  } catch (e) {
      console.error("Error parsing Gemini response:", e);
      return [];
  }
}
