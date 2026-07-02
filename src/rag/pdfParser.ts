import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new Error("El documento PDF está vacío o no contiene texto extraíble.");
    }
    return data.text;
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    if (error.message.includes("vacío")) {
      throw error;
    }
    throw new Error('Error al extraer texto del PDF. Asegúrese de que el archivo no esté corrupto o encriptado.');
  }
}
