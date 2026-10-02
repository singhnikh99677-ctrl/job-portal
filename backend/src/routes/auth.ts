import { Router } from 'express';
import { z } from 'zod';
import { getCurrentUser, loginUser, registerUser } from '../services/authService.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validator.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'RECRUITER', 'APPLICANT']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user!.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export const authRouter = router;
