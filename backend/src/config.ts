import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'development-secret',
  databaseUrl: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
