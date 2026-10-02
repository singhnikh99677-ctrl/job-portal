import { NextFunction, Request, Response } from 'express';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const errorObject = error instanceof Error ? error : { message: 'Something went wrong' };
  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number((error as { statusCode?: number }).statusCode ?? 500)
      : 500;
  const stack = error instanceof Error ? error.stack : undefined;

  res.status(statusCode).json({
    message: errorObject.message ?? 'Something went wrong',
    stack: process.env.NODE_ENV === 'production' ? undefined : stack,
  });
}
