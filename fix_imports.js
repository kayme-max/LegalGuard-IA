import fs from 'fs';

let content = fs.readFileSync('src/server/server.ts', 'utf8');

content = content.replace(/\.\/db\/db\.js/g, '../db/db.js');
content = content.replace(/\.\/db\/schema\.js/g, '../db/schema.js');
content = content.replace(/\.\/prompts\/analysisPrompt\.js/g, '../prompts/analysisPrompt.js');
content = content.replace(/\.\/rag\/ragService\.js/g, '../rag/ragService.js');
content = content.replace(/dotenv\.config\({ path: path\.resolve\(process\.cwd\(\), '\.\.\/\.env'\) }\);/, 'dotenv.config();');
content = content.replace(/const PORT = isProduction \? \(process\.env\.PORT \|\| 3000\) : 3002;/, 'const PORT = isProduction ? (process.env.PORT || 3000) : 3001;');
content = content.replace(/app\.use\(express\.static\(path\.join\(__dirname, '\.\.\/frontend\/dist'\)\)\);/, "app.use(express.static(path.join(process.cwd(), 'dist/frontend')));");
content = content.replace(/app\.get\('\*', \(req, res\) => \{\n\s*res\.sendFile\(path\.join\(__dirname, '\.\.\/frontend\/dist\/index\.html'\)\);\n\s*\}\);/, "app.get('*', (req, res) => {\n  res.sendFile(path.join(process.cwd(), 'dist/frontend/index.html'));\n});");

fs.writeFileSync('src/server/server.ts', content);
