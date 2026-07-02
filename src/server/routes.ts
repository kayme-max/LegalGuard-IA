
import { Router } from 'express';
import { db } from '../db/db.js';
import { resultadoAnalisis, baseConocimiento, riesgosIdentificados, tiposContrato, tasks } from '../db/schema.js';
import { eq, sql, and, or, inArray, ilike } from 'drizzle-orm';
import crypto from 'crypto';
import { generateRagResponse } from '../rag/ragService.js';
import { orchestrateAudit } from '../rag/auditEngine.js';
import { upload } from './middleware.js';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

apiRouter.post('/rag/query', async (req, res) => {
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
apiRouter.get('/historial_analisis', async (req, res) => {
  try {
    const records = await db.select().from(resultadoAnalisis);
    res.json(records);
  } catch (error: any) {
    console.error('Error fetching historial:', error);
    res.status(500).json({ error: 'Failed to fetch historial' });
  }
});

apiRouter.get('/historial/:id', async (req, res) => {
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

apiRouter.post('/historial_analisis', async (req, res) => {
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

apiRouter.delete('/historial_analisis/:id', async (req, res) => {
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

apiRouter.put('/historial_analisis/:id', async (req, res) => {
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
apiRouter.get('/base_conocimiento_riesgos', async (req, res) => {
  try {
    const records = await db.select().from(baseConocimiento);
    res.json(records);
  } catch (error: any) {
    console.error('Error fetching riesgos:', error);
    res.status(500).json({ error: 'Failed to fetch riesgos' });
  }
});

apiRouter.post('/base_conocimiento_riesgos', async (req, res) => {
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

apiRouter.put('/base_conocimiento_riesgos/:id', async (req, res) => {
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

apiRouter.delete('/base_conocimiento_riesgos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(baseConocimiento).where(eq(baseConocimiento.id, id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting riesgo:', error);
    res.status(500).json({ error: 'Failed to delete riesgo' });
  }
});



// RISK ANALYSIS API

apiRouter.get('/analyze-risk/status/:taskId', async (req, res) => {
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

apiRouter.post('/analyze-risk', upload.fields([
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
    let taskId = '';
    try {
      const insertResult = await db.insert(tasks).values({
        status: 'pending'
      }).returning({ id: tasks.id });
      taskId = insertResult[0].id;
    } catch (err) {
      console.error('Failed to create task:', err);
      return res.status(500).json({ error: 'Failed to start analysis task.' });
    }

    res.json({ taskId, status: 'pending' });

    // Run asynchronously orchestrated in AuditEngine
    orchestrateAudit(taskId, sessionId, files, req.body);
  } catch (error) {
    console.error('Error starting risk analysis:', error);
    res.status(500).json({ error: 'Error al iniciar el análisis.' });
  }
});
apiRouter.get('/config-prompts', async (req, res) => {
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

apiRouter.post('/config-prompts', async (req, res) => {
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

apiRouter.put('/config-prompts/:id', async (req, res) => {
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

apiRouter.delete('/config-prompts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(tiposContrato).where(eq(tiposContrato.id, id));
    res.json({ message: 'Prompt eliminado correctamente.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar el prompt.', details: error.message });
  }
});

apiRouter.get('/env', (req, res) => {
  res.json({ DATABASE_URL: process.env.DATABASE_URL || 'NOT SET' });
});
