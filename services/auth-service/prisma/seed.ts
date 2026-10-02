import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/client/index.js';

const prisma = new PrismaClient();
const internalKey = process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key';

async function main() {
  const users = [
    { email: 'admin@jobportal.local', name: 'System Admin', password: 'Admin@123', role: 'ADMIN' },
    { email: 'recruiter@jobportal.local', name: 'Alex Recruiter', password: 'Recruiter@123', role: 'RECRUITER' },
    { email: 'applicant@jobportal.local', name: 'Jamie Applicant', password: 'Applicant@123', role: 'APPLICANT' },
  ];
  for (const user of users) {
    const saved = await prisma.credential.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: await bcrypt.hash(user.password, 10),
        role: user.role,
      },
    });
    const response = await fetch(`${process.env.USER_SERVICE_URL ?? 'http://localhost:4003'}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-service-key': internalKey },
      body: JSON.stringify({ id: saved.id, email: saved.email, name: saved.name, role: saved.role }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Could not seed user profile (${response.status}): ${await response.text()}`);
  }
  console.log('Auth and user seed data ready');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
