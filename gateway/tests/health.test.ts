import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/server.js';

describe('gateway health', () => {
  it('reports its service status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'gateway' });
  });
});
