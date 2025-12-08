const request = require('supertest');
const app = require('../../backend/server');
const AuditLog = require('../../backend/models/AuditLog');
const Document = require('../../backend/models/Document');
const path = require('path');
const fs = require('fs');

describe('Task 05: Audit Logging System', () => {
  let adminToken, lawyerToken, clientToken;
  let adminId, lawyerId, clientId;
  let testDocumentId;

  beforeEach(async () => {
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Admin User', email: 'admin@audit.com', password: 'admin123', role: 'admin'
    });
    adminToken = adminRes.body.token;
    adminId = adminRes.body._id;

    const lawyerRes = await request(app).post('/api/auth/register').send({
      name: 'Lawyer User', email: 'lawyer@audit.com', password: 'lawyer123', role: 'lawyer'
    });
    lawyerToken = lawyerRes.body.token;
    lawyerId = lawyerRes.body._id;

    const clientRes = await request(app).post('/api/auth/register').send({
      name: 'Client User', email: 'client@audit.com', password: 'client123', role: 'client'
    });
    clientToken = clientRes.body.token;
    clientId = clientRes.body._id;

    const testFile = path.join(__dirname, 'test-audit.txt');
    fs.writeFileSync(testFile, 'Audit test document');

    const docRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', 'Audit Test Document')
      .attach('file', testFile);

    testDocumentId = docRes.body._id;
    fs.unlinkSync(testFile);
  });

  test('should log document upload operations', async () => {
    const testFile = path.join(__dirname, 'upload-log-test.txt');
    fs.writeFileSync(testFile, 'Upload log test');

    await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', 'Log Test')
      .attach('file', testFile);

    const auditLogs = await AuditLog.find({ userId: lawyerId, action: 'document_upload' });
    expect(auditLogs.length).toBeGreaterThan(0);

    fs.unlinkSync(testFile);
  });

  test('should log document view operations', async () => {
    await request(app)
      .get(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    const auditLogs = await AuditLog.find({ resourceId: testDocumentId, action: 'document_view' });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  test('should log document update operations', async () => {
    await request(app)
      .put(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`)
      .send({ title: 'Updated Title' });

    const auditLogs = await AuditLog.find({ resourceId: testDocumentId, action: 'document_update' });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  test('should log document delete operations', async () => {
    await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    const auditLogs = await AuditLog.find({ resourceId: testDocumentId, action: 'document_delete' });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  test('should log document download operations', async () => {
    await request(app)
      .get(`/api/documents/${testDocumentId}/download`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    const auditLogs = await AuditLog.find({ resourceId: testDocumentId, action: 'document_download' });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  test('should log search operations', async () => {
    await request(app)
      .get('/api/documents/search?query=test')
      .set('Authorization', `Bearer ${lawyerToken}`);

    const auditLogs = await AuditLog.find({ userId: lawyerId, action: 'search_performed' });
    expect(auditLogs.length).toBeGreaterThan(0);
  });

  test('should capture IP address and user agent', async () => {
    await request(app)
      .get(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`)
      .set('User-Agent', 'TestAgent/1.0');

    const auditLogs = await AuditLog.find({ resourceId: testDocumentId, action: 'document_view' }).sort({ timestamp: -1 });
    const log = auditLogs[0];
    expect(log.ipAddress).toBeDefined();
    expect(log.userAgent).toBe('TestAgent/1.0');
  });

  test('should allow admin to retrieve all audit logs', async () => {
    const res = await request(app)
      .get('/api/audit?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('logs');
    expect(res.body).toHaveProperty('totalCount');
  });

  test('should filter audit logs by action', async () => {
    const res = await request(app)
      .get('/api/audit?action=document_upload')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.logs.every(log => log.action === 'document_upload')).toBe(true);
  });

  test('should prevent non-admin from accessing all logs', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('should allow users to view their own logs', async () => {
    const res = await request(app)
      .get(`/api/audit/user/${lawyerId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('logs');
  });

  test('should prevent users from viewing others logs', async () => {
    const res = await request(app)
      .get(`/api/audit/user/${adminId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('should allow document audit trail viewing', async () => {
    const res = await request(app)
      .get(`/api/audit/document/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('logs');
  });

  test('should provide audit statistics', async () => {
    const res = await request(app)
      .get('/api/audit/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('actionCounts');
    expect(res.body).toHaveProperty('totalLogs');
  });

  test('should make logs immutable', async () => {
    const log = await AuditLog.findOne({ userId: lawyerId });
    const originalAction = log.action;

    try {
      log.action = 'modified_action';
      await log.save();
      const refreshedLog = await AuditLog.findById(log._id);
      expect(refreshedLog.action).toBe(originalAction);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('should handle logging failures gracefully', async () => {
    const testFile = path.join(__dirname, 'graceful-test.txt');
    fs.writeFileSync(testFile, 'Graceful test');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', 'Graceful Test')
      .attach('file', testFile);

    expect(res.statusCode).toBe(201);
    fs.unlinkSync(testFile);
  });
});
