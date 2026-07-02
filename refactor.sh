#!/bin/bash
mkdir -p src/server src/rag src/prompts src/db src/services src/utils src/shared src/frontend public
mv frontend/src/components src/frontend/components
mv frontend/src/views src/frontend/views
mv frontend/src/lib src/frontend/lib
mv frontend/src/assets src/frontend/assets
mv frontend/src/App.tsx src/frontend/App.tsx
mv frontend/src/main.tsx src/frontend/main.tsx
mv frontend/src/index.css src/frontend/index.css
mv frontend/src/types.ts src/frontend/types.ts
mv frontend/src/vite-env.d.ts src/frontend/vite-env.d.ts
mv frontend/index.html ./
mv frontend/vite.config.ts ./
mv frontend/eslint.config.js ./ 2>/dev/null
mv frontend/tsconfig.node.json ./
mv backend/src/server.ts src/server/server.ts
mv backend/src/db/* src/db/
mv backend/src/prompts/* src/prompts/
mv backend/src/rag/* src/rag/
rm -rf frontend backend
