import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from './lib/prisma.js';
import { protect } from './middleware/auth.js';

export const app = express();
const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const accepted = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.mimetype);
    if (accepted) {
      callback(null, true);
    } else {
      callback(Object.assign(new Error('Only PDF and DOCX files are allowed'), { statusCode: 400 }));
    }
  },
});

app.use(cors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'application-service' }));

const serviceHeaders = { 'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key' };
async function fetchServiceRecord(baseUrl: string, pathName: string, label: string) {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${pathName}`, {
      headers: serviceHeaders,
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw Object.assign(new Error(`${label} Service is unavailable`), { statusCode: 503, cause: error });
  }
  if (response.status === 404) throw Object.assign(new Error(`${label} not found`), { statusCode: 404 });
  if (!response.ok) throw Object.assign(new Error(`${label} Service request failed (${response.status})`), { statusCode: 503 });
  return response.json() as Promise<Record<string, unknown>>;
}

async function hydrate(application: {
  id: number; applicantId: number; jobId: number; coverLetter: string | null; status: string;
  recruiterNotes: string | null; resumeOriginalName: string | null; resumeFileName: string | null;
  resumeMimeType: string | null; resumeSize: number | null; resumePath: string | null;
  createdAt: Date; updatedAt: Date;
}) {
  const [applicant, job] = await Promise.all([
    fetchServiceRecord(process.env.USER_SERVICE_URL ?? 'http://localhost:4003', `/internal/users/${application.applicantId}`, 'User'),
    fetchServiceRecord(process.env.JOB_SERVICE_URL ?? 'http://localhost:4002', `/internal/jobs/${application.jobId}`, 'Job'),
  ]);
  const resume = application.resumeFileName ? {
    originalName: application.resumeOriginalName,
    fileName: application.resumeFileName,
    mimeType: application.resumeMimeType,
    size: application.resumeSize,
    path: application.resumePath,
  } : null;
  return { ...application, applicant, job, resume };
}

const applicationSchema = z.object({
  jobId: z.coerce.number().int().positive(),
  coverLetter: z.string().optional(),
});
const statuses = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'HIRED'] as const;

app.get('/applications', protect, async (req, res, next) => {
  try {
    const applications = await prisma.application.findMany({
      where: req.user!.role === 'APPLICANT' ? { applicantId: req.user!.id } : {},
      orderBy: { createdAt: 'desc' },
    });
    const records = await Promise.all(applications.map((application) => hydrate(application)));
    const visible = req.user!.role === 'RECRUITER'
      ? records.filter((application) => application.job.recruiterId === req.user!.id)
      : records;
    return res.json(visible);
  } catch (error) {
    return next(error);
  }
});

app.delete('/internal/applications/job/:jobId', async (req, res, next) => {
  try {
    if (req.header('x-internal-service-key') !== (process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key')) {
      return res.status(403).json({ message: 'Internal service authentication required' });
    }
    const result = await prisma.application.deleteMany({ where: { jobId: Number(req.params.jobId) } });
    return res.json({ deletedCount: result.count });
  } catch (error) {
    return next(error);
  }
});

app.post('/applications', protect, upload.single('resume'), async (req, res, next) => {
  try {
    if (req.user!.role !== 'APPLICANT') return res.status(403).json({ message: 'Applicant access required' });
    const body = applicationSchema.parse(req.body);
    const [user, job] = await Promise.all([
      fetchServiceRecord(process.env.USER_SERVICE_URL ?? 'http://localhost:4003', `/internal/users/${req.user!.id}`, 'User'),
      fetchServiceRecord(process.env.JOB_SERVICE_URL ?? 'http://localhost:4002', `/internal/jobs/${body.jobId}`, 'Job'),
    ]);
    if (user.isActive !== true) return res.status(403).json({ message: 'This account is inactive' });
    if (job.approved !== true || job.status !== 'ACTIVE') return res.status(400).json({ message: 'This job is not accepting applications' });

    const application = await prisma.application.create({
      data: {
        applicantId: req.user!.id,
        jobId: body.jobId,
        coverLetter: body.coverLetter,
        resumeOriginalName: req.file?.originalname,
        resumeFileName: req.file?.filename,
        resumeMimeType: req.file?.mimetype,
        resumeSize: req.file?.size,
        resumePath: req.file?.path,
      },
    });
    return res.status(201).json({ ...application, applicant: user, job, resume: req.file ? {
      originalName: req.file.originalname, fileName: req.file.filename, mimeType: req.file.mimetype,
      size: req.file.size, path: req.file.path,
    } : null });
  } catch (error) {
    if (req.file) await fs.promises.unlink(req.file.path).catch((unlinkError: NodeJS.ErrnoException) => {
      if (unlinkError.code !== 'ENOENT') console.error('Could not remove rejected resume upload:', unlinkError);
    });
    return next(error);
  }
});

app.get('/applications/user/:userId', protect, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user!.role !== 'ADMIN' && req.user!.id !== userId && req.user!.role !== 'RECRUITER') {
      return res.status(403).json({ message: 'Not allowed to view these applications' });
    }
    const applications = await prisma.application.findMany({ where: { applicantId: userId }, orderBy: { createdAt: 'desc' } });
    const records = await Promise.all(applications.map(hydrate));
    return res.json(req.user!.role === 'RECRUITER'
      ? records.filter((application) => application.job.recruiterId === req.user!.id)
      : records);
  } catch (error) {
    return next(error);
  }
});

app.get('/applications/job/:jobId', protect, async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    const job = await fetchServiceRecord(process.env.JOB_SERVICE_URL ?? 'http://localhost:4002', `/internal/jobs/${jobId}`, 'Job');
    if (req.user!.role !== 'ADMIN' && (req.user!.role !== 'RECRUITER' || job.recruiterId !== req.user!.id)) {
      return res.status(403).json({ message: 'Not allowed to view these applications' });
    }
    const applications = await prisma.application.findMany({ where: { jobId }, orderBy: { createdAt: 'desc' } });
    return res.json(await Promise.all(applications.map(hydrate)));
  } catch (error) {
    return next(error);
  }
});

app.get('/applications/:id', protect, async (req, res, next) => {
  try {
    const application = await prisma.application.findUnique({ where: { id: Number(req.params.id) } });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const hydrated = await hydrate(application);
    if (req.user!.role === 'APPLICANT' && application.applicantId !== req.user!.id) {
      return res.status(403).json({ message: 'Not allowed to view this application' });
    }
    if (req.user!.role === 'RECRUITER' && hydrated.job.recruiterId !== req.user!.id) {
      return res.status(403).json({ message: 'Not allowed to view this application' });
    }
    return res.json(hydrated);
  } catch (error) {
    return next(error);
  }
});

async function updateApplicationStatus(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    if (!['RECRUITER', 'ADMIN'].includes(req.user!.role)) return res.status(403).json({ message: 'Recruiter access required' });
    const status = z.enum(statuses).parse(req.body.status);
    const id = Number(req.params.id);
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const job = await fetchServiceRecord(process.env.JOB_SERVICE_URL ?? 'http://localhost:4002', `/internal/jobs/${application.jobId}`, 'Job');
    if (req.user!.role !== 'ADMIN' && job.recruiterId !== req.user!.id) return res.status(403).json({ message: 'You cannot update this application' });
    const updated = await prisma.application.update({ where: { id }, data: { status } });
    return res.json(await hydrate(updated));
  } catch (error) {
    return next(error);
  }
}
app.put('/applications/:id/status', protect, updateApplicationStatus);
app.patch('/applications/:id/status', protect, updateApplicationStatus);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const prismaCode = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code: string }).code
    : undefined;
  const statusCode = error instanceof multer.MulterError ? 400 : prismaCode === 'P2002' ? 409 : typeof error === 'object' && error !== null && 'statusCode' in error
    ? Number((error as { statusCode: unknown }).statusCode)
    : error instanceof z.ZodError ? 400 : 500;
  if (statusCode >= 500) console.error('Application Service error:', error);
  res.status(statusCode).json({ message: error instanceof Error ? error.message : 'Internal server error' });
});

const port = Number(process.env.PORT ?? 4004);
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, async () => {
    try {
      await prisma.$connect();
      console.log(`Application Service listening on http://localhost:${port}`);
    } catch (error) {
      console.error('Application Service database connection failed:', error);
      process.exit(1);
    }
  });
  server.requestTimeout = 10_000;
}
