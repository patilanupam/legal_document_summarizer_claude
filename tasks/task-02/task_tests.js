const request = require('supertest');
const app = require('../../backend/server');
const Document = require('../../backend/models/Document');
const path = require('path');
const fs = require('fs');

describe('Task 02: Advanced Search with Pagination', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'search@example.com',
        password: 'test123',
        role: 'lawyer'
      });
    token = res.body.token;

    // Create test documents
    for (let i = 1; i <= 25; i++) {
      const testFile = path.join(__dirname, `doc${i}.txt`);
      fs.writeFileSync(testFile, `Document ${i} content`);

      await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('title', `Document ${i}`)
        .field('description', `Description ${i}`)
        .field('category', i % 2 === 0 ? 'contract' : 'memo')
        .field('status', i % 3 === 0 ? 'approved' : 'draft')
        .attach('file', testFile);

      fs.unlinkSync(testFile);
    }
  });

  afterEach(async () => {
    const documents = await Document.find({});
    for (const doc of documents) {
      if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    }
  });

  test('should return paginated results', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=Document&page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.documents.length).toBe(10);
    expect(res.body).toHaveProperty('totalCount');
    expect(res.body).toHaveProperty('totalPages');
    expect(res.body).toHaveProperty('currentPage');
  });

  test('should filter by category', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=Document&category=contract')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.documents.every(doc => doc.category === 'contract')).toBe(true);
  });

  test('should filter by status', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=Document&status=approved')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.documents.every(doc => doc.status === 'approved')).toBe(true);
  });

  test('should filter by date range', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const res = await request(app)
      .get(`/api/documents/search?query=Document&dateFrom=${yesterday.toISOString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.documents.length).toBeGreaterThan(0);
  });

  test('should support text search on title', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=Document')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.documents.length).toBeGreaterThan(0);
    expect(res.body.documents.every(doc => doc.title.includes('Document'))).toBe(true);
  });

  test('should support text search on description', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=Description')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.documents.length).toBeGreaterThan(0);
  });

  test('should handle empty search results', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=NonExistentDocument')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.documents.length).toBe(0);
    expect(res.body.totalCount).toBe(0);
  });

  test('should validate pagination parameters', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=Document&page=-1&limit=1000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.currentPage).toBeGreaterThan(0);
    expect(res.body.documents.length).toBeLessThanOrEqual(100);
  });

  test('should sort results by relevance', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=Document&sortBy=relevance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.documents.length).toBeGreaterThan(0);
  });

  test('should sort results by date', async () => {
    const res = await request(app)
      .get('/api/documents/search?query=Document&sortBy=date&order=desc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    const dates = res.body.documents.map(d => new Date(d.createdAt).getTime());
    const sortedDates = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sortedDates);
  });

  test('should prevent NoSQL injection', async () => {
    const res = await request(app)
      .get('/api/documents/search?query={"$gt":""}')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
  });
});
