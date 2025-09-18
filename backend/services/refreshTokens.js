const db = require('../db/knex');
const { v4: uuidv4 } = require('uuid');

function parseTtl(input) {
  // supports "15m", "30d", "12h"; defaults to 30d
  const m = String(input || '').match(/^(\d+)\s*([smhd])$/i);
  if (!m) return 30 * 24 * 60 * 60 * 1000; // 30d
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = { s:1000, m:60*1000, h:3600*1000, d:24*3600*1000 }[unit];
  return n * mult;
}

async function createRecord({ userId, userAgent, ip, ttl }) {
  const tokenId = uuidv4();
  const expiresAt = new Date(Date.now() + parseTtl(ttl));
  await db('RefreshTokens').insert({
    tokenId,
    userId,
    createdAt: db.fn.now(),
    expiresAt,
    revokedAt: null,
    userAgent: userAgent || null,
    ip: ip || null,
  });
  return { tokenId, userId, expiresAt };
}

async function getById(tokenId) {
  return db('RefreshTokens').where({ tokenId }).first();
}

async function revoke(tokenId) {
  return db('RefreshTokens')
    .where({ tokenId })
    .update({ revokedAt: db.fn.now() });
}

async function revokeAllForUser(userId) {
  return db('RefreshTokens')
    .where({ userId, revokedAt: null })
    .update({ revokedAt: db.fn.now() });
}

function isActive(rec) {
  return !!(rec && !rec.revokedAt && new Date(rec.expiresAt) > new Date());
}

module.exports = { createRecord, getById, revoke, revokeAllForUser, isActive };
