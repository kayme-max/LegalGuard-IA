import fs from 'fs';

let content = fs.readFileSync('src/db/db.ts', 'utf8');

// Update dotenv config to support both local and AI Studio environments
content = content.replace(
  /dotenv\.config\(\{ path: path\.resolve\(process\.cwd\(\), '\.\.\/\.env'\) \}\);/,
  `// Intentar cargar .env desde la raíz del proyecto (modo local)\ndotenv.config();\n// Intentar cargar desde el directorio superior (entorno AI Studio)\ndotenv.config({ path: path.resolve(process.cwd(), '../.env') });`
);

fs.writeFileSync('src/db/db.ts', content);
