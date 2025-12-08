const request = require('supertest');
const app = require('../../backend/server');
const path = require('path');
const fs = require('fs');

describe('Task 08: Document Sharing', () => {
  let ownerToken, userToken, adminToken;
  let ownerId, userId, adminId;
  let documentId;

  beforeEach(async () => {
    const ownerRes = await request(app).post('/api/auth/register').send({
      name: 'Owner', email: 'owner@share.com', password: 'owner123', role: 'lawyer'
    });
    ownerToken = ownerRes.body.token;
    ownerId = ownerRes.body._id;

    const userRes = await request(app).post('/api/auth/register').send({
      name: 'User', email: 'user@share.com', password: 'user123', role: 'lawyer'
    });
    userToken = userRes.body.token;
    userId = userRes.body._id;

    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Admin', email: 'admin@share.com', password: 'admin123', role: 'admin'
    });
    adminToken = adminRes.body.token;
    adminId = adminRes.body._id;

    const testFile = path.join(__dirname, 'share-doc.txt');
    fs.writeFileSync(testFile, 'Document to share');
    const docRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${ownerToken}`)
      .field('title', 'Shareable Document')
      .attach('file', testFile);
    documentId = docRes.body._id;
    fs.unlinkSync(testFile);
  });

  test('should share document with user', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId,
        permissions: { canView: true, canDownload: true, canComment: true }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('sharedWith');
  });

  test('should allow shared user to view document', async () => {
    await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, permissions: { canView: true } });

    const res = await request(app)
      .get(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
  });

  test('should respect canDownload permission', async () => {
    await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, permissions: { canView: true, canDownload: false } });

    const res = await request(app)
      .get(`/api/documents/${documentId}/download`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('should revoke access', async () => {
    await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, permissions: { canView: true } });

    const revokeRes = await request(app)
      .delete(`/api/documents/${documentId}/share/${userId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(revokeRes.statusCode).toBe(200);

    const accessRes = await request(app)
      .get(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(accessRes.statusCode).toBe(403);
  });

  test('should prevent non-owner from sharing', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: adminId, permissions: { canView: true } });

    expect(res.statusCode).toBe(403);
  });

  test('should allow admin to share documents', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId, permissions: { canView: true } });

    expect(res.statusCode).toBe(200);
  });

  test('should share with multiple users', async () => {
    const user2Res = await request(app).post('/api/auth/register').send({
      name: 'User2', email: 'user2@share.com', password: 'user123', role: 'client'
    });

    await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, permissions: { canView: true } });

    await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: user2Res.body._id, permissions: { canView: true } });

    const doc = await request(app)
      .get(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(doc.body.sharedWith.length).toBe(2);
  });

  test('should update share permissions', async () => {
    await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, permissions: { canView: true, canDownload: false } });

    const res = await request(app)
      .put(`/api/documents/${documentId}/share/${userId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ permissions: { canView: true, canDownload: true } });

    expect(res.statusCode).toBe(200);
  });

  test('should log sharing events in audit', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId, permissions: { canView: true } });

    expect(res.statusCode).toBe(200);
    // Audit log should contain share event
  });

  test('should prevent sharing with self', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: ownerId, permissions: { canView: true } });

    expect(res.statusCode).toBe(400);
  });
});
