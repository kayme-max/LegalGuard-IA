import fs from 'fs';

let content = fs.readFileSync('src/rag/auditEngine.ts', 'utf8');

// Fix the unclosed console.log string
content = content.replace("    console.log(`    const finalRisks = deduplicateRisks(finalEvaluatedRisks);", "    const finalRisks = deduplicateRisks(finalEvaluatedRisks);");

fs.writeFileSync('src/rag/auditEngine.ts', content);
