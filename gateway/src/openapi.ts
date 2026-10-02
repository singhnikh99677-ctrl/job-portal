const errorResponse = {
  description: 'Request failed',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

const idParameter = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'integer', minimum: 1 },
});

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Job Portal Microservices API',
    version: '1.0.0',
    description: 'Combined API documentation for the Auth, User, Job, and Application services. Requests go through the API Gateway.',
  },
  servers: [{ url: '/', description: 'Current API Gateway host' }],
  tags: [
    { name: 'Auth Service', description: 'Registration, login, and JWT verification' },
    { name: 'User Service', description: 'Profiles and user account operations' },
    { name: 'Job Service', description: 'Job search and recruiter job management' },
    { name: 'Application Service', description: 'Job applications and application status' },
  ],
  paths: {
    '/api/auth/health': {
      get: {
        tags: ['Auth Service'],
        summary: 'Auth Service health check',
        responses: { '200': { description: 'Auth Service is healthy' } },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth Service'],
        summary: 'Register an applicant or recruiter',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          '201': { description: 'Account registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '400': errorResponse,
          '409': errorResponse,
          '503': errorResponse,
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth Service'],
        summary: 'Log in and receive a JWT',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '400': errorResponse,
          '401': errorResponse,
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth Service'],
        summary: 'Get the authenticated account',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Authenticated account' }, '401': errorResponse },
      },
    },
    '/api/auth/verify': {
      post: {
        tags: ['Auth Service'],
        summary: 'Verify the bearer token',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Token is valid' }, '401': errorResponse },
      },
    },
    '/api/users/health': {
      get: {
        tags: ['User Service'],
        summary: 'User Service health check',
        responses: { '200': { description: 'User Service is healthy' } },
      },
    },
    '/api/users': {
      get: {
        tags: ['User Service'],
        summary: 'List users (admin only)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User profiles' }, '401': errorResponse, '403': errorResponse },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['User Service'],
        summary: 'Get the current user profile',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Current user profile' }, '401': errorResponse, '404': errorResponse },
      },
    },
    '/api/users/{id}': {
      parameters: [idParameter('id', 'User ID')],
      get: {
        tags: ['User Service'],
        summary: 'Get a user profile',
        responses: { '200': { description: 'User profile' }, '404': errorResponse },
      },
      put: {
        tags: ['User Service'],
        summary: 'Update the current user profile (or any profile as admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } },
        },
        responses: { '200': { description: 'Updated user profile' }, '400': errorResponse, '401': errorResponse, '403': errorResponse },
      },
    },
    '/api/users/{id}/profile': {
      parameters: [idParameter('id', 'User ID')],
      get: {
        tags: ['User Service'],
        summary: 'Get a profile (self or admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User profile' }, '401': errorResponse, '403': errorResponse, '404': errorResponse },
      },
    },
    '/api/users/{id}/status': {
      parameters: [idParameter('id', 'User ID')],
      patch: {
        tags: ['User Service'],
        summary: 'Toggle a user account status (admin only)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Updated user profile' }, '401': errorResponse, '403': errorResponse },
      },
    },
    '/api/jobs/health': {
      get: {
        tags: ['Job Service'],
        summary: 'Job Service health check',
        responses: { '200': { description: 'Job Service is healthy' } },
      },
    },
    '/api/jobs': {
      get: {
        tags: ['Job Service'],
        summary: 'Search jobs',
        parameters: [
          { name: 'title', in: 'query', schema: { type: 'string' } },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'employmentType', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'approved', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Matching jobs' }, '503': errorResponse },
      },
      post: {
        tags: ['Job Service'],
        summary: 'Create a job (recruiter or admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/JobCreateRequest' } } },
        },
        responses: { '201': { description: 'Job created' }, '400': errorResponse, '401': errorResponse, '403': errorResponse },
      },
    },
    '/api/jobs/{id}': {
      parameters: [idParameter('id', 'Job ID')],
      get: {
        tags: ['Job Service'],
        summary: 'Get a job',
        responses: { '200': { description: 'Job details' }, '404': errorResponse },
      },
      put: {
        tags: ['Job Service'],
        summary: 'Update a job (owner or admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/JobRequest' } } },
        },
        responses: { '200': { description: 'Updated job' }, '400': errorResponse, '401': errorResponse, '403': errorResponse },
      },
      patch: {
        tags: ['Job Service'],
        summary: 'Partially update a job (owner or admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/JobRequest' } } },
        },
        responses: { '200': { description: 'Updated job' }, '400': errorResponse, '401': errorResponse, '403': errorResponse },
      },
      delete: {
        tags: ['Job Service'],
        summary: 'Delete a job and its applications (owner or admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Job deleted' }, '401': errorResponse, '403': errorResponse, '503': errorResponse },
      },
    },
    '/api/applications/health': {
      get: {
        tags: ['Application Service'],
        summary: 'Application Service health check',
        responses: { '200': { description: 'Application Service is healthy' } },
      },
    },
    '/api/applications': {
      get: {
        tags: ['Application Service'],
        summary: 'List applications visible to the current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Applications with associated user and job details' }, '401': errorResponse, '503': errorResponse },
      },
      post: {
        tags: ['Application Service'],
        summary: 'Apply for a job (applicant only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/ApplicationRequest' },
            },
          },
        },
        responses: { '201': { description: 'Application created' }, '400': errorResponse, '401': errorResponse, '403': errorResponse, '503': errorResponse },
      },
    },
    '/api/applications/user/{userId}': {
      parameters: [idParameter('userId', 'Applicant user ID')],
      get: {
        tags: ['Application Service'],
        summary: 'List applications for a user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Applications for the user' }, '401': errorResponse, '403': errorResponse },
      },
    },
    '/api/applications/job/{jobId}': {
      parameters: [idParameter('jobId', 'Job ID')],
      get: {
        tags: ['Application Service'],
        summary: 'List applications for a job (owner or admin)',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Applications for the job' }, '401': errorResponse, '403': errorResponse, '404': errorResponse },
      },
    },
    '/api/applications/{id}': {
      parameters: [idParameter('id', 'Application ID')],
      get: {
        tags: ['Application Service'],
        summary: 'Get an application',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Application details' }, '401': errorResponse, '403': errorResponse, '404': errorResponse },
      },
    },
    '/api/applications/{id}/status': {
      parameters: [idParameter('id', 'Application ID')],
      put: {
        tags: ['Application Service'],
        summary: 'Update application status (recruiter or admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApplicationStatusRequest' } } },
        },
        responses: { '200': { description: 'Updated application' }, '400': errorResponse, '401': errorResponse, '403': errorResponse, '404': errorResponse },
      },
      patch: {
        tags: ['Application Service'],
        summary: 'Update application status (recruiter or admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApplicationStatusRequest' } } },
        },
        responses: { '200': { description: 'Updated application' }, '400': errorResponse, '401': errorResponse, '403': errorResponse, '404': errorResponse },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Use the JWT returned by POST /api/auth/login or /api/auth/register.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          success: { type: 'boolean' },
          error: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['APPLICANT', 'RECRUITER', 'ADMIN'] },
          isActive: { type: 'boolean' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'name', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 2 },
          password: { type: 'string', minLength: 8 },
          role: { type: 'string', enum: ['APPLICANT', 'RECRUITER'], default: 'APPLICANT' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT bearer token' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
        },
      },
      JobRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          company: { type: 'string' },
          description: { type: 'string' },
          requiredSkills: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          salaryMin: { type: 'number', nullable: true },
          salaryMax: { type: 'number', nullable: true },
          experience: { type: 'string' },
          employmentType: { type: 'string' },
          category: { type: 'string' },
          openings: { type: 'integer', minimum: 1 },
          applicationDeadline: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string' },
          approved: { type: 'boolean' },
        },
      },
      JobCreateRequest: {
        allOf: [
          { $ref: '#/components/schemas/JobRequest' },
          {
            type: 'object',
            required: ['title', 'company', 'description', 'requiredSkills', 'location', 'experience', 'employmentType', 'category', 'openings'],
          },
        ],
      },
      ApplicationRequest: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'integer', minimum: 1 },
          coverLetter: { type: 'string' },
          resume: { type: 'string', format: 'binary', description: 'Optional PDF, DOC, or DOCX file (max 5 MB)' },
        },
      },
      ApplicationStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED', 'HIRED'] },
        },
      },
    },
  },
} as const;

export default openApiSpec;
