import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/server.js';

describe('combined OpenAPI documentation', () => {
  it('serves Swagger UI from the gateway', async () => {
    const response = await request(app).get('/docs/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });

  it('documents the real public APIs for all four services', async () => {
    const response = await request(app).get('/docs/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.tags.map((tag: { name: string }) => tag.name)).toEqual([
      'Auth Service',
      'User Service',
      'Job Service',
      'Application Service',
    ]);
    expect(response.body.paths['/api/auth/login'].post).toBeDefined();
    expect(response.body.paths['/api/users/{id}/profile'].get).toBeDefined();
    expect(response.body.paths['/api/jobs/{id}'].delete).toBeDefined();
    expect(response.body.paths['/api/jobs/{id}'].patch).toBeDefined();
    expect(response.body.paths['/api/applications/user/{userId}'].get).toBeDefined();
    expect(response.body.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(response.body.paths['/api/applications'].post.requestBody.content['multipart/form-data']).toBeDefined();
  });
});
