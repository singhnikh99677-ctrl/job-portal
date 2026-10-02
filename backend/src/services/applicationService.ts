import { prisma } from '../lib/prisma.js';

type ResumeFileInput = {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
};

export async function listApplicationsForUser(userId: number, role: 'ADMIN' | 'RECRUITER' | 'APPLICANT') {
  if (role === 'APPLICANT') {
    return prisma.application.findMany({
      where: { applicantId: userId },
      include: { job: true, resume: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (role === 'RECRUITER') {
    const myJobs = await prisma.job.findMany({ where: { recruiterId: userId }, select: { id: true } });
    const ids = myJobs.map((job: { id: number }) => job.id);
    return prisma.application.findMany({
      where: { jobId: { in: ids } },
      include: { applicant: true, job: true, resume: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  return prisma.application.findMany({
    where: {},
    include: { applicant: true, job: true, resume: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createApplication(input: {
  applicantId: number;
  jobId: number;
  coverLetter?: string;
  resumeFile?: ResumeFileInput;
}) {
  const job = await prisma.job.findUnique({ where: { id: input.jobId } });
  if (!job) {
    throw Object.assign(new Error('Job not found'), { statusCode: 404 });
  }

  const existing = await prisma.application.findUnique({
    where: { applicantId_jobId: { applicantId: input.applicantId, jobId: input.jobId } },
  });

  if (existing) {
    throw Object.assign(new Error('You already applied to this job'), { statusCode: 409 });
  }

  let resumeId: number | null = null;

  if (input.resumeFile) {
    const resume = await prisma.resumeFile.create({
      data: {
        originalName: input.resumeFile.originalname,
        fileName: input.resumeFile.filename,
        mimeType: input.resumeFile.mimetype,
        size: input.resumeFile.size,
        path: input.resumeFile.path,
        userId: input.applicantId,
      },
    });
    resumeId = resume.id;
  }

  const application = await prisma.application.create({
    data: {
      applicantId: input.applicantId,
      jobId: input.jobId,
      coverLetter: input.coverLetter,
      resumeId,
      status: 'APPLIED',
    },
    include: { job: true, applicant: true, resume: true },
  });

  return application;
}

export async function updateApplicationStatus(applicationId: number, status: string, recruiterId: number, role: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });

  if (!application) {
    throw Object.assign(new Error('Application not found'), { statusCode: 404 });
  }

  if (role !== 'ADMIN' && application.job.recruiterId !== recruiterId) {
    throw Object.assign(new Error('You cannot update this application'), { statusCode: 403 });
  }

  return prisma.application.update({
    where: { id: applicationId },
    data: { status: status as 'APPLIED' | 'SHORTLISTED' | 'INTERVIEW' | 'REJECTED' | 'HIRED' },
    include: { applicant: true, job: true, resume: true },
  });
}
