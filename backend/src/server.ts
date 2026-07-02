import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { GoogleGenAI } from '@google/genai';
import { generateRagResponse } from './rag/ragService.js';
import { db } from './db/db.js';
import { resultadoAnalisis, baseConocimiento, riesgosIdentificados, tiposContrato, tasks } from './db/schema.js';
import { eq, sql, and, or, inArray, ilike } from 'drizzle-orm';
import { RISK_ANALYSIS_SYSTEM_PROMPT, constructAnalysisPrompt } from './prompts/analysisPrompt.js';

import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? (process.env.PORT || 3000) : 3002;

// Configure Gemini
const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Serve static frontend files in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (isProduction) {
  // In production, the compiled file is inside dist/
  const frontendPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
}

// Helper to extract text from PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
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
    throw new Error('Estructura de PDF inválida o corrupta. No se pudo extraer el texto.');
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.post('/api/rag/query', async (req, res) => {
  try {
    const { query, contextIds } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    const response = await generateRagResponse(query, contextIds);
    res.json({ response });
  } catch (error: any) {
    console.error('Error in RAG query:', error);
    res.status(500).json({ error: 'Failed to process RAG query', details: error.message });
  }
});

// HISTORIAL ANALISIS
app.get('/api/historial_analisis', async (req, res) => {
  try {
    const records = await db.select().from(resultadoAnalisis);
    res.json(records);
  } catch (error: any) {
    console.error('Error fetching historial:', error);
    res.status(500).json({ error: 'Failed to fetch historial' });
  }
});

app.get('/api/historial/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Basic UUID validation to prevent PostgresError
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(404).json({ error: 'Not found (invalid ID format)' });
    }

    const records = await db.select().from(resultadoAnalisis).where(eq(resultadoAnalisis.id_analisis, id));
    if (records.length === 0) return res.status(404).json({ error: 'Not found' });
    
    const item = records[0];
    const id_analisis = item.id_analisis;

    // Fetch identified risks for this analysis
    const identifiedRisks = await db.select().from(riesgosIdentificados).where(eq(riesgosIdentificados.id_analisis, id_analisis));
    
    res.json({
      id_analisis: item.id_analisis,
      fecha_creacion: item.created_at,
      nombre_base_proyecto: item.nombre_base_proyecto,
      sector: item.sector,
      tipo_contrato: item.tipo_contrato,
      mensaje: item.mensaje,
      resumen_ejecutivo: item.resumen_ejecutivo,
      url_descarga_excel: item.url_descarga_excel,
      tiempo_identificacion_riesgo: item.tiempo_identificacion_riesgo,
      riesgos: identifiedRisks
    });
  } catch (error: any) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

app.post('/api/historial_analisis', async (req, res) => {
  try {
    const { 
      nombre_base_proyecto, 
      tipo_contrato, 
      sector, 
      mensaje, 
      resumen_ejecutivo, 
      url_descarga_excel, 
      tiempo_identificacion_riesgo,
      riesgos // Array of risks to identify
    } = req.body;
    
    const [analysis] = await db.insert(resultadoAnalisis).values({
      nombre_base_proyecto,
      tipo_contrato,
      sector,
      mensaje,
      resumen_ejecutivo,
      url_descarga_excel,
      tiempo_identificacion_riesgo
    }).returning({ id: resultadoAnalisis.id_analisis });

    if (riesgos && Array.isArray(riesgos)) {
      const risksToInsert = riesgos.map((r: any) => ({
        id_analisis: analysis.id,
        riesgo_id: r.riesgo_id,
        tipo_contrato: r.tipo_contrato,
        sector: r.sector,
        categoria: r.categoria,
        subcategoria: r.subcategoria,
        riesgo_identificado: r.riesgo_identificado,
        foco_revision: r.foco_revision,
        nombre_archivo_licitacion: r.nombre_archivo_licitacion,
        seccion_evidencia_licitacion: r.seccion_evidencia_licitacion,
        pagina_pdf_licitacion: r.pagina_pdf_licitacion,
        fragmento_licitacion_evidencia: r.fragmento_licitacion_evidencia,
        nombre_archivo_normativa: r.nombre_archivo_normativa,
        evidencia_seccion_normativa_riesgo: r.evidencia_seccion_normativa_riesgo,
        nivel_sustento_documental: r.nivel_sustento_documental
      }));

      if (risksToInsert.length > 0) {
        await db.insert(riesgosIdentificados).values(risksToInsert);
      }
    }

    res.json({ id: analysis.id });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.delete('/api/historial_analisis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Delete identified risks first
    await db.delete(riesgosIdentificados).where(eq(riesgosIdentificados.id_analisis, id));
    await db.delete(resultadoAnalisis).where(eq(resultadoAnalisis.id_analisis, id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

app.put('/api/historial_analisis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    await db.update(resultadoAnalisis).set({
      nombre_base_proyecto: body.nombre_base_proyecto,
      tipo_contrato: body.tipo_contrato,
      sector: body.sector,
      mensaje: body.mensaje,
      resumen_ejecutivo: body.resumen_ejecutivo,
      url_descarga_excel: body.url_descarga_excel,
      tiempo_identificacion_riesgo: body.tiempo_identificacion_riesgo,
      updated_at: new Date()
    }).where(eq(resultadoAnalisis.id_analisis, id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// BASE CONOCIMIENTO
app.get('/api/base_conocimiento_riesgos', async (req, res) => {
  try {
    const records = await db.select().from(baseConocimiento);
    res.json(records);
  } catch (error: any) {
    console.error('Error fetching riesgos:', error);
    res.status(500).json({ error: 'Failed to fetch riesgos' });
  }
});

app.post('/api/base_conocimiento_riesgos', async (req, res) => {
  try {
    const body = req.body;
    const id = body.id || body.riesgo_id || crypto.randomUUID();
    await db.insert(baseConocimiento).values({
      id,
      numero_riesgo: body.numero_riesgo,
      sector: body.sector,
      tipo_contrato: body.tipo_contrato,
      categoria: body.categoria,
      subcategoria: body.subcategoria,
      riesgo_identificado: body.riesgo_identificado,
      foco_revision: body.foco_revision,
      criticidad: body.criticidad,
    });
    res.json({ id });
  } catch (error: any) {
    console.error('Error creating riesgo:', error);
    res.status(500).json({ error: 'Failed to create riesgo' });
  }
});

app.put('/api/base_conocimiento_riesgos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    await db.update(baseConocimiento).set({
      numero_riesgo: body.numero_riesgo,
      sector: body.sector,
      tipo_contrato: body.tipo_contrato,
      categoria: body.categoria,
      subcategoria: body.subcategoria,
      riesgo_identificado: body.riesgo_identificado,
      foco_revision: body.foco_revision,
      criticidad: body.criticidad,
      updated_at: new Date()
    }).where(eq(baseConocimiento.id, id));
    res.json({ id });
  } catch (error: any) {
    console.error('Error updating riesgo:', error);
    res.status(500).json({ error: 'Failed to update riesgo' });
  }
});

app.delete('/api/base_conocimiento_riesgos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(baseConocimiento).where(eq(baseConocimiento.id, id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting riesgo:', error);
    res.status(500).json({ error: 'Failed to delete riesgo' });
  }
});

import { chunkText } from './rag/chunking.js';
import { indexDocumentChunks, retrieveRelevantChunks, clearSessionChunks } from './rag/vectorStore.js';

// RISK ANALYSIS API

app.get('/api/analyze-risk/status/:taskId', async (req, res) => {
    try {
      const taskResults = await db.select().from(tasks).where(eq(tasks.id, req.params.taskId)).limit(1);
      const task = taskResults[0];
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json({
        id: task.id,
        status: task.status,
        result: task.resultado,
        error: task.error,
        created_at: task.created_at,
        updated_at: task.updated_at
      });
    } catch (err) {
      console.error('Error fetching task status:', err);
      res.status(500).json({ error: 'Failed to fetch task status' });
    }
});

app.post('/api/analyze-risk', upload.fields([
  { name: 'mainDoc', maxCount: 20 },
  { name: 'normativas', maxCount: 30 }
]), async (req, res) => {
  try {
    const { sector, tipoContrato, categoria, subcategoria, promptContexto, nombreProyecto } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files || !files['mainDoc'] || files['mainDoc'].length === 0) {
      return res.status(400).json({ error: 'Faltan documentos principales para el análisis.' });
    }

    const sessionId = crypto.randomUUID();
    
    // Create pending task in DB
    let taskId = '';
    try {
      const insertResult = await db.insert(tasks).values({
        status: 'pending'
      }).returning({ id: tasks.id });
      taskId = insertResult[0].id;
    } catch (err: any) {
      console.error('Failed to create task:', err);
      return res.status(500).json({ error: 'Failed to start analysis task.' });
    }
    
    res.json({ taskId, status: 'pending' });

    // Run asynchronously
    (async () => {
      try {
        await db.update(tasks).set({ status: 'processing', updated_at: new Date() }).where(eq(tasks.id, taskId));

        // 1. Extract text and Chunk
        console.log(`[API Task ${taskId}] Start processing mainDoc files...`);
        let mainDocText = '';
        for (const file of files['mainDoc']) {
          console.log(`[API Task ${taskId}] Extracting text from PDF: ${file.originalname}`);
          const text = await extractTextFromPDF(file.buffer);
          console.log(`[API Task ${taskId}] Characters extracted from ${file.originalname}: ${text.length}`);
          console.log(`[API Task ${taskId}] Chunking text...`);
          const chunks = chunkText(text);
          console.log(`[API Task ${taskId}] Indexing ${chunks.length} chunks...`);
          await indexDocumentChunks(sessionId, file.originalname, 'licitacion', chunks);
          console.log(`[API Task ${taskId}] Indexed chunks in pgvector for ${file.originalname}: ${chunks.length}`);
        }

        console.log(`[API Task ${taskId}] Start processing normativas files...`);
        let normativasText = '';
        if (files['normativas']) {
          for (const file of files['normativas']) {
            console.log(`[API Task ${taskId}] Extracting text from PDF: ${file.originalname}`);
            const text = await extractTextFromPDF(file.buffer);
            console.log(`[API Task ${taskId}] Characters extracted from ${file.originalname}: ${text.length}`);
            console.log(`[API Task ${taskId}] Chunking text...`);
            const chunks = chunkText(text);
            console.log(`[API Task ${taskId}] Indexing ${chunks.length} chunks...`);
            await indexDocumentChunks(sessionId, file.originalname, 'normativa', chunks);
            console.log(`[API Task ${taskId}] Indexed chunks in pgvector for ${file.originalname}: ${chunks.length}`);
          }
        }

        console.log(`[API Task ${taskId}] Querying Knowledge Base with filters...`);
        // 2. Query Knowledge Base with filters
        const sectorArr = typeof sector === 'string' ? sector.split(',').map(s => s.trim()) : (Array.isArray(sector) ? sector : []);
        const categoriaArr = typeof categoria === 'string' ? categoria.split(',').map(c => c.trim()) : (Array.isArray(categoria) ? categoria : []);
        const subcategoriaArr = typeof subcategoria === 'string' ? subcategoria.split(',').map(s => s.trim()) : (Array.isArray(subcategoria) ? subcategoria : []);
        const proyectoStr = typeof nombreProyecto === 'string' ? nombreProyecto : '';

        console.log(`[API Task ${taskId}] Filtros recibidos:`);
        console.log(`  - tipoContrato: ${tipoContrato}`);
        console.log(`  - proyecto: ${proyectoStr}`);
        console.log(`  - sector: ${JSON.stringify(sectorArr)}`);
        console.log(`  - categoria: ${JSON.stringify(categoriaArr)}`);
        console.log(`  - subcategoria: ${JSON.stringify(subcategoriaArr)}`);

        let query = db.select().from(baseConocimiento);
        
        const conditions = [];

        if (tipoContrato && tipoContrato !== 'ALL') {
          conditions.push(ilike(baseConocimiento.tipo_contrato, `%${tipoContrato}%`));
        }
        
        if (proyectoStr && proyectoStr.trim() !== '') {
          conditions.push(ilike(baseConocimiento.nombre_archivo_licitacion, `%${proyectoStr}%`));
        }

        if (sectorArr.length > 0 && !sectorArr.includes('ALL')) {
          const sectorOrs = sectorArr.map(s => ilike(baseConocimiento.sector, `%${s}%`));
          conditions.push(or(...sectorOrs));
        }

        if (categoriaArr.length > 0 && !categoriaArr.includes('ALL')) {
          const catOrs = categoriaArr.map(c => ilike(baseConocimiento.categoria, `%${c}%`));
          conditions.push(or(...catOrs));
        }

        if (subcategoriaArr.length > 0 && !subcategoriaArr.includes('ALL')) {
          const subOrs = subcategoriaArr.map(s => ilike(baseConocimiento.subcategoria, `%${s}%`));
          conditions.push(or(...subOrs));
        }

        console.log(`[API Task ${taskId}] Query SQL (filtros): ${conditions.length} condiciones aplicadas.`);

        const kbRisks = conditions.length > 0 
          ? await query.where(and(...conditions))
          : await query;

        console.log(`[API Task ${taskId}] KB Risks fetched: ${kbRisks.length}`);

        // 2.1 Fetch specific system prompt for this contract type if it exists
        let dynamicSystemPrompt = RISK_ANALYSIS_SYSTEM_PROMPT;
        if (tipoContrato) {
          console.log(`[API Task ${taskId}] Fetching custom system prompt for ${tipoContrato}...`);
          const customPromptResult = await db.select()
            .from(tiposContrato)
            .where(eq(tiposContrato.nombre, tipoContrato))
            .limit(1);
          
          if (customPromptResult.length > 0 && customPromptResult[0].prompt_sistema) {
            dynamicSystemPrompt = customPromptResult[0].prompt_sistema;
            console.log(`Using custom system prompt for contract type: ${tipoContrato}`);
          }
        }

        // 3. Evaluate KB Risks through Domain Audits
        // Dynamically import auditEngine to avoid circular deps if any
        console.log(`[API Task ${taskId}] Importing auditEngine...`);
        const { runFullLegalAudit } = await import('./rag/auditEngine.js');
        
        console.log(`[API Task ${taskId}] Starting full legal audit with ${kbRisks.length} KB risks...`);
        const metadata = {
            tipoContrato: tipoContrato || 'N/A',
            sectorArr
        };
        
        const finalEvaluatedRisks = await runFullLegalAudit(
            sessionId,
            kbRisks,
            dynamicSystemPrompt,
            promptContexto || '',
            metadata
        );
        console.log(`[API Task ${taskId}] Audit finished, found ${finalEvaluatedRisks.length} risks.`);

        // Wrap in BackendResponse structure
        const fullResponse = {
          archivo_licitacion: files['mainDoc'].map(f => f.originalname).join(', '),
          normativas_cargadas: files['normativas'] ? files['normativas'].map(f => f.originalname) : [],
          proyecto: nombreProyecto || 'Proyecto de Licitación',
          sector: sectorArr.join(', '),
          categoria: categoriaArr.join(', '),
          origen_data: 'Motor Híbrido RAG',
          status: 'success',
          mensaje: `Auditoría exhaustiva completada exitosamente. Se detectaron ${finalEvaluatedRisks.length} riesgos.`,
          id_analisis: crypto.randomUUID(),
          resultado: {
            riesgos_detectados: finalEvaluatedRisks,
            resumen_ejecutivo: `Se ha realizado una auditoría exhaustiva simulando un Comité de Abogados Senior. El análisis procesó ${kbRisks.length} riesgos de la base de conocimiento histórica y exploró proactivamente vacíos, omisiones y riesgos transversales. En total se reportan ${finalEvaluatedRisks.length} riesgos clasificados.`
          }
        };

        console.log(`[API Task ${taskId}] Cleaning up chunks...`);
        // Clean up indexed chunks
        await clearSessionChunks(sessionId);

        console.log(`[API Task ${taskId}] Task completed.`);
        await db.update(tasks).set({ status: 'completed', resultado: fullResponse, updated_at: new Date() }).where(eq(tasks.id, taskId));
      } catch (error: any) {
        console.error(`[API Task ${taskId}] Error:`, error);
        await db.update(tasks).set({ status: 'error', error: error.message || 'Error desconocido durante el análisis.', updated_at: new Date() }).where(eq(tasks.id, taskId));
      }
    })();
  } catch (error: any) {
    console.error('Error starting risk analysis:', error);
    res.status(500).json({ error: 'Error al iniciar el análisis.', details: error.message });
  }
});

app.get('/api/config-prompts', async (req, res) => {
  try {
    const prompts = await db.select().from(tiposContrato);
    // Map back to the previous structure for frontend compatibility if needed, 
    // or update frontend too. I'll update frontend.
    res.json(prompts.map(p => ({
      id: p.id,
      tipo_contrato: p.nombre,
      prompt_interno: p.prompt_sistema,
      created_at: p.created_at,
      updated_at: p.updated_at
    })));
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener los prompts configurados.', details: error.message });
  }
});

app.post('/api/config-prompts', async (req, res) => {
  try {
    const { tipo_contrato, prompt_interno } = req.body;
    if (!tipo_contrato || !prompt_interno) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (tipo_contrato, prompt_interno).' });
    }
    const result = await db.insert(tiposContrato).values({
      nombre: tipo_contrato,
      prompt_sistema: prompt_interno
    }).returning();
    res.json({
      id: result[0].id,
      tipo_contrato: result[0].nombre,
      prompt_interno: result[0].prompt_sistema,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al guardar el prompt.', details: error.message });
  }
});

app.put('/api/config-prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_contrato, prompt_interno } = req.body;
    const result = await db.update(tiposContrato)
      .set({ 
        nombre: tipo_contrato, 
        prompt_sistema: prompt_interno, 
        updated_at: new Date() 
      })
      .where(eq(tiposContrato.id, id))
      .returning();
    res.json({
      id: result[0].id,
      tipo_contrato: result[0].nombre,
      prompt_interno: result[0].prompt_sistema,
      created_at: result[0].created_at,
      updated_at: result[0].updated_at
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar el prompt.', details: error.message });
  }
});

app.delete('/api/config-prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(tiposContrato).where(eq(tiposContrato.id, id));
    res.json({ message: 'Prompt eliminado correctamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar el prompt.', details: error.message });
  }
});

app.get('/api/env', (req, res) => {
  res.json({ DATABASE_URL: process.env.DATABASE_URL || 'NOT SET' });
});

if (isProduction) {
  const frontendPath = path.resolve(__dirname, '../../frontend/dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
