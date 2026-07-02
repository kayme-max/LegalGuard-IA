export function chunkText(text: string, chunkSize: number = 3000, overlapSize: number = 600): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  // Regex to detect semantic boundaries like chapters, articles, clauses.
  const semanticBoundaryRegex = /\n(?:Capítulo|Artículo|Cláusula|Numeral|\d+\.)/gi;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    if (endIndex < text.length) {
      // Find the last semantic boundary within the chunk
      const searchString = text.substring(startIndex, endIndex);
      
      let lastSemanticBoundary = -1;
      let match;
      while ((match = semanticBoundaryRegex.exec(searchString)) !== null) {
          lastSemanticBoundary = match.index;
      }
      
      // If we found a semantic boundary in the second half of the chunk, break there
      if (lastSemanticBoundary > (chunkSize / 2)) {
         endIndex = startIndex + lastSemanticBoundary;
      } else {
        // Fallback to paragraph or sentence break
        const lastDoubleNewline = text.lastIndexOf('\n\n', endIndex);
        const lastNewline = text.lastIndexOf('\n', endIndex);
        const lastPeriod = text.lastIndexOf('.', endIndex);
        const breakPoint = Math.max(lastDoubleNewline, lastNewline, lastPeriod);
        
        if (breakPoint > startIndex + (chunkSize / 2)) {
          endIndex = breakPoint + 1;
        }
      }
    } else {
      endIndex = text.length;
    }
    
    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Ensure progress and overlap
    startIndex = endIndex - overlapSize;
    if (startIndex <= 0 || endIndex - startIndex < 10) { 
        startIndex = endIndex; 
    }
  }
  
  return chunks;
}
