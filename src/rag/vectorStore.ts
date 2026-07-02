import { db } from '../db/db.js';
import { documentChunks } from '../db/schema.js';
import { generateEmbeddings } from './embeddings.js';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function indexDocumentChunks(sessionId: string, documentName: string, documentType: string, chunks: string[]) {
    console.log(`Indexing ${chunks.length} chunks for document: ${documentName} (${documentType})`);
    
    // Generate embeddings
    const embeddings = await generateEmbeddings(chunks);
    
    const validChunks = chunks.map((chunkText, i) => ({
        chunkText,
        embedding: embeddings[i]
    })).filter(c => c.embedding !== null);
    
    if (validChunks.length === 0) {
        console.warn(`No valid embeddings generated for document ${documentName}`);
        return;
    }

    // Insert in batches of 100 to avoid query size limits
    const batchSize = 100;
    for (let i = 0; i < validChunks.length; i += batchSize) {
        const batch = validChunks.slice(i, i + batchSize);
        const values = batch.map(c => ({
            session_id: sessionId,
            document_name: documentName,
            document_type: documentType,
            chunk_text: c.chunkText,
            embedding: c.embedding
        }));
        
        await db.insert(documentChunks).values(values);
    }
    
    console.log(`Successfully indexed ${validChunks.length} chunks for document: ${documentName}`);
}

export async function retrieveRelevantChunks(sessionId: string, query: string, documentType?: string, limit: number = 15): Promise<string[]> {
    // Generate embedding for the query
    const queryEmbeddingResult = await generateEmbeddings([query]);
    const queryEmbedding = queryEmbeddingResult[0];
    
    if (!queryEmbedding) {
        console.error("Failed to generate embedding for query");
        return [];
    }

    // Using pgvector cosine distance `<=>`
    // We want to order by cosine distance ascending (smaller is more similar)
    const queryEmbeddingString = `[${queryEmbedding.join(',')}]`;
    
    let whereClause = sql`${documentChunks.session_id} = ${sessionId}`;
    if (documentType) {
        whereClause = sql`${whereClause} AND ${documentChunks.document_type} = ${documentType}`;
    }
    
    const results = await db.select({
        chunk_text: documentChunks.chunk_text,
        distance: sql<number>`${documentChunks.embedding} <=> ${queryEmbeddingString}::vector`
    })
    .from(documentChunks)
    .where(whereClause)
    .orderBy(sql`${documentChunks.embedding} <=> ${queryEmbeddingString}::vector`)
    .limit(limit);

    return results.map(r => r.chunk_text).filter((t): t is string => t !== null);
}

export async function retrieveMultiQueryChunks(
    sessionId: string, 
    queries: string[], 
    documentType: string, 
    limitPerQuery: number = 5,
    maxTotalLimit: number = 30
): Promise<string[]> {
    const allChunks = new Map<string, number>(); // chunk_text -> distance

    for (const query of queries) {
        // Generate embedding for the query
        const queryEmbeddingResult = await generateEmbeddings([query]);
        const queryEmbedding = queryEmbeddingResult[0];
        
        if (!queryEmbedding) {
            continue;
        }

        const queryEmbeddingString = `[${queryEmbedding.join(',')}]`;
        
        let whereClause = sql`${documentChunks.session_id} = ${sessionId}`;
        if (documentType) {
            whereClause = sql`${whereClause} AND ${documentChunks.document_type} = ${documentType}`;
        }
        
        const results = await db.select({
            chunk_text: documentChunks.chunk_text,
            distance: sql<number>`${documentChunks.embedding} <=> ${queryEmbeddingString}::vector`
        })
        .from(documentChunks)
        .where(whereClause)
        .orderBy(sql`${documentChunks.embedding} <=> ${queryEmbeddingString}::vector`)
        .limit(limitPerQuery);

        for (const r of results) {
            if (!r.chunk_text) continue;
            if (!allChunks.has(r.chunk_text) || allChunks.get(r.chunk_text)! > r.distance) {
                allChunks.set(r.chunk_text, r.distance);
            }
        }
    }

    // Sort by best distance across all queries and limit
    const sortedChunks = Array.from(allChunks.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, maxTotalLimit)
        .map(entry => entry[0]);

    return sortedChunks;
}

export async function clearSessionChunks(sessionId: string) {
    await db.delete(documentChunks).where(sql`${documentChunks.session_id} = ${sessionId}`);
}
