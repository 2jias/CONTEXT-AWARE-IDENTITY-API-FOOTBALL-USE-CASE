const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const knex = require('../db/knex');
const { SUPPORTED_ROLES, PLAYER } = require('../constants/roles');
const { createRecord, getById, revoke, isActive } = require('../services/refreshTokens');

const authMW = require('../middleware/auth');
const verifyAccessToken = authMW.verifyAccessToken || authMW.verifyToken;
const { signAccessToken, signRefreshToken } = authMW;

const router = express.Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a user and, if role is Player, creates a corresponding Players row.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, role]
 *             properties:
 *               username: { type: string, example: p1 }
 *               password: { type: string, example: secret123 }
 *               role:
 *                 type: string
 *                 enum: [Player, Coach, Journalist, Developer]
 *                 example: Player
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: User registered successfully }
 *       400: { description: Missing fields / invalid role / username exists }
 *       500: { description: Server error }
 */
/* REGISTER */
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ message: 'Missing fields' });
  if (!SUPPORTED_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const inserted = await knex('Users').insert({ username, passwordHash: hash, role }).returning(['id']);
    const newUserId = (inserted[0] && inserted[0].id) || inserted.id; // pg returns array
    if (role === PLAYER) await knex('Players').insert({ userId: newUserId });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (e) {
    if (String(e.message).includes('duplicate')) return res.status(400).json({ message: 'Username already exists' });
    res.status(500).json({ message: 'Server error', error: String(e) });
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login (with 2FA if enabled)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties: { username: {type: string}, password: {type: string} }
 *                 required: [username, password]
 *               - type: object
 *                 properties: { username: {type: string}, password: {type: string}, code: {type: string} }
 *                 required: [username, password, code]
 *     responses:
 *       200:
 *         description: Tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 role: { type: string, enum: [Player,Coach,Journalist,Developer] }
 *       401:
 *         description: 2FA required or invalid credentials
 */
/* LOGIN (with 2FA if enabled) */
router.post('/login', async (req, res) => {
  const { username, password, code } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'Missing credentials' });

  const user = await knex('Users').where({ username }).first();
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  if (user.is2FAEnabled) {
    // try TOTP
    const totpOk = code && speakeasy.totp.verify({
      secret: user.totpSecret, encoding: 'base32', token: String(code), window: 1
    });

    // try recovery
    const tryRecovery = () => {
      try {
        const list = JSON.parse(user.recoveryCodes || '[]');
        const idx = list.indexOf(code);
        if (idx >= 0) {
          list.splice(idx, 1); // consume once
          return knex('Users').where({ id: user.id }).update({ recoveryCodes: JSON.stringify(list) }).then(() => true);
        }
      } catch {}
      return false;
    };

    if (!totpOk && !(await tryRecovery())) {
      return res.status(401).json({ error: '2FA_REQUIRED', message: '2FA code required or invalid' });
    }
  }

  try {
    const rec = await createRecord({
      userId: user.id, userAgent: req.get('User-Agent'), ip: req.ip, ttl: process.env.REFRESH_TOKEN_TTL || '30d'
    });
    const accessToken  = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, tokenId: rec.tokenId });
    res.json({ accessToken, refreshToken, role: user.role });
  } catch {
    res.status(500).json({ message: 'Failed to create session' });
  }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token and return a new access/refresh pair
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New token pair issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 role:
 *                   type: string
 *                   enum: [Player, Coach, Journalist, Developer]
 *       400: { description: refreshToken required }
 *       401: { description: Invalid/expired or revoked refresh token }
 */
/* REFRESH (rotate) */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  let payload;
  try { payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret'); }
  catch { return res.status(401).json({ message: 'Invalid or expired refresh token' }); }

  const rec = await getById(payload.jti);
  if (!isActive(rec)) return res.status(401).json({ message: 'Refresh token no longer valid' });

  const user = await knex('Users').where({ id: rec.userId }).first('role');
  if (!user) return res.status(401).json({ message: 'User not found' });

  await revoke(rec.tokenId);
  const newRec = await createRecord({
    userId: rec.userId, userAgent: req.get('User-Agent'), ip: req.ip, ttl: process.env.REFRESH_TOKEN_TTL || '30d'
  });

  const newAccessToken  = signAccessToken({ userId: rec.userId, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: rec.userId, tokenId: newRec.tokenId });
  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken, role: user.role });
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout (revoke the provided refresh token)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logout acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Logged out }
 *       400: { description: refreshToken required }
 */
/* LOGOUT */
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
  try { const p = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret'); await revoke(p.jti); }
  catch {}
  res.json({ message: 'Logged out' });
});

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     summary: Begin TOTP 2FA setup (returns otpauth URL and QR image)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: 2FA setup info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 otpauth:   { type: string, example: otpauth://totp/ContextAwareID:p1?... }
 *                 qrDataUrl: { type: string, description: Data URL PNG }
 *       401: { description: Unauthorized }
 *       500: { description: Failed to generate QR }
 */
/* 2FA SETUP */
router.post('/2fa/setup', verifyAccessToken, async (req, res) => {
  const u = await knex('Users').where({ id: req.user.id }).first('username');
  if (!u) return res.status(404).json({ message: 'User not found' });

  const secret = speakeasy.generateSecret({ name: `ContextAwareID:${u.username}`, length: 20 });
  await knex('Users').where({ id: req.user.id }).update({ totpSecret: secret.base32, is2FAEnabled: false });
  const otpauth = secret.otpauth_url;
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  res.json({ otpauth, qrDataUrl });
});

/**
 * @openapi
 * /auth/2fa/verify:
 *   post:
 *     summary: Verify a TOTP code and enable 2FA, returning recovery codes
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: 2FA enabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 2FA enabled }
 *                 recoveryCodes:
 *                   type: array
 *                   items: { type: string, example: abcd-1234 }
 *       400: { description: No secret set / bad request }
 *       401: { description: Invalid code / unauthorized }
 */
/* 2FA VERIFY */
router.post('/2fa/verify', verifyAccessToken, async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ message: 'code required' });

  const u = await knex('Users').where({ id: req.user.id }).first('totpSecret');
  if (!u || !u.totpSecret) return res.status(400).json({ message: 'No secret set' });

  const ok = speakeasy.totp.verify({ secret: u.totpSecret, encoding: 'base32', token: String(code), window: 1 });
  if (!ok) return res.status(401).json({ message: 'Invalid code' });

  const codes = Array.from({ length: 8 }, () =>
    Math.random().toString(36).slice(2,6) + '-' + Math.random().toString(36).slice(2,6)
  );
  await knex('Users').where({ id: req.user.id }).update({ is2FAEnabled: true, recoveryCodes: JSON.stringify(codes) });
  res.json({ message: '2FA enabled', recoveryCodes: codes });
});

module.exports = router;
