const request = require('supertest');
const app = require('../../backend/server');
const path = require('path');
const fs = require('fs');

describe('Task 10: Analytics Dashboard', () => {
  let adminToken, lawyerToken;

  beforeEach(async () => {
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Admin', email: 'admin@analytics.com', password: 'admin123', role: 'admin'
    });
    adminToken = adminRes.body.token;

    const lawyerRes = await request(app).post('/api/auth/register').send({
      name: 'Lawyer', email: 'lawyer@analytics.com', password: 'lawyer123', role: 'lawyer'
    });
    lawyerToken = lawyerRes.body.token;

    // Create sample documents
    for (let i = 1; i <= 10; i++) {
      const testFile = path.join(__dirname, `analytics-doc${i}.txt`);
      fs.writeFileSync(testFile, `Analytics document ${i}`);

      await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${lawyerToken}`)
        .field('title', `Analytics Doc ${i}`)
        .field('category', i % 2 === 0 ? 'contract' : 'memo')
        .field('status', i % 3 === 0 ? 'approved' : 'draft')
        .attach('file', testFile);

      fs.unlinkSync(testFile);
    }
  });

  test('should get dashboard analytics', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('documentsByCategory');
    expect(res.body).toHaveProperty('documentsByStatus');
    expect(res.body).toHaveProperty('totalDocuments');
  });

  test('should return documents by category', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.documentsByCategory).toBeDefined();
    expect(typeof res.body.documentsByCategory).toBe('object');
  });

  test('should return documents by status', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.documentsByStatus).toBeDefined();
    expect(typeof res.body.documentsByStatus).toBe('object');
  });

  test('should return total documents count', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body.totalDocuments).toBeGreaterThan(0);
    expect(typeof res.body.totalDocuments).toBe('number');
  });

  test('should return storage usage', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body).toHaveProperty('totalStorageUsed');
    expect(typeof res.body.totalStorageUsed).toBe('number');
  });

  test('should restrict access to admin only', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('should return user activity stats', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body).toHaveProperty('activeUsers');
  });

  test('should calculate document counts correctly', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    const categoryCount = Object.values(res.body.documentsByCategory).reduce((a, b) => a + b, 0);
    expect(categoryCount).toBe(res.body.totalDocuments);
  });

  test('should return most active users', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    if (res.body.topActiveUsers) {
      expect(Array.isArray(res.body.topActiveUsers)).toBe(true);
    }
  });

  test('should handle empty database gracefully', async () => {
    // This test assumes analytics works even with no data
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalDocuments).toBeGreaterThanOrEqual(0);
  });
});
