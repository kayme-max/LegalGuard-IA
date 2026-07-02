import { GoogleGenAI } from '@google/genai';
import { retrieveMultiQueryChunks, retrieveRelevantChunks } from './vectorStore.js';
import { groupRisksByDomain } from './domains.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

// Helper to interact with Gemini ensuring JSON output
async function callGemini(systemPrompt: string, userPrompt: string, model: string = 'gemini-3.5-flash') {
    const result = await genAI.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.2 // Lower temp for more deterministic auditing
        }
    });

    try {
        return JSON.parse(result.text || '[]');
    } catch (e) {
        console.error("Error parsing Gemini response:", e);
        return [];
    }
}

async function auditDomainRisks(
    domain: string,
    risks: any[],
    sessionId: string,
    systemPrompt: string,
    userContext: string
): Promise<any[]> {
    console.log(`[Phase 4 & 5] Auditing domain: ${domain} with ${risks.length} KB risks`);
    
    // Generate queries for the domain based on risks
    const queries = risks.map(r => `${r.riesgo_identificado} ${r.foco_revision} ${r.categoria || ''} ${r.subcategoria || ''}`);
    // Add generic domain queries
    queries.push(`Riesgos legales y contractuales relacionados con ${domain}`);

    // Retrieve chunks (Phase 4)
    const licitacionChunks = await retrieveMultiQueryChunks(sessionId, queries, 'licitacion', 3, 20);
    const normativaChunks = await retrieveMultiQueryChunks(sessionId, queries, 'normativa', 2, 10);

    const licitacionContext = licitacionChunks.map((c, i) => `[Licitación ${i+1}] ${c}`).join('\n\n');
    const normativaContext = normativaChunks.map((c, i) => `[Normativa ${i+1}] ${c}`).join('\n\n');

    // Phase 5 prompt
    const userPrompt = `
DOMINIO A AUDITAR: ${domain}

CONTEXTO ADICIONAL:
${userContext}

RIESGOS HISTÓRICOS A EVALUAR (Base de Conocimiento):
${JSON.stringify(risks.map(r => ({ id: r.id, riesgo: r.riesgo_identificado, foco: r.foco_revision })), null, 2)}

EVIDENCIA - FRAGMENTOS DE LICITACIÓN RECUPERADOS:
${licitacionContext}

EVIDENCIA - FRAGMENTOS DE NORMATIVA RECUPERADOS:
${normativaContext}

INSTRUCCIONES DE AUDITORÍA:
1. Revisa los fragmentos para cada uno de los riesgos listados.
2. Determina el estado: "ACTIVADO", "PARCIALMENTE ACTIVADO", o "NO APLICA".
3. Proporciona una justificación rigurosa.
4. Extrae la cita textual exacta de la licitación y la normativa.
5. Si identificas que la licitación omite un tema crítico del riesgo, indícalo como [VACÍO CONTRACTUAL DETECTADO] en la evidencia.
6. NUNCA inventes evidencia.

Responde ÚNICAMENTE con un arreglo JSON:
[
  {
    "id": "ID del riesgo evaluado",
    "estado": "ACTIVADO | PARCIALMENTE ACTIVADO | NO APLICA",
    "justificacion": "...",
    "evidencia_licitacion": "...",
    "evidencia_normativa": "..."
  }
]`;

    return callGemini(systemPrompt, userPrompt, 'gemini-3.5-flash');
}

async function auditComplementaryDomainRisks(
    domain: string,
    sessionId: string,
    systemPrompt: string,
    userContext: string
): Promise<any[]> {
    console.log(`[Phase 6] Auditing complementary risks for domain: ${domain}`);
    
    // Retrieve chunks specifically searching for gaps or excessive clauses in this domain
    const queries = [
        `vacíos, omisiones, ambigüedades en ${domain}`,
        `obligaciones excesivas, responsabilidades desproporcionadas en ${domain}`,
        `contradicciones, penalidades extremas en ${domain}`
    ];
    
    const licitacionChunks = await retrieveMultiQueryChunks(sessionId, queries, 'licitacion', 5, 15);
    const licitacionContext = licitacionChunks.map((c, i) => `[Licitación ${i+1}] ${c}`).join('\n\n');

    const userPrompt = `
DOMINIO AUDITADO: ${domain}

CONTEXTO ADICIONAL:
${userContext}

EVIDENCIA SELECCIONADA POR ALTO POTENCIAL DE RIESGO OCULTO:
${licitacionContext}

INSTRUCCIONES DE AUDITORÍA COMPLEMENTARIA:
1. Revisa estos fragmentos de la licitación buscando RIESGOS NUEVOS relacionados con ${domain} que no se deriven de la base de conocimiento histórica.
2. Busca vacíos contractuales, contradicciones, obligaciones excesivas o penalidades ocultas.
3. Cada riesgo debe ser independiente (no los agrupes).

Responde ÚNICAMENTE con un arreglo JSON (puede estar vacío):
[
  {
    "riesgo_identificado": "Título corto y claro del nuevo riesgo",
    "foco_revision": "Cláusula afectada o concepto (ej. Cláusula 5.2)",
    "categoria": "${domain}",
    "subcategoria": "Específica",
    "evidencia_licitacion": "Cita textual o [VACÍO CONTRACTUAL DETECTADO]",
    "justificacion": "Por qué es riesgoso"
  }
]`;

    return callGemini(systemPrompt, userPrompt, 'gemini-3.5-flash');
}

async function auditTransversal(
    sessionId: string,
    systemPrompt: string,
    userContext: string
): Promise<any[]> {
    console.log(`[Phase 7] Transversal Audit (Completely new cross-domain risks)`);
    
    const queries = [
        "riesgos implícitos, vacíos documentales generales, contradicciones entre anexos",
        "riesgos económicos generales, desequilibrio financiero",
        "riesgos técnicos graves, especificaciones inalcanzables",
        "nulidad de contrato, terminación anticipada, fuerza mayor"
    ];
    
    const licitacionChunks = await retrieveMultiQueryChunks(sessionId, queries, 'licitacion', 5, 20);
    const licitacionContext = licitacionChunks.map((c, i) => `[Licitación ${i+1}] ${c}`).join('\n\n');

    const userPrompt = `
AUDITORÍA TRANSVERSAL INDEPENDIENTE

CONTEXTO:
${userContext}

EVIDENCIA TRANSVERSAL RECUPERADA:
${licitacionContext}

INSTRUCCIONES:
1. Realiza una auditoría completamente independiente de la licitación buscando riesgos ocultos, transversales y atípicos que no encajen en categorías estándar.
2. Identifica contradicciones entre documentos/anexos, obligaciones indeterminadas, o desequilibrios extremos.

Responde ÚNICAMENTE con un arreglo JSON (puede estar vacío):
[
  {
    "riesgo_identificado": "...",
    "foco_revision": "...",
    "categoria": "Riesgo Transversal",
    "subcategoria": "...",
    "evidencia_licitacion": "...",
    "justificacion": "..."
  }
]`;

    return callGemini(systemPrompt, userPrompt, 'gemini-3.5-flash');
}

async function auditCoverage(
    systemPrompt: string,
    allDiscoveredRisks: any[]
): Promise<any[]> {
    console.log(`[Phase 8] Coverage Audit`);
    
    const userPrompt = `
AUDITORÍA DE COBERTURA (META-ANÁLISIS)

Has detectado los siguientes riesgos hasta ahora:
${JSON.stringify(allDiscoveredRisks.map(r => r.riesgo_identificado), null, 2)}

INSTRUCCIONES:
1. Analiza esta lista y determina si existen áreas evidentes de contratación (ej. seguridad, propiedad intelectual, resolución de disputas) que parezcan haber sido ignoradas.
2. Si detectas vacíos temáticos, propone CÓMO reportarlos como riesgos de omisión. (Ej: "Ausencia de cláusulas sobre propiedad intelectual").

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

    return callGemini(systemPrompt, userPrompt, 'gemini-3.5-flash');
}

export async function runFullLegalAudit(
    sessionId: string,
    kbRisks: any[],
    systemPrompt: string,
    userContext: string,
    metadata: any
): Promise<any[]> {
    
    const finalEvaluatedRisks: any[] = [];
    
    // Phase 3: Group by Domain
    const domains = groupRisksByDomain(kbRisks);
    const allDiscoveredRisks: any[] = [];

    console.log(`[API] Processing domains and transversal concurrently...`);

    // Create a promise for each domain
    const domainPromises = Object.keys(domains).map(async (domain) => {
        const domainRisks = domains[domain];
        const domainResults: any[] = [];
        const domainDiscovered: any[] = [];
        
        // Phase 5: Audit KB risks for this domain
        const kbResults = await auditDomainRisks(domain, domainRisks, sessionId, systemPrompt, userContext);
        
        // Map back to original KB format
        for (const r of kbResults) {
            const originalRisk = domainRisks.find(kb => kb.id === r.id);
            if (originalRisk && (r.estado === 'ACTIVADO' || r.estado === 'PARCIALMENTE ACTIVADO')) {
               const riskObj = {
                  riesgo_id: originalRisk.numero_riesgo || originalRisk.id,
                  tipo_contrato: originalRisk.tipo_contrato,
                  sector: originalRisk.sector,
                  categoria: originalRisk.categoria,
                  subcategoria: originalRisk.subcategoria,
                  riesgo_identificado: originalRisk.riesgo_identificado,
                  foco_revision: originalRisk.foco_revision,
                  estado: r.estado,
                  fragmento_licitacion_evidencia: r.evidencia_licitacion,
                  evidencia_seccion_normativa_riesgo: r.evidencia_normativa,
                  nivel_sustento_documental: r.justificacion,
                  // Unique identifier for deduplication
                  _dedupKey: (originalRisk.riesgo_identificado + '|' + originalRisk.foco_revision).toLowerCase().replace(/\s+/g, '')
               };
               domainResults.push(riskObj);
               domainDiscovered.push(riskObj);
            }
        }

        // Phase 6: Complementary domain audit
        const compResults = await auditComplementaryDomainRisks(domain, sessionId, systemPrompt, userContext);
        for (const nr of compResults) {
           const riskObj = {
               riesgo_id: 'NUEVO_DETECCION',
               tipo_contrato: metadata.tipoContrato || 'N/A',
               sector: metadata.sectorArr.join(', '),
               categoria: nr.categoria || domain,
               subcategoria: nr.subcategoria || 'N/A',
               riesgo_identificado: nr.riesgo_identificado,
               foco_revision: nr.foco_revision,
               estado: 'NUEVO RIESGO DETECTADO',
               fragmento_licitacion_evidencia: nr.evidencia_licitacion,
               evidencia_seccion_normativa_riesgo: 'No aplica',
               nivel_sustento_documental: nr.justificacion,
               _dedupKey: (nr.riesgo_identificado + '|' + nr.foco_revision).toLowerCase().replace(/\s+/g, '')
           };
           domainResults.push(riskObj);
           domainDiscovered.push(riskObj);
        }
        
        return { domainResults, domainDiscovered };
    });

    // Also start transversal audit concurrently
    const transversalPromise = auditTransversal(sessionId, systemPrompt, userContext).then(transversalResults => {
        const tResults: any[] = [];
        for (const nr of transversalResults) {
            const riskObj = {
                riesgo_id: 'NUEVO_DETECCION',
                tipo_contrato: metadata.tipoContrato || 'N/A',
                sector: metadata.sectorArr.join(', '),
                categoria: nr.categoria || 'Riesgo Transversal',
                subcategoria: nr.subcategoria || 'N/A',
                riesgo_identificado: nr.riesgo_identificado,
                foco_revision: nr.foco_revision,
                estado: 'NUEVO RIESGO DETECTADO',
                fragmento_licitacion_evidencia: nr.evidencia_licitacion,
                evidencia_seccion_normativa_riesgo: 'No aplica',
                nivel_sustento_documental: nr.justificacion,
                _dedupKey: (nr.riesgo_identificado + '|' + nr.foco_revision).toLowerCase().replace(/\s+/g, '')
            };
            tResults.push(riskObj);
        }
        return tResults;
    });

    // Wait for all domains and transversal to finish
    const [domainOutcomes, transversalResults] = await Promise.all([
        Promise.all(domainPromises),
        transversalPromise
    ]);

    for (const outcome of domainOutcomes) {
        finalEvaluatedRisks.push(...outcome.domainResults);
        allDiscoveredRisks.push(...outcome.domainDiscovered);
    }
    
    finalEvaluatedRisks.push(...transversalResults);
    allDiscoveredRisks.push(...transversalResults);

    // Phase 8: Coverage Audit
    const coverageResults = await auditCoverage(systemPrompt, allDiscoveredRisks);
    for (const nr of coverageResults) {
        const riskObj = {
            riesgo_id: 'NUEVO_DETECCION',
            tipo_contrato: metadata.tipoContrato || 'N/A',
            sector: metadata.sectorArr.join(', '),
            categoria: nr.categoria || 'Omisión Documental',
            subcategoria: nr.subcategoria || 'N/A',
            riesgo_identificado: nr.riesgo_identificado,
            foco_revision: nr.foco_revision,
            estado: 'NUEVO RIESGO DETECTADO',
            fragmento_licitacion_evidencia: nr.evidencia_licitacion,
            evidencia_seccion_normativa_riesgo: 'No aplica',
            nivel_sustento_documental: nr.justificacion,
                _dedupKey: (nr.riesgo_identificado + '|' + nr.foco_revision).toLowerCase().replace(/\s+/g, '')
        };
        finalEvaluatedRisks.push(riskObj);
    }

    // Phase 9: Validation and Deduplication
    console.log(`[Phase 9] Deduplicating ${finalEvaluatedRisks.length} risks...`);
    const uniqueRisksMap = new Map();
    for (const risk of finalEvaluatedRisks) {
        if (risk._dedupKey && !uniqueRisksMap.has(risk._dedupKey)) {
            const key = risk._dedupKey;
            delete risk._dedupKey; // Cleanup
            uniqueRisksMap.set(key, risk);
        }
    }
    
    const finalRisks = Array.from(uniqueRisksMap.values());
    const historicosCount = finalRisks.filter(r => r.riesgo_id !== 'NUEVO_DETECCION' && !r.riesgo_id?.startsWith('COMP_') && !r.riesgo_id?.startsWith('TRANS_')).length;
    const nuevosCount = finalRisks.length - historicosCount;
    
    console.log(`[Resumen Auditoría] Session ${sessionId}`);
    console.log(`  - Riesgos Históricos Evaluados (Activados): ${historicosCount}`);
    console.log(`  - Riesgos Nuevos Detectados: ${nuevosCount}`);
    console.log(`  - Total Riesgos Reportados: ${finalRisks.length}`);

    return finalRisks;
}
