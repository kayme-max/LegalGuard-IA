import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Procesa un archivo PDF en lotes de páginas para no saturar la memoria.
 * Extrae el texto, lo junta y ejecuta el callback processBatchCallback.
 */
export async function processPDFInBatches(filePath: string, batchSize: number = 20, processBatchCallback: (textBatch: string) => Promise<void>): Promise<void> {
  // Leemos el archivo a un buffer (aún lo carga todo en memoria, pero pdfjs permite instanciar desde buffer y destruir objetos).
  // Nota: pdfjs-dist getDocument({ url }) en Node con rutas locales a veces falla dependiendo de la versión,
  // por lo que usamos el buffer pero liberamos agresivamente cada página.
  const data = new Uint8Array(fs.readFileSync(filePath));
  
  const loadingTask = pdfjsLib.getDocument({ 
    data, 
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false
  });
  
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  
  let currentBatchText: string[] = [];
  
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    currentBatchText.push(strings.join(' '));
    
    // Liberar recursos de esta página de la memoria
    page.cleanup();
    
    if (pageNum % batchSize === 0 || pageNum === numPages) {
      const textBatch = currentBatchText.join('\n\n');
      if (textBatch.trim()) {
        await processBatchCallback(textBatch);
      }
      // Limpiar el lote procesado de la memoria
      currentBatchText = [];
    }
  }
  
  // Limpiar recursos principales del documento PDF
  await doc.destroy();
}

// Mantenemos esta por si acaso, pero idealmente usamos la nueva de batches
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Re-implemented to use pdfjsLib directly instead of pdf-parse to reduce dependencies 
  // and have similar behavior to the batch function.
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data });
  const doc = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
    page.cleanup();
  }
  await doc.destroy();
  
  if (!fullText.trim()) {
    throw new Error("El documento PDF está vacío o no contiene texto extraíble.");
  }
  return fullText;
}
