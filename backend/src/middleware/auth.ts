import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function protect(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: number;
      email: string;
      role: 'ADMIN' | 'RECRUITER' | 'APPLICANT';
    };

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
