import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { AppError } from './lib/errors';
import { authRouter } from './routes/auth';
import { patientsRouter } from './routes/patients';
import { appointmentsRouter } from './routes/appointments';
import { reportsRouter } from './routes/reports';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/reports', reportsRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    console.error('Unhandled error:', err);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  });

  return app;
}
