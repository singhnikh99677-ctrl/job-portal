import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response as ExpressResponse, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from './lib/prisma.js';
import { protect, requireInternal } from './middleware/auth.js';

export const app = express();
app.use(cors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'job-service' }));

const jobSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(2),
  description: z.string().min(20),
  requiredSkills: z.array(z.string().min(2)),
  location: z.string().min(1),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  experience: z.string().min(1),
  employmentType: z.string().min(1),
  category: z.string().min(1),
  openings: z.coerce.number().int().min(1),
  applicationDeadline: z.string().optional()
    .transform((value) => value?.trim() || undefined)
    .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), 'Application deadline must be a valid date'),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
  approved: z.boolean().optional(),
});
type JobData = z.infer<typeof jobSchema>;

function serialize(job: Record<string, unknown>) {
  let requiredSkills: string[] = [];
  const rawSkills = job.requiredSkills;
  if (typeof rawSkills === 'string') {
    try {
      const parsed: unknown = JSON.parse(rawSkills);
      if (Array.isArray(parsed)) requiredSkills = parsed.map(String);
    } catch {
      requiredSkills = rawSkills.split(',').map((skill) => skill.trim()).filter(Boolean);
    }
  }
  return { ...job, requiredSkills };
}

async function assertRecruiterExists(recruiterId: number) {
  const url = `${process.env.USER_SERVICE_URL ?? 'http://localhost:4003'}/internal/users/${recruiterId}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key' },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw Object.assign(new Error('User Service is unavailable'), { statusCode: 503, cause: error });
  }
  if (response.status === 404) throw Object.assign(new Error('Recruiter not found'), { statusCode: 404 });
  if (!response.ok) throw Object.assign(new Error(`User Service request failed (${response.status})`), { statusCode: 503 });
  const user = await response.json() as { role: string; isActive: boolean };
  if (!user.isActive || !['RECRUITER', 'ADMIN'].includes(user.role)) {
    throw Object.assign(new Error('An active recruiter account is required'), { statusCode: 403 });
  }
}

async function hydrate(job: Record<string, unknown>) {
  const recruiterId = Number(job.recruiterId);
  let response: Response;
  try {
    response = await fetch(`${process.env.USER_SERVICE_URL ?? 'http://localhost:4003'}/internal/users/${recruiterId}`, {
      headers: { 'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key' },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw Object.assign(new Error('User Service is unavailable'), { statusCode: 503, cause: error });
  }
  if (!response.ok) throw Object.assign(new Error(`User Service request failed (${response.status})`), { statusCode: 503 });
  return { ...serialize(job), recruiter: await response.json() };
}

app.get('/jobs', async (req, res, next) => {
  try {
    const where: Record<string, unknown> = {};
    for (const field of ['title', 'location', 'category', 'employmentType'] as const) {
      const value = req.query[field];
      if (typeof value === 'string' && value.trim()) where[field] = { contains: value.trim() };
    }
    if (typeof req.query.status === 'string') where.status = req.query.status;
    if (req.query.approved !== undefined) where.approved = req.query.approved === 'true';
    const jobs = await prisma.job.findMany({ where, orderBy: { postedAt: 'desc' } });
    return res.json(await Promise.all(jobs.map((job) => hydrate(job as unknown as Record<string, unknown>))));
  } catch (error) {
    return next(error);
  }
});

app.get('/internal/jobs/:id', requireInternal, async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: Number(req.params.id) } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    return res.json(serialize(job as unknown as Record<string, unknown>));
  } catch (error) {
    return next(error);
  }
});

app.get('/jobs/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: Number(req.params.id) } });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    return res.json(await hydrate(job as unknown as Record<string, unknown>));
  } catch (error) {
    return next(error);
  }
});

app.post('/jobs', protect, async (req, res, next) => {
  try {
    if (!['RECRUITER', 'ADMIN'].includes(req.user!.role)) return res.status(403).json({ message: 'Recruiter access required' });
    const input: JobData = jobSchema.parse(req.body);
    await assertRecruiterExists(req.user!.id);
    const job = await prisma.job.create({
      data: {
        title: input.title, company: input.company, description: input.description,
        requiredSkills: JSON.stringify(input.requiredSkills), location: input.location,
        salaryMin: input.salaryMin ?? null, salaryMax: input.salaryMax ?? null,
        experience: input.experience, employmentType: input.employmentType, category: input.category,
        openings: input.openings, applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
        status: input.status ?? 'ACTIVE', approved: req.user!.role === 'ADMIN' ? (input.approved ?? true) : false,
        recruiterId: req.user!.id,
      },
    });
    return res.status(201).json(await hydrate(job as unknown as Record<string, unknown>));
  } catch (error) {
    return next(error);
  }
});

async function updateJob(req: Request, res: ExpressResponse, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Job not found' });
    if (req.user!.role !== 'ADMIN' && existing.recruiterId !== req.user!.id) return res.status(403).json({ message: 'Not allowed to edit this job' });
    const input = jobSchema.partial().parse(req.body);
    const job = await prisma.job.update({
      where: { id },
      data: {
        title: input.title,
        company: input.company,
        description: input.description,
        requiredSkills: input.requiredSkills ? JSON.stringify(input.requiredSkills) : undefined,
        location: input.location,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        experience: input.experience,
        employmentType: input.employmentType,
        category: input.category,
        openings: input.openings,
        applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : undefined,
        status: input.status,
        approved: req.user!.role === 'ADMIN' ? input.approved : undefined,
      },
    });
    return res.json(await hydrate(job as unknown as Record<string, unknown>));
  } catch (error) {
    return next(error);
  }
}
app.put('/jobs/:id', protect, updateJob);
app.patch('/jobs/:id', protect, updateJob);

app.delete('/jobs/:id', protect, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.job.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Job not found' });
    if (req.user!.role !== 'ADMIN' && existing.recruiterId !== req.user!.id) return res.status(403).json({ message: 'Not allowed to delete this job' });
    let applicationResponse: Response;
    try {
      applicationResponse = await fetch(
        `${process.env.APPLICATION_SERVICE_URL ?? 'http://localhost:4004'}/internal/applications/job/${id}`,
        {
          method: 'DELETE',
          headers: { 'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key' },
          signal: AbortSignal.timeout(5000),
        },
      );
    } catch (error) {
      throw Object.assign(new Error('Application Service is unavailable; job was not deleted'), { statusCode: 503, cause: error });
    }
    if (!applicationResponse.ok) {
      throw Object.assign(new Error(`Application Service rejected job cleanup (${applicationResponse.status}); job was not deleted`), { statusCode: 503 });
    }
    await prisma.job.delete({ where: { id } });
    return res.json({ success: true });
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
  if (statusCode >= 500) console.error('Job Service error:', error);
  res.status(statusCode).json({ message: error instanceof Error ? error.message : 'Internal server error' });
});

const port = Number(process.env.PORT ?? 4002);
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, async () => {
    try {
      await prisma.$connect();
      console.log(`Job Service listening on http://localhost:${port}`);
    } catch (error) {
      console.error('Job Service database connection failed:', error);
      process.exit(1);
    }
  });
  server.requestTimeout = 10_000;
}
