import fs from 'fs';

let content = fs.readFileSync('src/server/server.ts', 'utf8');

// We want to extract everything from `app.get('/api/health'` up to `app.listen`
const startIdx = content.indexOf("app.get('/api/health'");
const endIdx = content.indexOf("app.listen(PORT");
const getEnvIdx = content.indexOf("app.get('/api/env'");

let routesContent = content.substring(startIdx, endIdx);

// Remove the `app.get('*'` which is at the end of routesContent
const wildcardIdx = routesContent.indexOf("app.get('*'");
if (wildcardIdx !== -1) {
  routesContent = routesContent.substring(0, wildcardIdx);
}

// Replace app.get('/api/... with apiRouter.get('/...
routesContent = routesContent.replace(/app\.get\('\/api\//g, "apiRouter.get('/");
routesContent = routesContent.replace(/app\.post\('\/api\//g, "apiRouter.post('/");
routesContent = routesContent.replace(/app\.put\('\/api\//g, "apiRouter.put('/");
routesContent = routesContent.replace(/app\.delete\('\/api\//g, "apiRouter.delete('/");

// Replace the massive analyze-risk body with a call to orchestrateAudit
const analyzeStart = routesContent.indexOf("apiRouter.post('/analyze-risk', upload.fields([");
const analyzeEnd = routesContent.indexOf("apiRouter.get('/config-prompts'");

let analyzeRiskReplacement = `apiRouter.post('/analyze-risk', upload.fields([
  { name: 'mainDoc', maxCount: 20 },
  { name: 'normativas', maxCount: 30 }
]), async (req, res) => {
  try {
    const { sector, tipoContrato, categoria, subcategoria, promptContexto, nombreProyecto } = req.body;
    const files = req.files;

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
`;

routesContent = routesContent.substring(0, analyzeStart) + analyzeRiskReplacement + routesContent.substring(analyzeEnd);

// Add imports for routes.ts
const routesFile = `
import { Router } from 'express';
import { db } from '../db/db.js';
import { resultadoAnalisis, baseConocimiento, riesgosIdentificados, tiposContrato, tasks } from '../db/schema.js';
import { eq, sql, and, or, inArray, ilike } from 'drizzle-orm';
import crypto from 'crypto';
import { generateRagResponse } from '../rag/ragService.js';
import { orchestrateAudit } from '../rag/auditEngine.js';
import { upload } from './middleware.js';

export const apiRouter = Router();

${routesContent}
`;

fs.writeFileSync('src/server/routes.ts', routesFile);
