import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { prisma } from './lib/prisma.js';
import { protect, requireInternal } from './middleware/auth.js';

export const app = express();
app.use(cors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'user-service' }));

const publicProfile = (profile: { id: number; email: string; name: string; role: string; isActive: boolean }) => ({
  id: profile.id, email: profile.email, name: profile.name, role: profile.role, isActive: profile.isActive,
});

app.post('/users', requireInternal, async (req, res, next) => {
  try {
    const { id, email, name, role } = req.body as { id: number; email: string; name: string; role: string };
    if (!Number.isInteger(id) || !email || !name || !role) return res.status(400).json({ message: 'Invalid profile data' });
    const profile = await prisma.profile.upsert({
      where: { id }, update: { email, name, role }, create: { id, email, name, role },
    });
    return res.status(201).json(publicProfile(profile));
  } catch (error) {
    return next(error);
  }
});

app.get('/users/me', protect, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.user!.id } });
    if (!profile) return res.status(404).json({ message: 'User not found' });
    return res.json(publicProfile(profile));
  } catch (error) {
    return next(error);
  }
});

app.get('/users', protect, async (req, res, next) => {
  try {
    if (req.user!.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
    const profiles = await prisma.profile.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(profiles.map(publicProfile));
  } catch (error) {
    return next(error);
  }
});

app.get('/internal/users/:id', requireInternal, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: Number(req.params.id) } });
    if (!profile) return res.status(404).json({ message: 'User not found' });
    return res.json(publicProfile(profile));
  } catch (error) {
    return next(error);
  }
});

app.get('/internal/users', requireInternal, async (req, res, next) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase() : '';
    if (!email) return res.status(400).json({ message: 'email query parameter is required' });
    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) return res.status(404).json({ message: 'User not found' });
    return res.json(publicProfile(profile));
  } catch (error) {
    return next(error);
  }
});

app.get('/users/:id/profile', protect, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (req.user!.role !== 'ADMIN' && req.user!.id !== id) return res.status(403).json({ message: 'Not allowed to view this profile' });
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ message: 'User not found' });
    return res.json(publicProfile(profile));
  } catch (error) {
    return next(error);
  }
});

app.get('/users/:id', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: Number(req.params.id) } });
    if (!profile) return res.status(404).json({ message: 'User not found' });
    return res.json(publicProfile(profile));
  } catch (error) {
    return next(error);
  }
});

app.put('/users/:id', protect, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (req.user!.role !== 'ADMIN' && req.user!.id !== id) return res.status(403).json({ message: 'Not allowed to update this profile' });
    const data: { name?: string; email?: string } = {};
    if (typeof req.body.name === 'string') data.name = req.body.name;
    if (typeof req.body.email === 'string') data.email = req.body.email.toLowerCase();
    if (data.name !== undefined && data.name.trim().length < 2) return res.status(400).json({ message: 'Name must contain at least 2 characters' });
    if (data.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return res.status(400).json({ message: 'A valid email is required' });
    if (data.email || data.name) {
      try {
        const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001'}/internal/auth/users/${id}`, {
          method: 'PUT',
          headers: {
            'content-type': 'application/json',
            'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key',
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(5000),
        });
        if (!authResponse.ok) return res.status(503).json({ message: `Auth Service profile sync failed (${authResponse.status})` });
      } catch (error) {
        console.error('Auth Service profile sync failed:', error);
        return res.status(503).json({ message: 'Auth Service is unavailable; profile was not updated' });
      }
    }
    const profile = await prisma.profile.update({ where: { id }, data });
    return res.json(publicProfile(profile));
  } catch (error) {
    return next(error);
  }
});

app.patch('/users/:id/status', protect, async (req, res, next) => {
  try {
    if (req.user!.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required' });
    const id = Number(req.params.id);
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ message: 'User not found' });
    const isActive = !profile.isActive;
    try {
      const authResponse = await fetch(`${process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001'}/internal/auth/users/${id}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key',
        },
        body: JSON.stringify({ isActive }),
        signal: AbortSignal.timeout(5000),
      });
      if (!authResponse.ok) return res.status(503).json({ message: `Auth Service status sync failed (${authResponse.status})` });
    } catch (error) {
      console.error('Auth Service status sync failed:', error);
      return res.status(503).json({ message: 'Auth Service is unavailable; account status was not changed' });
    }
    const updated = await prisma.profile.update({ where: { id }, data: { isActive } });
    return res.json(publicProfile(updated));
  } catch (error) {
    return next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('User Service error:', error);
  res.status(500).json({ message: 'User Service request failed' });
});

const port = Number(process.env.PORT ?? 4003);
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, async () => {
    try {
      await prisma.$connect();
      console.log(`User Service listening on http://localhost:${port}`);
    } catch (error) {
      console.error('User Service database connection failed:', error);
      process.exit(1);
    }
  });
  server.requestTimeout = 10_000;
}
