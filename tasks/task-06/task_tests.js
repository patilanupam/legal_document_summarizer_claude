const request = require('supertest');
const app = require('../../backend/server');
const Document = require('../../backend/models/Document');
const Comment = require('../../backend/models/Comment');
const User = require('../../backend/models/User');
const path = require('path');
const fs = require('fs');

describe('Task 06: Cascading Deletes & Referential Integrity', () => {
  let lawyerToken, lawyerId;
  let clientToken, clientId;
  let testDocumentId;

  beforeEach(async () => {
    // Register lawyer user
    const lawyerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Lawyer User',
        email: 'lawyer@example.com',
        password: 'lawyer123',
        role: 'lawyer'
      });
    lawyerToken = lawyerRes.body.token;
    lawyerId = lawyerRes.body._id;

    // Register client user
    const clientRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Client User',
        email: 'client@example.com',
        password: 'client123',
        role: 'client'
      });
    clientToken = clientRes.body.token;
    clientId = clientRes.body._id;

    // Create test document
    const testFile = path.join(__dirname, 'test-doc.txt');
    fs.writeFileSync(testFile, 'Test document content for cascading deletes');

    const docRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${lawyerToken}`)
      .field('title', 'Test Document')
      .field('description', 'Document for testing cascading deletes')
      .attach('file', testFile);

    testDocumentId = docRes.body._id;
    fs.unlinkSync(testFile);
  });

  afterEach(async () => {
    // Cleanup - delete any remaining documents and their files
    const documents = await Document.find({});
    for (const doc of documents) {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
      // Also delete any version files
      if (doc.versions && doc.versions.length > 0) {
        for (const version of doc.versions) {
          if (fs.existsSync(version.filePath)) {
            fs.unlinkSync(version.filePath);
          }
        }
      }
    }
  });

  test('should delete document with no comments successfully', async () => {
    // Delete document that has no comments
    const res = await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);

    // Verify document is deleted
    const document = await Document.findById(testDocumentId);
    expect(document).toBeNull();

    // Verify no orphaned comments
    const comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);
  });

  test('should cascade delete all comments when document is deleted', async () => {
    // Create multiple comments on the document
    const comment1 = await Comment.create({
      documentId: testDocumentId,
      userId: lawyerId,
      text: 'First comment'
    });

    const comment2 = await Comment.create({
      documentId: testDocumentId,
      userId: clientId,
      text: 'Second comment'
    });

    const comment3 = await Comment.create({
      documentId: testDocumentId,
      userId: lawyerId,
      text: 'Third comment'
    });

    // Verify comments were created
    let comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(3);

    // Delete the document
    const res = await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);

    // Verify document is deleted
    const document = await Document.findById(testDocumentId);
    expect(document).toBeNull();

    // Verify ALL comments are cascaded deleted
    comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);

    // Verify specific comments are gone
    const c1 = await Comment.findById(comment1._id);
    const c2 = await Comment.findById(comment2._id);
    const c3 = await Comment.findById(comment3._id);

    expect(c1).toBeNull();
    expect(c2).toBeNull();
    expect(c3).toBeNull();
  });

  test('should prevent creating comment on non-existent document', async () => {
    const fakeDocumentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist

    // Attempt to create comment on non-existent document
    try {
      await Comment.create({
        documentId: fakeDocumentId,
        userId: lawyerId,
        text: 'Comment on fake document'
      });

      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Should throw error about document not existing
      expect(error).toBeDefined();
      expect(error.message).toContain('Document does not exist');
    }
  });

  test('should validate referential integrity on comment creation', async () => {
    // Create comment on existing document - should work
    const comment = await Comment.create({
      documentId: testDocumentId,
      userId: lawyerId,
      text: 'Valid comment'
    });

    expect(comment).toBeDefined();
    expect(comment.documentId.toString()).toBe(testDocumentId);

    // Delete the document
    await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    // Try to create comment on now-deleted document - should fail
    try {
      await Comment.create({
        documentId: testDocumentId,
        userId: clientId,
        text: 'Comment after deletion'
      });

      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('Document does not exist');
    }
  });

  test('should handle cascade delete with many comments (performance test)', async () => {
    // Create many comments (50 comments)
    const commentPromises = [];
    for (let i = 0; i < 50; i++) {
      commentPromises.push(
        Comment.create({
          documentId: testDocumentId,
          userId: i % 2 === 0 ? lawyerId : clientId,
          text: `Comment number ${i + 1}`
        })
      );
    }

    await Promise.all(commentPromises);

    // Verify all comments were created
    let comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(50);

    // Delete document (should delete all 50 comments)
    const startTime = Date.now();

    const res = await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(res.statusCode).toBe(200);

    // Verify all comments are deleted
    comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);

    // Performance check: should complete reasonably fast (< 5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  test('should not create orphaned comments via API', async () => {
    // Try to add comment via API to non-existent document
    const fakeDocumentId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .post(`/api/documents/${fakeDocumentId}/comments`)
      .set('Authorization', `Bearer ${lawyerToken}`)
      .send({ text: 'Comment on non-existent doc' });

    // Should return 404 or 400
    expect([400, 404]).toContain(res.statusCode);

    // Verify comment was not created
    const comments = await Comment.find({ documentId: fakeDocumentId });
    expect(comments.length).toBe(0);
  });

  test('should maintain database consistency if cascade delete fails', async () => {
    // Create comments
    await Comment.create({
      documentId: testDocumentId,
      userId: lawyerId,
      text: 'Test comment for consistency check'
    });

    // Count initial documents and comments
    const initialDocCount = await Document.countDocuments();
    const initialCommentCount = await Comment.countDocuments();

    // Note: This test verifies that even if something goes wrong,
    // the system handles it gracefully. In a production scenario,
    // you might use transactions to ensure atomicity.

    // Delete document
    const res = await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    // Should succeed
    expect(res.statusCode).toBe(200);

    // Verify document is gone
    const document = await Document.findById(testDocumentId);
    expect(document).toBeNull();

    // Verify related comments are also gone (cascade worked)
    const comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);

    // Overall counts should be reduced
    const finalDocCount = await Document.countDocuments();
    const finalCommentCount = await Comment.countDocuments();

    expect(finalDocCount).toBe(initialDocCount - 1);
    expect(finalCommentCount).toBe(initialCommentCount - 1);
  });

  test('should delete document and cascade even with mixed ownership comments', async () => {
    // Create comments from different users
    await Comment.create({
      documentId: testDocumentId,
      userId: lawyerId,
      text: 'Lawyer comment'
    });

    await Comment.create({
      documentId: testDocumentId,
      userId: clientId,
      text: 'Client comment'
    });

    // Verify comments exist
    let comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(2);

    // Delete document as owner (lawyer)
    const res = await request(app)
      .delete(`/api/documents/${testDocumentId}`)
      .set('Authorization', `Bearer ${lawyerToken}`);

    expect(res.statusCode).toBe(200);

    // Verify document is deleted
    const document = await Document.findById(testDocumentId);
    expect(document).toBeNull();

    // Verify ALL comments are deleted regardless of who created them
    comments = await Comment.find({ documentId: testDocumentId });
    expect(comments.length).toBe(0);
  });
});
