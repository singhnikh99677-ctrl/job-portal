export type Role = 'ADMIN' | 'RECRUITER' | 'APPLICANT';

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  employmentType: string;
  category: string;
  description: string;
  approved?: boolean;
  recruiter?: Partial<User>;
};
