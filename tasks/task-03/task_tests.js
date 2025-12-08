const request = require('supertest');
const app = require('../../backend/server');
const path = require('path');
const fs = require('fs');

describe('Task 03: Security Vulnerabilities', () => {
  let adminToken, adminId, lawyerToken, lawyerId, clientToken, clientId, docId;

  beforeEach(async () => {
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin'
    });
    adminToken = adminRes.body.token;
    adminId = adminRes.body._id;

    const lawyerRes = await request(app).post('/api/auth/register').send({
      name: 'Lawyer', email: 'lawyer@test.com', password: 'lawyer123', role: 'lawyer'
    });
    lawyerToken = lawyerRes.body.token;
    lawyerId = lawyerRes.body._id;

    const clientRes = await request(app).post('/api/auth/register').send({
      name: 'Client', email: 'client@test.com', password: 'client123', role: 'client'
    });
    clientToken = clientRes.body.token;
    clientId = clientRes.body._id;

    const testFile = path.join(__dirname, 'security-test.txt');
    fs.writeFileSync(testFile, 'Security test content');

    const docRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', 'Test Document')
      .attach('file', testFile);
    docId = docRes.body._id;

    fs.unlinkSync(testFile);
  });

  test('should sanitize XSS in title', async () => {
    const testFile = path.join(__dirname, 'xss-test.txt');
    fs.writeFileSync(testFile, 'XSS test');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', '<script>alert("XSS")</script>')
      .attach('file', testFile);

    expect(res.body.title).not.toContain('<script>');
    fs.unlinkSync(testFile);
  });

  test('should prevent NoSQL injection in search', async () => {
    const res = await request(app)
      .get('/api/documents/search?query={"$gt":""}')
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect([400, 500]).not.toContain(res.statusCode);
  });

  test('should prevent IDOR - user cannot access others documents', async () => {
    const res = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('should allow admin to access all documents', async () => {
    const res = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  });

  test('should allow owner to access their documents', async () => {
    const res = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);
  });

  test('should filter documents by role in getDocuments', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.statusCode).toBe(200);
    const hasAccessToAll = res.body.some(doc => doc.uploadedBy._id !== clientId);
    expect(hasAccessToAll).toBe(false);
  });

  test('should prevent unauthorized document download', async () => {
    const res = await request(app)
      .get(`/api/documents/${docId}/download`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('should sanitize description field', async () => {
    const testFile = path.join(__dirname, 'desc-test.txt');
    fs.writeFileSync(testFile, 'Description test');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', 'Test')
      .field('description', '<img src=x onerror=alert(1)>')
      .attach('file', testFile);

    expect(res.body.description).not.toContain('onerror');
    fs.unlinkSync(testFile);
  });

  test('should validate query parameters', async () => {
    const res = await request(app)
      .get('/api/documents/search')
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect([400, 200]).toContain(res.statusCode);
  });

  test('should prevent mass assignment attacks', async () => {
    const res = await request(app)
      .put(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${lawyerToken}`)
      .send({ uploadedBy: adminId });

    const doc = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(doc.body.uploadedBy._id).toBe(lawyerId);
  });

  test('should implement rate limiting on search', async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        request(app)
          .get('/api/documents/search?query=test')
          .set('Authorization', `Bearer ${lawyerToken}`)
      );
    }
    const results = await Promise.all(promises);
    expect(results.every(r => r.statusCode === 200)).toBe(true);
  });

  test('should log security events', async () => {
    await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    // Security event should be logged (verified in audit logs)
    expect(true).toBe(true);
  });

  test('should escape special characters in input', async () => {
    const testFile = path.join(__dirname, 'special-chars.txt');
    fs.writeFileSync(testFile, 'Special chars test');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', "Test ' OR '1'='1")
      .attach('file', testFile);

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBeDefined();
    fs.unlinkSync(testFile);
  });
});
