export function deduplicateRisks(evaluatedRisks: any[]): any[] {
  console.log(`[Phase 9] Deduplicating ${evaluatedRisks.length} risks...`);
  const uniqueRisksMap = new Map();
  for (const risk of evaluatedRisks) {
      if (risk._dedupKey && !uniqueRisksMap.has(risk._dedupKey)) {
          const key = risk._dedupKey;
          delete risk._dedupKey; // Cleanup
          uniqueRisksMap.set(key, risk);
      }
  }
  
  return Array.from(uniqueRisksMap.values());
}
