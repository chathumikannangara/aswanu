import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, initSchema } from './db.js';
import { authMiddleware } from './auth.js';
import { apiRouter } from './routes.js';
import { seedDatabase } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Initialize DB schema
initSchema();

// If users table is empty, auto-seed
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  console.log('Database empty. Seeding initial demonstration dataset...');
  seedDatabase();
}

// Mount API router
app.use('/api', apiRouter);

// Serve frontend build if dist directory exists
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`===================================================`);
  console.log(`ASWANU (අස්වනු / அறுවடை) Server running on port ${PORT}`);
  console.log(`Local persistent DB: aswanu.db (node:sqlite WAL mode)`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`===================================================`);
});

export default app;
