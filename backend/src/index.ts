import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { jobsRouter } from './routes/jobs.js';
import { usersRouter } from './routes/users.js';
import { applicationsRouter } from './routes/applications.js';
import { healthRouter } from './routes/health.js';
import { docsRouter } from './routes/docs.js';
import { errorHandler } from './middleware/errorHandler.js';
import './types/express.d.js';

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(compression());
app.use(
  cors({
    origin: config.corsOrigin.split(',').map((item) => item.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/users', usersRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api', docsRouter);
app.use('/', healthRouter);
app.use(errorHandler);

const startServer = async () => {
  try {
    await prisma.$connect();
    app.listen(config.port, () => {
      console.log(`Job portal backend running on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start backend', error);
    process.exit(1);
  }
};

startServer();
