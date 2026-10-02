import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const recruiterPassword = await bcrypt.hash('Recruiter@123', 10);
  const applicantPassword = await bcrypt.hash('Applicant@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@jobportal.local' },
    update: {},
    create: {
      email: 'admin@jobportal.local',
      passwordHash: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  const recruiter = await prisma.user.upsert({
    where: { email: 'recruiter@jobportal.local' },
    update: {},
    create: {
      email: 'recruiter@jobportal.local',
      passwordHash: recruiterPassword,
      name: 'Alex Recruiter',
      role: 'RECRUITER',
      isActive: true,
    },
  });

  const applicant = await prisma.user.upsert({
    where: { email: 'applicant@jobportal.local' },
    update: {},
    create: {
      email: 'applicant@jobportal.local',
      passwordHash: applicantPassword,
      name: 'Jamie Applicant',
      role: 'APPLICANT',
      isActive: true,
    },
  });

  await prisma.job.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Senior Frontend Engineer',
      company: 'Northstar Labs',
      description: 'Build modern interfaces and collaborate with product teams.',
      requiredSkills: JSON.stringify(['React', 'TypeScript', 'UI Testing']),
      location: 'Remote',
      salaryMin: 120000,
      salaryMax: 160000,
      experience: '5+ years',
      employmentType: 'Full-time',
      category: 'Engineering',
      openings: 2,
      applicationDeadline: new Date(Date.now() + 1000 * 86400 * 30),
      status: 'ACTIVE',
      approved: true,
      recruiterId: recruiter.id,
    },
  });

  await prisma.job.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'Platform Engineer',
      company: 'CloudPeak',
      description: 'Manage infrastructure, deployment pipelines, and observability.',
      requiredSkills: JSON.stringify(['Kubernetes', 'Docker', 'CI/CD']),
      location: 'Berlin',
      salaryMin: 110000,
      salaryMax: 150000,
      experience: '3+ years',
      employmentType: 'Full-time',
      category: 'DevOps',
      openings: 1,
      applicationDeadline: new Date(Date.now() + 1000 * 86400 * 24),
      status: 'ACTIVE',
      approved: true,
      recruiterId: recruiter.id,
    },
  });

  await prisma.application.upsert({
    where: { applicantId_jobId: { applicantId: applicant.id, jobId: 1 } },
    update: {},
    create: {
      applicantId: applicant.id,
      jobId: 1,
      coverLetter: 'I am excited to apply for this role and bring my frontend expertise.',
      status: 'APPLIED',
    },
  });

  console.log('Seed data ready');
  console.log({ admin, recruiter, applicant });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
