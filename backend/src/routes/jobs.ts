import { Router } from 'express';
import { z } from 'zod';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validator.js';
import { createJob, getJobById, listJobs, removeJob, updateJob } from '../services/jobService.js';

const router = Router();

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
  openings: z.coerce.number().min(1),
  applicationDeadline: z.string(),
  approved: z.boolean().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const jobs = await listJobs(req.query as Record<string, string | undefined>);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const job = await getJobById(Number(req.params.id));
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    return res.json(job);
  } catch (error) {
    return next(error);
  }
});

router.post('/', protect, authorize('RECRUITER', 'ADMIN'), validateBody(jobSchema), async (req, res, next) => {
  try {
    const job = await createJob(req.body, req.user!.id);
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', protect, async (req, res, next) => {
  try {
    const job = await updateJob(Number(req.params.id), req.body, req.user!.id, req.user!.role);
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const result = await removeJob(Number(req.params.id), req.user!.id, req.user!.role);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const jobsRouter = router;
