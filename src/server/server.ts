import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', apiRouter);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? (process.env.PORT || 3000) : 3001;

if (isProduction) {
  app.use(express.static(path.join(process.cwd(), 'dist/frontend')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist/frontend/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
