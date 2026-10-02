import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from './lib/prisma.js';
import { protect } from './middleware/auth.js';

export const app = express();
app.use(cors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));

const credentials = (user: { id: number; email: string; name: string; role: string; isActive: boolean }) => ({
  id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive,
});
const tokenFor = (user: { id: number; email: string; role: string }) =>
  jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET ?? 'development-secret', { expiresIn: '7d' });

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(['RECRUITER', 'APPLICANT']).optional(),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

app.post('/auth/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const user = await prisma.credential.create({
      data: { email, name: input.name, passwordHash: await bcrypt.hash(input.password, 10), role: input.role ?? 'APPLICANT' },
    });
    try {
      const profileResponse = await fetch(`${process.env.USER_SERVICE_URL ?? 'http://localhost:4003'}/users`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key' },
        body: JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role }),
        signal: AbortSignal.timeout(5000),
      });
      if (!profileResponse.ok) {
        const detail = await profileResponse.text();
        throw new Error(`User Service rejected profile creation (${profileResponse.status}): ${detail}`);
      }
    } catch (error) {
      await prisma.credential.delete({ where: { id: user.id } });
      throw Object.assign(new Error('Could not create the user profile; registration was rolled back'), {
        statusCode: 503, cause: error,
      });
    }
    return res.status(201).json({ token: tokenFor(user), user: credentials(user) });
  } catch (error) {
    return next(error);
  }
});

app.post('/auth/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.credential.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    return res.json({ token: tokenFor(user), user: credentials(user) });
  } catch (error) {
    return next(error);
  }
});

app.get('/auth/me', protect, (req, res) => {
  res.json({ id: req.user!.id, email: req.user!.email, role: req.user!.role });
});
app.post('/auth/verify', protect, (req, res) => res.json({ valid: true, user: req.user }));

app.put('/internal/auth/users/:id', async (req, res, next) => {
  try {
    if (req.header('x-internal-service-key') !== (process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key')) {
      return res.status(403).json({ message: 'Internal service authentication required' });
    }
    const id = Number(req.params.id);
    const updated = await prisma.credential.update({
      where: { id },
      data: {
        ...(typeof req.body.name === 'string' ? { name: req.body.name } : {}),
        ...(typeof req.body.email === 'string' ? { email: req.body.email.toLowerCase() } : {}),
        ...(typeof req.body.isActive === 'boolean' ? { isActive: req.body.isActive } : {}),
      },
    });
    return res.json(credentials(updated));
  } catch (error) {
    return next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const prismaCode = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code: string }).code
    : undefined;
  const statusCode = prismaCode === 'P2002' ? 409 : typeof error === 'object' && error !== null && 'statusCode' in error
    ? Number((error as { statusCode: unknown }).statusCode)
    : error instanceof z.ZodError ? 400 : 500;
  const message = error instanceof Error ? error.message : 'Internal server error';
  if (statusCode >= 500) console.error('Auth Service error:', error);
  res.status(statusCode).json({ message });
});

const port = Number(process.env.PORT ?? 4001);
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, async () => {
    try {
      await prisma.$connect();
      console.log(`Auth Service listening on http://localhost:${port}`);
    } catch (error) {
      console.error('Auth Service database connection failed:', error);
      process.exit(1);
    }
  });
  server.requestTimeout = 10_000;
}
