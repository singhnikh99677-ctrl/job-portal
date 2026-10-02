import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = { id: number; email: string; role: string };
declare module 'express-serve-static-core' {
  interface Request { user?: AuthUser }
}

export function protect(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? 'development-secret') as {
      userId: number; email: string; role: string;
    };
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireInternal(req: Request, res: Response, next: NextFunction) {
  if (req.header('x-internal-service-key') !== (process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key')) {
    return res.status(403).json({ message: 'Internal service authentication required' });
  }
  return next();
}
