import fs from 'fs';

let content = fs.readFileSync('src/rag/auditEngine.ts', 'utf8');

// Add imports
content = `import { auditCoverage } from './coverage.js';\nimport { deduplicateRisks } from './deduplicator.js';\n` + content;

// Remove auditCoverage function
const coverageStart = content.indexOf('async function auditCoverage(');
const coverageEnd = content.indexOf('export async function runFullLegalAudit');
if (coverageStart !== -1 && coverageEnd !== -1) {
  content = content.substring(0, coverageStart) + content.substring(coverageEnd);
}

// Replace deduplication logic
const dedupStart = content.indexOf('const uniqueRisksMap = new Map();');
const dedupEnd = content.indexOf("const historicosCount = finalRisks.filter(");
if (dedupStart !== -1 && dedupEnd !== -1) {
  content = content.substring(0, dedupStart - 70) + `    const finalRisks = deduplicateRisks(finalEvaluatedRisks);\n    ` + content.substring(dedupEnd);
}

fs.writeFileSync('src/rag/auditEngine.ts', content);
