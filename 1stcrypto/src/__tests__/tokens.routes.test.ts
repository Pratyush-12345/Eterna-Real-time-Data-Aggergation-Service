import request from 'supertest';
import { app } from '../app';

describe('Tokens Routes', () => {
  it('GET /api/tokens should return 200 and a data array', async () => {
    const res = await request(app).get('/api/tokens');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBe(res.body.data.length);
  }, 15000);

  it('GET /api/tokens/search with no match should return empty array', async () => {
    const res = await request(app).get('/api/tokens/search?q=nonexistent');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('POST /api/tokens/cache/invalidate should return 200', async () => {
    const res = await request(app)
      .post('/api/tokens/cache/invalidate')
      .send({});
    expect(res.status).toBe(200);
  });

  it('GET /health should return status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/tokens/filter without params should return 200', async () => {
  const res = await request(app).get('/api/tokens/filter');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.data)).toBe(true);
}, 15000);
});
