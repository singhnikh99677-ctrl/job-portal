import { Router } from 'express';
import client from 'prom-client';
import { prisma } from '../lib/prisma.js';

const router = Router();
const register = new client.Registry();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status'],
  buckets: [50, 100, 200, 500, 1000, 2000],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

router.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path ?? req.path;
    httpRequestDuration.observe({ method: req.method, route, status: String(res.statusCode) }, duration);
    httpRequestsTotal.inc({ method: req.method, route, status: String(res.statusCode) }, 1);
  });
  next();
});

router.get('/health', async (_req, res) => {
  res.json({ status: 'ok' });
});

router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not-ready' });
  }
});

router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export const healthRouter = router;
