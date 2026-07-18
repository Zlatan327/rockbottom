import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDb } from './db/schema.js'; // to initialize
import { apiRateLimiter, wsRateLimiter } from './middleware/rate-limiter.js';

import milestoneRoutes from './routes/milestones.js';
import betRoutes from './routes/bets.js';
import userRoutes from './routes/users.js';
import proofRoutes from './routes/proofs.js';
import setupAgentSockets from './routes/agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST', 'PATCH']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(apiRateLimiter);

// Store io on app so routes can access it
app.set('io', io);

// Static files (for proofs)
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/milestones', milestoneRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/users', userRoutes);
app.use('/api/proofs', proofRoutes);

// Setup WebSockets
io.use(wsRateLimiter);
setupAgentSockets(io);

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // DB is initialized on demand via getDb() but we can pre-warm it
    const { getDb } = await import('./db/schema.js');
    await getDb();
    
    server.listen(PORT, () => {
      console.log(`🚀 RockBottom backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
