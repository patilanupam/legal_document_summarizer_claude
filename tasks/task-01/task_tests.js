const request = require('supertest');
const app = require('../../backend/server');
const Document = require('../../backend/models/Document');
const User = require('../../backend/models/User');
const path = require('path');
const fs = require('fs');

describe('Task 01: Document Version Control', () => {
  let token, userId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123',
        role: 'lawyer'
      });
    token = res.body.token;
    userId = res.body._id;
  });

  afterEach(async () => {
    const documents = await Document.find({});
    for (const doc of documents) {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
      if (doc.versions && doc.versions.length > 0) {
        for (const version of doc.versions) {
          if (fs.existsSync(version.filePath)) {
            fs.unlinkSync(version.filePath);
          }
        }
      }
    }
  });

  test('should create initial document with version 1', async () => {
    const testFile = path.join(__dirname, 'test.txt');
    fs.writeFileSync(testFile, 'Initial content');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Test Document')
      .field('description', 'Test description')
      .attach('file', testFile);

    expect(res.statusCode).toBe(201);
    expect(res.body.versions).toBeDefined();
    expect(res.body.versions.length).toBe(1);
    expect(res.body.versions[0].versionNumber).toBe(1);

    fs.unlinkSync(testFile);
  });

  test('should create new version with correct version number', async () => {
    const testFile1 = path.join(__dirname, 'test1.txt');
    fs.writeFileSync(testFile1, 'Version 1 content');

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Versioned Document')
      .attach('file', testFile1);

    const documentId = uploadRes.body._id;

    const testFile2 = path.join(__dirname, 'test2.txt');
    fs.writeFileSync(testFile2, 'Version 2 content');

    const versionRes = await request(app)
      .post(`/api/documents/${documentId}/version`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testFile2);

    expect(versionRes.statusCode).toBe(200);
    expect(versionRes.body.versions.length).toBe(2);
    expect(versionRes.body.versions[1].versionNumber).toBe(2);

    fs.unlinkSync(testFile1);
    fs.unlinkSync(testFile2);
  });

  test('should preserve original filePath when uploading new version', async () => {
    const testFile1 = path.join(__dirname, 'original.txt');
    fs.writeFileSync(testFile1, 'Original content');

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Original Document')
      .attach('file', testFile1);

    const originalFilePath = uploadRes.body.filePath;
    const documentId = uploadRes.body._id;

    const testFile2 = path.join(__dirname, 'new-version.txt');
    fs.writeFileSync(testFile2, 'New version content');

    const versionRes = await request(app)
      .post(`/api/documents/${documentId}/version`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testFile2);

    expect(versionRes.body.filePath).toBe(originalFilePath);

    fs.unlinkSync(testFile1);
    fs.unlinkSync(testFile2);
  });

  test('should maintain version history', async () => {
    const testFile1 = path.join(__dirname, 'v1.txt');
    fs.writeFileSync(testFile1, 'V1');

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Multi-version Doc')
      .attach('file', testFile1);

    const documentId = uploadRes.body._id;

    for (let i = 2; i <= 5; i++) {
      const testFile = path.join(__dirname, `v${i}.txt`);
      fs.writeFileSync(testFile, `V${i}`);

      await request(app)
        .post(`/api/documents/${documentId}/version`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFile);

      fs.unlinkSync(testFile);
    }

    const doc = await Document.findById(documentId);
    expect(doc.versions.length).toBe(5);
    expect(doc.versions.map(v => v.versionNumber)).toEqual([1, 2, 3, 4, 5]);

    fs.unlinkSync(testFile1);
  });

  test('should store unique file paths for each version', async () => {
    const testFile1 = path.join(__dirname, 'unique1.txt');
    const testFile2 = path.join(__dirname, 'unique2.txt');
    fs.writeFileSync(testFile1, 'Content 1');
    fs.writeFileSync(testFile2, 'Content 2');

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Unique Paths Doc')
      .attach('file', testFile1);

    const documentId = uploadRes.body._id;

    const versionRes = await request(app)
      .post(`/api/documents/${documentId}/version`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testFile2);

    const filePaths = versionRes.body.versions.map(v => v.filePath);
    const uniquePaths = new Set(filePaths);
    expect(uniquePaths.size).toBe(filePaths.length);

    fs.unlinkSync(testFile1);
    fs.unlinkSync(testFile2);
  });

  test('should track who uploaded each version', async () => {
    const testFile = path.join(__dirname, 'tracked.txt');
    fs.writeFileSync(testFile, 'Tracked content');

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Tracked Doc')
      .attach('file', testFile);

    const documentId = uploadRes.body._id;

    const versionRes = await request(app)
      .post(`/api/documents/${documentId}/version`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testFile);

    versionRes.body.versions.forEach(version => {
      expect(version.uploadedBy).toBe(userId);
    });

    fs.unlinkSync(testFile);
  });

  test('should timestamp each version upload', async () => {
    const testFile = path.join(__dirname, 'timestamped.txt');
    fs.writeFileSync(testFile, 'Timestamped content');

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Timestamped Doc')
      .attach('file', testFile);

    const documentId = uploadRes.body._id;
    const uploadTime = new Date();

    await new Promise(resolve => setTimeout(resolve, 100));

    const versionRes = await request(app)
      .post(`/api/documents/${documentId}/version`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', testFile);

    const v1Time = new Date(versionRes.body.versions[0].uploadedAt);
    const v2Time = new Date(versionRes.body.versions[1].uploadedAt);

    expect(v2Time.getTime()).toBeGreaterThan(v1Time.getTime());

    fs.unlinkSync(testFile);
  });

  test('should only allow owner to upload new version', async () => {
    const testFile = path.join(__dirname, 'owner-test.txt');
    fs.writeFileSync(testFile, 'Owner content');

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Owner Doc')
      .attach('file', testFile);

    const documentId = uploadRes.body._id;

    const otherUserRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Other User',
        email: 'other@example.com',
        password: 'other123',
        role: 'lawyer'
      });

    const versionRes = await request(app)
      .post(`/api/documents/${documentId}/version`)
      .set('Authorization', `Bearer ${otherUserRes.body.token}`)
      .attach('file', testFile);

    expect(versionRes.statusCode).toBe(403);

    fs.unlinkSync(testFile);
  });
});
