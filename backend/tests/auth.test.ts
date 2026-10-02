import { describe, expect, it } from 'vitest';
import { sanitizeUser } from '../src/utils/formatUser.js';

describe('sanitizeUser', () => {
  it('removes passwordHash from user payload', () => {
    const user = {
      id: 1,
      email: 'applicant@jobportal.local',
      name: 'Jamie Applicant',
      role: 'APPLICANT',
      passwordHash: 'secret-hash',
      isActive: true,
    };

    expect(sanitizeUser(user)).toEqual({
      id: 1,
      email: 'applicant@jobportal.local',
      name: 'Jamie Applicant',
      role: 'APPLICANT',
      isActive: true,
    });
  });
});
