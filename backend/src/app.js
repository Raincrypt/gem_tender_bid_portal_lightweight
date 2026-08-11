import express from 'express';
import cors from 'cors';
import { REQUEST_BODY_LIMIT } from './config/config.js';
import bidsRouter from './routes/bids.js';
import tendersRouter from './routes/tenders.js';
import logsRouter from './routes/logs.js';
import aiRouter from './routes/ai.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ limit: REQUEST_BODY_LIMIT, extended: true }));

// Route Mounting
app.use('/api/bids', bidsRouter);
app.use('/api/tenders', tendersRouter);
app.use('/api/log', logsRouter);
app.use('/api', aiRouter); // mounts /api/extract-fallback

export default app;
