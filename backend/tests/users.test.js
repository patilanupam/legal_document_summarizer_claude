const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

describe('Users API', () => {
  let adminToken;
  let userToken;
  let testUserId;

  beforeEach(async () => {
    // Create admin user
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      });

    adminToken = adminRes.body.token;

    // Create regular user
    const userRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Regular User',
        email: 'user@example.com',
        password: 'password123',
        role: 'client'
      });

    userToken = userRes.body.token;
    testUserId = userRes.body._id;
  });

  describe('GET /api/users', () => {
    it('should get all users as admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should not get users as non-admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID', async () => {
      const res = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe('user@example.com');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update own profile', async () => {
      const res = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          firm: 'New Firm'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.firm).toBe('New Firm');
    });

    it('should not update another user profile as non-admin', async () => {
      // Get admin ID
      const adminUser = await User.findOne({ email: 'admin@example.com' });

      const res = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacked Name'
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as admin', async () => {
      const res = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User deleted successfully');
    });

    it('should not delete user as non-admin', async () => {
      const res = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
