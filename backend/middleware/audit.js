const db = require('../db/knex');

function sanitize(meta) {
  if (!meta) return null;
  const c = { ...meta };
  delete c.password;
  delete c.code;
  delete c.accessToken;
  delete c.refreshToken;
  return c;
}

async function logAudit({ userId, action, resource, status, ip, userAgent, metadata }) {
  try {
    await db('AuditLog').insert({
      timestamp: db.fn.now(),
      userId: userId ?? null,
      action,
      resource: resource ?? null,
      status,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: metadata ? JSON.stringify(sanitize(metadata)) : null,
    });
  } catch (e) {
    console.error('audit write failed:', e.message);
  }
}

module.exports = { logAudit };
