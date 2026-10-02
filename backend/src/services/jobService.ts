import { prisma } from '../lib/prisma.js';

type JobFilters = Record<string, string | undefined>;
type JobInput = {
  title?: string;
  company?: string;
  description?: string;
  requiredSkills?: string[];
  location?: string;
  salaryMin?: number | string;
  salaryMax?: number | string;
  experience?: string;
  employmentType?: string;
  category?: string;
  openings?: number | string;
  applicationDeadline?: string | Date;
  status?: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  approved?: boolean;
};

function toRequiredString(value: string | undefined, fallback: string) {
  return value ?? fallback;
}

function serializeSkills(skills?: string[]) {
  return JSON.stringify(skills ?? []);
}

function deserializeSkills(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export async function listJobs(filters: JobFilters = {}) {
  const where: Record<string, unknown> = {};

  if (filters.title) {
    where.title = { contains: filters.title, mode: 'insensitive' };
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  if (filters.category) {
    where.category = { contains: filters.category, mode: 'insensitive' };
  }

  if (filters.employmentType) {
    where.employmentType = { contains: filters.employmentType, mode: 'insensitive' };
  }

  if (filters.status) {
    where.status = filters.status as 'DRAFT' | 'ACTIVE' | 'CLOSED';
  }

  const jobs = await prisma.job.findMany({
    where,
    include: { recruiter: true },
    orderBy: { postedAt: 'desc' },
  });

  return jobs.map((job) => ({
    ...job,
    requiredSkills: deserializeSkills(job.requiredSkills),
  }));
}

export async function getJobById(jobId: number) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      recruiter: true,
      applications: { include: { applicant: true } },
    },
  });

  if (!job) {
    return null;
  }

  return {
    ...job,
    requiredSkills: deserializeSkills(job.requiredSkills),
    applications: job.applications.map((application) => ({
      ...application,
      applicant: application.applicant,
    })),
  };
}

export async function createJob(input: JobInput, recruiterId: number) {
  const createdJob = await prisma.job.create({
    data: {
      title: toRequiredString(input.title, ''),
      company: toRequiredString(input.company, ''),
      description: toRequiredString(input.description, ''),
      requiredSkills: serializeSkills(input.requiredSkills),
      location: toRequiredString(input.location, ''),
      salaryMin: input.salaryMin !== undefined ? Number(input.salaryMin) : null,
      salaryMax: input.salaryMax !== undefined ? Number(input.salaryMax) : null,
      experience: toRequiredString(input.experience, ''),
      employmentType: toRequiredString(input.employmentType, ''),
      category: toRequiredString(input.category, ''),
      openings: Number(input.openings ?? 1),
      applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
      approved: input.approved ?? true,
      recruiterId,
    },
    include: { recruiter: true },
  });

  return {
    ...createdJob,
    requiredSkills: deserializeSkills(createdJob.requiredSkills),
  };
}

export async function updateJob(jobId: number, input: JobInput, userId: number, role: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw Object.assign(new Error('Job not found'), { statusCode: 404 });
  }

  if (role !== 'ADMIN' && job.recruiterId !== userId) {
    throw Object.assign(new Error('Not allowed to edit this job'), { statusCode: 403 });
  }

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: {
      title: input.title ?? job.title,
      company: input.company ?? job.company,
      description: input.description ?? job.description,
      requiredSkills: input.requiredSkills ? serializeSkills(input.requiredSkills) : serializeSkills(deserializeSkills(job.requiredSkills)),
      location: input.location ?? job.location,
      salaryMin: input.salaryMin !== undefined ? Number(input.salaryMin) : job.salaryMin,
      salaryMax: input.salaryMax !== undefined ? Number(input.salaryMax) : job.salaryMax,
      experience: input.experience ?? job.experience,
      employmentType: input.employmentType ?? job.employmentType,
      category: input.category ?? job.category,
      openings: input.openings !== undefined ? Number(input.openings) : job.openings,
      applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : job.applicationDeadline,
      status: input.status ?? job.status,
      approved: input.approved ?? job.approved,
    },
    include: { recruiter: true },
  });

  return {
    ...updatedJob,
    requiredSkills: deserializeSkills(updatedJob.requiredSkills),
  };
}

export async function removeJob(jobId: number, userId: number, role: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw Object.assign(new Error('Job not found'), { statusCode: 404 });
  }

  if (role !== 'ADMIN' && job.recruiterId !== userId) {
    throw Object.assign(new Error('Not allowed to delete this job'), { statusCode: 403 });
  }

  await prisma.application.deleteMany({ where: { jobId } });
  await prisma.job.delete({ where: { id: jobId } });
  return { success: true };
}
