import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { query } from '../src/config/db.js';
import passwordResetRepo from '../src/repositories/passwordResetRepo.js';
import userRepo from '../src/repositories/userRepo.js';
import { initTestDatabase, teardownTestDatabase } from './testDbHelper.js';

describe('Password Reset Backend Flow (Forgot Password & Reset Password)', () => {
  const testUser = {
    name: 'Reset Test User',
    email: 'reset.flow@flowspace.dev',
    initialPassword: 'OldPassword123!',
    newPassword: 'BrandNewSecurePassword456!',
  };

  let registeredUserId = null;

  before(async () => {
    await initTestDatabase();

    // Register a user for password reset testing
    const signupRes = await request(app).post('/api/auth/signup').send({
      name: testUser.name,
      email: testUser.email,
      password: testUser.initialPassword,
      workspaceName: 'Reset Workspace',
    });
    assert.equal(signupRes.status, 201);
    registeredUserId = signupRes.body.user.id;
    assert.ok(registeredUserId);
  });

  after(async () => {
    await teardownTestDatabase();
  });

  describe('1. Validation & Input Sanitization', () => {
    it('POST /api/auth/forgot-password rejects missing email with 400 Bad Request', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({});
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('POST /api/auth/forgot-password rejects invalid email format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('POST /api/auth/reset-password rejects missing token with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ password: 'ValidPassword123!' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('POST /api/auth/reset-password rejects short password (< 6 chars) with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'dummy-token', password: '123' });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('2. User Enumeration Prevention', () => {
    it('POST /api/auth/forgot-password for non-existent email returns 200 with standard message and undefined resetUrl', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost.user.doesnotexist@flowspace.dev' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(
        res.body.message,
        'If an account exists with that email, a password reset link has been sent.'
      );
      assert.equal(res.body.resetUrl, undefined);
    });
  });

  describe('3. End-to-End Forgot & Reset Password Flow', () => {
    let rawResetToken = null;

    it('POST /api/auth/forgot-password generates token, saves hash to DB, and returns resetUrl in test mode', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.resetUrl);

      // Verify URL structure
      const parsedUrl = new URL(res.body.resetUrl);
      rawResetToken = parsedUrl.searchParams.get('token');
      const emailParam = parsedUrl.searchParams.get('email');

      assert.ok(rawResetToken, 'URL must include token parameter');
      assert.equal(emailParam, testUser.email);
      assert.equal(rawResetToken.length, 64, 'Raw token should be 32 bytes hex (64 chars)');

      // Verify token hash in DB
      const expectedHash = crypto
        .createHash('sha256')
        .update(rawResetToken)
        .digest('hex');

      const tokenRecord = await passwordResetRepo.findValidToken(expectedHash);
      assert.ok(tokenRecord, 'Token record must be found by SHA-256 hash');
      assert.equal(tokenRecord.userId, registeredUserId);
      assert.equal(tokenRecord.tokenHash, expectedHash);
      assert.equal(tokenRecord.usedAt, null);
      assert.ok(new Date(tokenRecord.expiresAt) > new Date());
    });

    it('POST /api/auth/reset-password rejects invalid / tampered token with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-or-tampered-token-1234567890',
          password: testUser.newPassword,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Invalid or expired password reset link.');
    });

    it('POST /api/auth/reset-password resets password successfully with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawResetToken,
          password: testUser.newPassword,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(
        res.body.message,
        'Your password has been reset successfully. Please log in with your new password.'
      );

      // Verify token is marked as used in DB
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawResetToken)
        .digest('hex');

      const validCheck = await passwordResetRepo.findValidToken(tokenHash);
      assert.equal(validCheck, null, 'findValidToken must return null once used');

      // Verify user can log in with new password
      const newLoginRes = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.newPassword,
      });
      assert.equal(newLoginRes.status, 200);
      assert.equal(newLoginRes.body.user.email, testUser.email);

      // Verify old password no longer works
      const oldLoginRes = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.initialPassword,
      });
      assert.equal(oldLoginRes.status, 401);
    });

    it('POST /api/auth/reset-password prevents token reuse / replay attacks with 400 Bad Request', async () => {
      const replayRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawResetToken,
          password: 'AnotherPassword789!',
        });

      assert.equal(replayRes.status, 400);
      assert.equal(replayRes.body.error, 'Invalid or expired password reset link.');
    });
  });

  describe('4. Token Invalidation and Expiration Behavior', () => {
    it('Invalidates previous active tokens when a new forgot-password request is submitted', async () => {
      // 1st request
      const firstRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });
      assert.equal(firstRes.status, 200);
      const firstToken = new URL(firstRes.body.resetUrl).searchParams.get('token');

      // 2nd request
      const secondRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });
      assert.equal(secondRes.status, 200);
      const secondToken = new URL(secondRes.body.resetUrl).searchParams.get('token');

      assert.notEqual(firstToken, secondToken);

      // First token should now be invalidated
      const firstHash = crypto
        .createHash('sha256')
        .update(firstToken)
        .digest('hex');
      const firstValid = await passwordResetRepo.findValidToken(firstHash);
      assert.equal(firstValid, null, 'First token should have used_at set');

      // Using first token to reset should fail
      const firstResetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: firstToken,
          password: 'AttemptFirstToken123!',
        });
      assert.equal(firstResetRes.status, 400);
      assert.equal(firstResetRes.body.error, 'Invalid or expired password reset link.');

      // Second token should work
      const secondResetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: secondToken,
          password: 'SuccessSecondToken123!',
        });
      assert.equal(secondResetRes.status, 200);
      assert.equal(secondResetRes.body.success, true);
    });

    it('Rejects expired token with 400 Bad Request', async () => {
      // Create an already-expired token directly via repository
      const expiredRaw = crypto.randomBytes(32).toString('hex');
      const expiredHash = crypto
        .createHash('sha256')
        .update(expiredRaw)
        .digest('hex');
      const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago

      await passwordResetRepo.createResetToken({
        userId: registeredUserId,
        tokenHash: expiredHash,
        expiresAt: pastDate,
      });

      // Verify findValidToken does not return it
      const found = await passwordResetRepo.findValidToken(expiredHash);
      assert.equal(found, null);

      // Attempt reset with expired token
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: expiredRaw,
          password: 'ExpiredTokenAttempt123!',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Invalid or expired password reset link.');
    });
  });
});
