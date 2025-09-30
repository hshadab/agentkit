#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'ACP/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import delegatePaymentRouter from './routes/delegate_payment.js';
import checkoutSessionsRouter from './routes/checkout_sessions.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Static demo
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

// ACP endpoints
app.use('/agentic_commerce', delegatePaymentRouter);
app.use('/', checkoutSessionsRouter);

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = parseInt(process.env.PORT || '8605', 10);
app.listen(PORT, () => {
  console.log(`ACP server listening on http://127.0.0.1:${PORT}`);
});

