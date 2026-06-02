import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import orderRoutes from './routes/orders.routes.js';
import routeRoutes from './routes/routes.routes.js';
import chatRoutes from './routes/chat.routes.js';
import userRoutes from './routes/users.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'animalia-repartos-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);

app.use((error, req, res, next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Datos invalidos.', details: error.flatten() });
  }
  return errorHandler(error, req, res, next);
});

app.listen(env.port, () => {
  console.log(`Animalia Repartos API escuchando en http://localhost:${env.port}`);
});
