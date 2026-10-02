import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { createApplication, listApplicationsForUser, updateApplicationStatus } from '../services/applicationService.js';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF and DOCX files are allowed'));
  },
});

const applicationSchema = z.object({
  jobId: z.coerce.number(),
  coverLetter: z.string().optional(),
});

router.get('/', protect, async (req, res, next) => {
  try {
    const apps = await listApplicationsForUser(req.user!.id, req.user!.role);
    res.json(apps);
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, authorize('APPLICANT'), upload.single('resume'), async (req, res, next) => {
  try {
    const body = applicationSchema.parse(req.body);
    const resumeFile = req.file
      ? {
          originalname: req.file.originalname,
          filename: req.file.filename,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        }
      : undefined;

    const application = await createApplication({
      applicantId: req.user!.id,
      jobId: body.jobId,
      coverLetter: body.coverLetter,
      resumeFile,
    });

    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', protect, authorize('RECRUITER', 'ADMIN'), async (req, res, next) => {
  try {
    const status = z.enum(['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'HIRED']).parse(req.body.status);
    const application = await updateApplicationStatus(Number(req.params.id), status, req.user!.id, req.user!.role);
    res.json(application);
  } catch (error) {
    next(error);
  }
});

export const applicationsRouter = router;
