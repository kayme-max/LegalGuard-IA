import { retrieveMultiQueryChunks, retrieveRelevantChunks } from './vectorStore.js';

export async function retrieveContext(sessionId: string, query: string, documentType?: string) {
    return retrieveMultiQueryChunks(sessionId, [query], documentType || '', 20);
}
