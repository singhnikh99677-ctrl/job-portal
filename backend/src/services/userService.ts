import { prisma } from '../lib/prisma.js';
import { sanitizeUser } from '../utils/formatUser.js';

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return users.map((user: { passwordHash?: string; [key: string]: unknown }) => sanitizeUser(user));
}

export async function getUserById(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return sanitizeUser(user);
}

export async function toggleUserStatus(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  return sanitizeUser(updated);
}
