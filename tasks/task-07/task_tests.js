const request = require('supertest');
const app = require('../../backend/server');
const path = require('path');
const fs = require('fs');

describe('Task 07: Enhanced RBAC', () => {
  let adminToken, lawyerToken, lawyer2Token, clientToken;
  let adminId, lawyerId, lawyer2Id, clientId;
  let lawyer1DocId, lawyer2DocId;

  beforeEach(async () => {
    const adminRes = await request(app).post('/api/auth/register').send({
      name: 'Admin', email: 'admin@rbac.com', password: 'admin123', role: 'admin'
    });
    adminToken = adminRes.body.token;
    adminId = adminRes.body._id;

    const lawyer1Res = await request(app).post('/api/auth/register').send({
      name: 'Lawyer1', email: 'lawyer1@rbac.com', password: 'lawyer123', role: 'lawyer'
    });
    lawyerToken = lawyer1Res.body.token;
    lawyerId = lawyer1Res.body._id;

    const lawyer2Res = await request(app).post('/api/auth/register').send({
      name: 'Lawyer2', email: 'lawyer2@rbac.com', password: 'lawyer123', role: 'lawyer'
    });
    lawyer2Token = lawyer2Res.body.token;
    lawyer2Id = lawyer2Res.body._id;

    const clientRes = await request(app).post('/api/auth/register').send({
      name: 'Client', email: 'client@rbac.com', password: 'client123', role: 'client'
    });
    clientToken = clientRes.body.token;
    clientId = clientRes.body._id;

    // Create documents
    const testFile1 = path.join(__dirname, 'lawyer1-doc.txt');
    fs.writeFileSync(testFile1, 'Lawyer 1 document');
    const doc1Res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', 'Lawyer 1 Document')
      .attach('file', testFile1);
    lawyer1DocId = doc1Res.body._id;
    fs.unlinkSync(testFile1);

    const testFile2 = path.join(__dirname, 'lawyer2-doc.txt');
    fs.writeFileSync(testFile2, 'Lawyer 2 document');
    const doc2Res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyer2Token}`)
      .field('title', 'Lawyer 2 Document')
      .attach('file', testFile2);
    lawyer2DocId = doc2Res.body._id;
    fs.unlinkSync(testFile2);
  });

  test('admin should see all documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('lawyer should see only own documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);
    const ownDocs = res.body.filter(doc => doc.uploadedBy._id === lawyerId);
    expect(ownDocs.length).toBeGreaterThan(0);
  });

  test('client should see only assigned documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.statusCode).toBe(200);
    const assignedDocs = res.body.filter(doc =>
      doc.assignedTo.some(user => user._id === clientId)
    );
    expect(res.body.length).toBe(assignedDocs.length);
  });

  test('should prevent unauthorized document access', async () => {
    const res = await request(app)
      .get(`/api/documents/${lawyer1DocId}`)
      .set('Authorization', `Bearer ${lawyer2Token}`);

    expect(res.statusCode).toBe(403);
  });

  test('should allow owner to access document', async () => {
    const res = await request(app)
      .get(`/api/documents/${lawyer1DocId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);
  });

  test('should allow admin to access any document', async () => {
    const res = await request(app)
      .get(`/api/documents/${lawyer1DocId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
  });

  test('should prevent unauthorized download', async () => {
    const res = await request(app)
      .get(`/api/documents/${lawyer1DocId}/download`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('should allow assigned user to view document', async () => {
    await request(app)
      .put(`/api/documents/${lawyer1DocId}`)
      .set('Authorization', `Bearer ${lawyerToken}`)
      .send({ assignedTo: [clientId] });

    const res = await request(app)
      .get(`/api/documents/${lawyer1DocId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.statusCode).toBe(200);
  });

  test('should enforce access control on update', async () => {
    const res = await request(app)
      .put(`/api/documents/${lawyer1DocId}`)
      .set('Authorization', `Bearer ${lawyer2Token}`)
      .send({ title: 'Unauthorized Update' });

    expect(res.statusCode).toBe(403);
  });

  test('should enforce access control on delete', async () => {
    const res = await request(app)
      .delete(`/api/documents/${lawyer1DocId}`)
      .set('Authorization', `Bearer ${lawyer2Token}`);

    expect(res.statusCode).toBe(403);
  });
});
