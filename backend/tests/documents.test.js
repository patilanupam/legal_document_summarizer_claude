const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

describe('Documents API', () => {
  let token;
  let userId;

  beforeEach(async () => {
    // Register and login
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Doc User',
        email: 'doc@example.com',
        password: 'password123',
        role: 'lawyer'
      });

    token = res.body.token;
    userId = res.body._id;

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads');
    }
  });

  describe('POST /api/documents/upload', () => {
    it('should upload a document', async () => {
      // Create a test file
      const testFile = path.join(__dirname, 'test.txt');
      fs.writeFileSync(testFile, 'Test document content');

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Test Document')
        .field('description', 'Test description')
        .field('category', 'contract')
        .attach('file', testFile);

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('Test Document');
      expect(res.body.category).toBe('contract');

      // Cleanup
      fs.unlinkSync(testFile);
    });

    it('should not upload without authentication', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .field('title', 'Test Document');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/documents', () => {
    it('should get all documents', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should not get documents without authentication', async () => {
      const res = await request(app)
        .get('/api/documents');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/documents/search', () => {
    it('should search documents', async () => {
      const res = await request(app)
        .get('/api/documents/search?query=test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should require query parameter', async () => {
      const res = await request(app)
        .get('/api/documents/search')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });
  });
});
