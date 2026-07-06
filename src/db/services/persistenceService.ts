import { db } from '../db.js';
import { resultadoAnalisis, riesgosIdentificados, tasks } from '../schema.js';
import { eq } from 'drizzle-orm';

export interface AnalysisData {
  nombre_base_proyecto?: string;
  tipo_contrato?: string;
  sector?: string;
  mensaje?: string;
  resumen_ejecutivo?: string;
  url_descarga_excel?: string;
  tiempo_identificacion_riesgo?: string;
  riesgos?: any[];
}

export async function saveAnalysisResultTransaction(
  taskId: string | null,
  analysisData: AnalysisData,
  fullResponse?: any
) {
  return await db.transaction(async (tx) => {
    // 1. Insert resultadoAnalisis
    const [analysis] = await tx.insert(resultadoAnalisis).values({
      nombre_base_proyecto: analysisData.nombre_base_proyecto,
      tipo_contrato: analysisData.tipo_contrato,
      sector: analysisData.sector,
      mensaje: analysisData.mensaje,
      resumen_ejecutivo: analysisData.resumen_ejecutivo,
      url_descarga_excel: analysisData.url_descarga_excel,
      tiempo_identificacion_riesgo: analysisData.tiempo_identificacion_riesgo
    }).returning({ id: resultadoAnalisis.id_analisis });

    // 2. Insert riesgosIdentificados
    if (analysisData.riesgos && Array.isArray(analysisData.riesgos)) {
      const risksToInsert = analysisData.riesgos.map((r: any) => ({
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
        pagina_pdf_licitacion: r.pagina_pdf_licitacion ? String(r.pagina_pdf_licitacion) : null,
        fragmento_licitacion_evidencia: r.fragmento_licitacion_evidencia,
        nombre_archivo_normativa: r.nombre_archivo_normativa,
        evidencia_seccion_normativa_riesgo: r.evidencia_seccion_normativa_riesgo,
        nivel_sustento_documental: r.nivel_sustento_documental
      }));

      if (risksToInsert.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < risksToInsert.length; i += batchSize) {
            const batch = risksToInsert.slice(i, i + batchSize);
            await tx.insert(riesgosIdentificados).values(batch);
        }
      }
    }

    // 3. Update tasks if taskId provided
    if (taskId && fullResponse) {
      fullResponse.id_analisis = analysis.id;
      await tx.update(tasks)
        .set({ 
          status: 'completed', 
          resultado: fullResponse, 
          updated_at: new Date() 
        })
        .where(eq(tasks.id, taskId));
    }

    return analysis.id;
  });
}
