import { db } from '../db/db.js';
import { documentChunks } from '../db/schema.js';
import { generateEmbeddings } from './embeddings.js';
import { sql, and, eq } from 'drizzle-orm';
import crypto from 'crypto';

function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function cosineDistance(vecA: number[], vecB: number[]) {
    return 1.0 - cosineSimilarity(vecA, vecB);
}

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

    let whereClause: import("drizzle-orm").SQL | undefined = eq(documentChunks.session_id, sessionId);
    if (documentType) {
        whereClause = and(whereClause, eq(documentChunks.document_type, documentType));
    }
    
    const allChunks = await db.select({
        chunk_text: documentChunks.chunk_text,
        embedding: documentChunks.embedding
    })
    .from(documentChunks)
    .where(whereClause);

    const scoredChunks = allChunks.map(chunk => {
        const dist = cosineDistance(chunk.embedding as number[], queryEmbedding);
        return { text: chunk.chunk_text, distance: dist };
    });

    scoredChunks.sort((a, b) => a.distance - b.distance);
    
    return scoredChunks.slice(0, limit).map(c => c.text).filter((t): t is string => t !== null);
}

export async function retrieveMultiQueryChunks(
    sessionId: string, 
    queries: string[], 
    documentType: string, 
    limitPerQuery: number = 5,
    maxTotalLimit: number = 30
): Promise<string[]> {
    
    let whereClause: import("drizzle-orm").SQL | undefined = eq(documentChunks.session_id, sessionId);
    if (documentType) {
        whereClause = and(whereClause, eq(documentChunks.document_type, documentType));
    }
    
    const allDbChunks = await db.select({
        chunk_text: documentChunks.chunk_text,
        embedding: documentChunks.embedding
    })
    .from(documentChunks)
    .where(whereClause);

    if (allDbChunks.length === 0) return [];

    const allChunksMap = new Map<string, number>(); // chunk_text -> distance

    for (const query of queries) {
        const queryEmbeddingResult = await generateEmbeddings([query]);
        const queryEmbedding = queryEmbeddingResult[0];
        
        if (!queryEmbedding) {
            continue;
        }

        const scoredChunks = allDbChunks.map(chunk => {
            const dist = cosineDistance(chunk.embedding as number[], queryEmbedding);
            return { text: chunk.chunk_text, distance: dist };
        });

        scoredChunks.sort((a, b) => a.distance - b.distance);
        const topForQuery = scoredChunks.slice(0, limitPerQuery);

        for (const r of topForQuery) {
            if (!r.text) continue;
            if (!allChunksMap.has(r.text) || allChunksMap.get(r.text)! > r.distance) {
                allChunksMap.set(r.text, r.distance);
            }
        }
    }

    const sortedChunks = Array.from(allChunksMap.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, maxTotalLimit)
        .map(entry => entry[0]);

    return sortedChunks;
}

export async function clearSessionChunks(sessionId: string) {
    await db.delete(documentChunks).where(eq(documentChunks.session_id, sessionId));
}
