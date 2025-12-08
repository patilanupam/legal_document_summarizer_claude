const request = require('supertest');
const app = require('../../backend/server');
const Document = require('../../backend/models/Document');
const Comment = require('../../backend/models/Comment');
const path = require('path');
const fs = require('fs');

describe('Task 06: Cascading Deletes & Referential Integrity', () => {
  let lawyerToken, clientToken, lawyerId, clientId, testDocumentId;

  beforeEach(async () => {
    const lawyerRes = await request(app).post('/api/auth/register').send({
      name: 'Lawyer', email: 'lawyer@cascade.com', password: 'lawyer123', role: 'lawyer'
    });
    lawyerToken = lawyerRes.body.token;
    lawyerId = lawyerRes.body._id;

    const clientRes = await request(app).post('/api/auth/register').send({
      name: 'Client', email: 'client@cascade.com', password: 'client123', role: 'client'
    });
    clientToken = clientRes.body.token;
    clientId = clientRes.body._id;

    const testFile = path.join(__dirname, 'cascade-test.txt');
    fs.writeFileSync(testFile, 'Cascade test document');

    const docRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', 'Test Document')
      .attach('file', testFile);

    testDocumentId = docRes.body._id;
    fs.unlinkSync(testFile);
  });

  test('should delete document with no comments', async () => {
    const res = await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);

    const document = await Document.findById(testDocumentId);
    expect(document).toBeNull();

    const comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);
  });

  test('should cascade delete all comments', async () => {
    await Comment.create({ documentId: testDocumentId, userId: lawyerId, text: 'Comment 1' });
    await Comment.create({ documentId: testDocumentId, userId: lawyerId, text: 'Comment 2' });
    await Comment.create({ documentId: testDocumentId, userId: clientId, text: 'Comment 3' });

    let comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(3);

    await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    const document = await Document.findById(testDocumentId);
    expect(document).toBeNull();

    comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);
  });

  test('should prevent orphaned comment creation', async () => {
    const fakeDocumentId = '507f1f77bcf86cd799439011';

    try {
      await Comment.create({ documentId: fakeDocumentId, userId: lawyerId, text: 'Orphan comment' });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('Document does not exist');
    }
  });

  test('should validate referential integrity', async () => {
    const comment = await Comment.create({ documentId: testDocumentId, userId: lawyerId, text: 'Valid comment' });
    expect(comment).toBeDefined();
    expect(comment.documentId.toString()).toBe(testDocumentId);

    await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    try {
      await Comment.create({ documentId: testDocumentId, userId: clientId, text: 'After deletion' });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('should handle many comments efficiently', async () => {
    const commentPromises = [];
    for (let i = 0; i < 50; i++) {
      commentPromises.push(
        Comment.create({ documentId: testDocumentId, userId: lawyerId, text: `Comment ${i}` })
      );
    }

    await Promise.all(commentPromises);

    let comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(50);

    const startTime = Date.now();

    await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    const duration = Date.now() - startTime;

    comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);
    expect(duration).toBeLessThan(5000);
  });

  test('should not create orphaned comments via API', async () => {
    const fakeDocumentId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .post(`/api/documents/${fakeDocumentId}/comments`)
      .set('Authorization', `Bearer ${lawyerToken}`)
      .send({ text: 'Comment on non-existent doc' });

    expect([400, 404]).toContain(res.statusCode);

    const comments = await Comment.find({ documentId: fakeDocumentId });
    expect(comments.length).toBe(0);
  });

  test('should maintain database consistency', async () => {
    await Comment.create({ documentId: testDocumentId, userId: lawyerId, text: 'Consistency test' });

    const initialDocCount = await Document.countDocuments();
    const initialCommentCount = await Comment.countDocuments();

    await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    const document = await Document.findById(testDocumentId);
    expect(document).toBeNull();

    const comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);

    const finalDocCount = await Document.countDocuments();
    const finalCommentCount = await Comment.countDocuments();

    expect(finalDocCount).toBe(initialDocCount - 1);
    expect(finalCommentCount).toBe(initialCommentCount - 1);
  });

  test('should delete with mixed ownership comments', async () => {
    await Comment.create({ documentId: testDocumentId, userId: lawyerId, text: 'Lawyer comment' });
    await Comment.create({ documentId: testDocumentId, userId: clientId, text: 'Client comment' });

    let comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(2);

    await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    const document = await Document.findById(testDocumentId);
    expect(document).toBeNull();

    comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);
  });
});
