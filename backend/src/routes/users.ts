import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { getUserById, listUsers, toggleUserStatus } from '../services/userService.js';

const router = Router();

router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await getUserById(req.user!.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/', protect, authorize('ADMIN'), async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', protect, authorize('ADMIN'), async (req, res, next) => {
  try {
    const user = await toggleUserStatus(Number(req.params.id));
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export const usersRouter = router;
