import fs from 'fs';

let content = fs.readFileSync('src/server/routes.ts', 'utf8');

// Fix the files casting
content = content.replace("const files = req.files;", "const files = req.files as { [fieldname: string]: Express.Multer.File[] };");

// Remove unused rag imports
content = content.replace(/import \{ chunkText \} from '\.\/rag\/chunking\.js';/g, '');
content = content.replace(/import \{ indexDocumentChunks, clearSessionChunks \} from '\.\/rag\/vectorStore\.js';/g, '');

fs.writeFileSync('src/server/routes.ts', content);
