const fs = require('fs');

let content = fs.readFileSync('src/server/routes.ts', 'utf8');

// Add import
const importStatement = "import { saveAnalysisResultTransaction } from '../db/services/persistenceService.js';\n";
if (!content.includes('saveAnalysisResultTransaction')) {
  content = content.replace("import { db } from '../db/db.js';", "import { db } from '../db/db.js';\n" + importStatement);
}

// Replace POST /historial_analisis
const postLogic = `apiRouter.post('/historial_analisis', async (req, res) => {
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
});`;

const newPostLogic = `apiRouter.post('/historial_analisis', async (req, res) => {
  try {
    const analysisData = req.body;
    
    // We pass null for taskId because this endpoint only saves history, 
    // it doesn't correspond to a background task execution.
    const analysisId = await saveAnalysisResultTransaction(null, analysisData);

    res.json({ id: analysisId });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});`;

content = content.replace(postLogic, newPostLogic);
fs.writeFileSync('src/server/routes.ts', content);
