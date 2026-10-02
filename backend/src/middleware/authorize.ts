import { NextFunction, Request, Response } from 'express';

export function authorize(...roles: Array<'ADMIN' | 'RECRUITER' | 'APPLICANT'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }

    return next();
  };
}
