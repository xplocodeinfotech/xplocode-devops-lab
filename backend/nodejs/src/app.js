import express from 'express';
import { getConfig } from './config/index.js';
import { HttpError } from './errors.js';
import { createRepository } from './repositories/index.js';
import { createAuthService } from './services/auth.js';
import { createStudentService } from './services/students.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { studentRoutes } from './routes/students.js';

// Builds the Express app. It never calls listen(): server.js (local / Cloud Run) and
// the Catalyst entry point both reuse this same app.
export function createApp(config = getConfig()) {
  const repository = createRepository(config);
  const auth = createAuthService(repository, config);
  const students = createStudentService(repository);
  const app = express();
  app.locals.repository = repository; // server.js uses it for the startup check and shutdown
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Access-Token');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', healthRoutes(), authRoutes(auth), studentRoutes(students, auth));
  app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Route not found.')));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
      error = new HttpError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON under 10 KB.');
    }
    if (error instanceof HttpError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    console.error('Unexpected error:', error.code ?? error.message); // never log request bodies or credentials
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } });
  });
  return app;
}
