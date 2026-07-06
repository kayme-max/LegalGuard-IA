const fs = require('fs');

let content = fs.readFileSync('src/rag/auditEngine.ts', 'utf8');

// Add import
const importStatement = "import { saveAnalysisResultTransaction } from '../db/services/persistenceService.js';\n";
if (!content.includes('saveAnalysisResultTransaction')) {
  content = content.replace("import crypto from 'crypto';", "import crypto from 'crypto';\n" + importStatement);
}

// Replace DB update logic
const targetLogic = `    await clearSessionChunks(sessionId);
    await db.update(tasks).set({ status: 'completed', resultado: fullResponse, updated_at: new Date() }).where(eq(tasks.id, taskId));

  } catch (error: any) {`;

const newLogic = `    await clearSessionChunks(sessionId);

    // Save to DB and update task status atomically
    const analysisData = {
      nombre_base_proyecto: nombreProyecto || 'Proyecto de Licitación',
      tipo_contrato: tipoContrato || '',
      sector: sectorArr.join(', '),
      mensaje: fullResponse.mensaje,
      resumen_ejecutivo: fullResponse.resultado.resumen_ejecutivo,
      url_descarga_excel: '',
      tiempo_identificacion_riesgo: '',
      riesgos: finalEvaluatedRisks
    };
    
    await saveAnalysisResultTransaction(taskId, analysisData, fullResponse);

  } catch (error: any) {`;

content = content.replace(targetLogic, newLogic);
fs.writeFileSync('src/rag/auditEngine.ts', content);
