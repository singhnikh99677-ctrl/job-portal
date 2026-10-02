import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import http from 'node:http';
import { URL } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import openApiSpec from './openapi.js';

const serviceUrls = {
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001',
  users: process.env.USER_SERVICE_URL ?? 'http://localhost:4003',
  jobs: process.env.JOB_SERVICE_URL ?? 'http://localhost:4002',
  applications: process.env.APPLICATION_SERVICE_URL ?? 'http://localhost:4004',
};

const routes = [
  { prefix: '/api/auth', target: serviceUrls.auth, name: 'Auth' },
  { prefix: '/api/users', target: serviceUrls.users, name: 'User' },
  { prefix: '/api/jobs', target: serviceUrls.jobs, name: 'Job' },
  { prefix: '/api/applications', target: serviceUrls.applications, name: 'Application' },
] as const;

export const app = express();
app.use(cors({
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((value) => value.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Internal-Service-Key'],
}));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));
app.get('/docs/openapi.json', (_req, res) => res.json(openApiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  swaggerOptions: { persistAuthorization: true },
}));

function proxyRequest(req: Request, res: Response, target: string, serviceName: string, pathOverride?: string) {
  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex < 0 ? '' : req.originalUrl.slice(queryIndex);
  const servicePath = req.originalUrl.slice(0, queryIndex < 0 ? undefined : queryIndex).replace(/^\/api/, '');
  const incomingPath = pathOverride ?? `${servicePath}${query}`;
  const destination = new URL(`${target}${incomingPath}`);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  const upstream = http.request(destination, {
    method: req.method,
    headers,
    timeout: 5000,
  }, (upstreamResponse) => {
    res.status(upstreamResponse.statusCode ?? 502);
    for (const [name, value] of Object.entries(upstreamResponse.headers)) {
      if (value !== undefined) {
        res.setHeader(name, value);
      }
    }
    upstreamResponse.pipe(res);
  });

  upstream.on('timeout', () => upstream.destroy(new Error('Upstream request timed out')));
  upstream.on('error', (error) => {
    console.error(`${serviceName} Service request failed:`, error.message);
    if (!res.headersSent) {
      const timedOut = error.message === 'Upstream request timed out';
      res.status(timedOut ? 504 : 502).json({
        success: false,
        error: `${serviceName} Service ${timedOut ? 'timed out' : 'unavailable'}`,
      });
    } else {
      res.destroy(error);
    }
  });
  req.pipe(upstream);
}

for (const route of routes) {
  app.get(`${route.prefix}/health`, (req, res) => proxyRequest(
    req,
    res,
    route.target,
    route.name,
    `/health${req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''}`,
  ));
}

for (const route of routes) {
  app.use(route.prefix, (req, res) => proxyRequest(req, res, route.target, route.name));
}

const port = Number(process.env.PORT ?? 4000);
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, () => console.log(`Gateway listening on http://localhost:${port}`));
  server.requestTimeout = 10_000;
}
