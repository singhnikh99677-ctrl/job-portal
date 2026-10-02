import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { sanitizeUser } from '../utils/formatUser.js';

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'RECRUITER' | 'APPLICANT';
};

export type LoginInput = {
  email: string;
  password: string;
};

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existingUser) {
    throw Object.assign(new Error('User already exists'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: input.role ?? 'APPLICANT',
    },
  });

  return {
    token: generateToken(user),
    user: sanitizeUser(user),
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  return {
    token: generateToken(user),
    user: sanitizeUser(user),
  };
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return sanitizeUser(user);
}

function generateToken(user: { id: number; email: string; role: string }) {
  const role = user.role as 'ADMIN' | 'RECRUITER' | 'APPLICANT';
  return jwt.sign({ userId: user.id, email: user.email, role }, config.jwtSecret, { expiresIn: '7d' });
}
