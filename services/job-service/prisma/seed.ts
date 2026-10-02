import 'dotenv/config';
import { PrismaClient } from '../src/generated/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const recruiterResponse = await fetch(
    `${process.env.USER_SERVICE_URL ?? 'http://localhost:4003'}/internal/users?email=recruiter%40jobportal.local`,
    {
      headers: { 'x-internal-service-key': process.env.INTERNAL_SERVICE_KEY ?? 'development-internal-key' },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!recruiterResponse.ok) {
    throw new Error(`Could not resolve demo recruiter (${recruiterResponse.status}): ${await recruiterResponse.text()}`);
  }
  const recruiter = await recruiterResponse.json() as { id: number };
  const recruiterId = recruiter.id;
  const jobs = [
    {
      id: 1, title: 'Senior Frontend Engineer', company: 'Northstar Labs',
      description: 'Build modern interfaces and collaborate with product teams.',
      requiredSkills: JSON.stringify(['React', 'TypeScript', 'UI Testing']), location: 'Remote',
      salaryMin: 120000, salaryMax: 160000, experience: '5+ years', employmentType: 'Full-time',
      category: 'Engineering', openings: 2, applicationDeadline: new Date(Date.now() + 30 * 86400000),
      status: 'ACTIVE', approved: true, recruiterId,
    },
    {
      id: 2, title: 'Platform Engineer', company: 'CloudPeak',
      description: 'Manage infrastructure, deployment pipelines, and observability.',
      requiredSkills: JSON.stringify(['Kubernetes', 'Docker', 'CI/CD']), location: 'Berlin',
      salaryMin: 110000, salaryMax: 150000, experience: '3+ years', employmentType: 'Full-time',
      category: 'DevOps', openings: 1, applicationDeadline: new Date(Date.now() + 24 * 86400000),
      status: 'ACTIVE', approved: true, recruiterId,
    },
  ];
  for (const job of jobs) {
    await prisma.job.upsert({ where: { id: job.id }, update: {}, create: job });
  }
  console.log('Job Service seed data ready');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
