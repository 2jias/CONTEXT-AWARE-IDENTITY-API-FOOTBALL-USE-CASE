const express = require('express');
const db = require('../db/knex'); 
const { SUPPORTED_ROLES } = require('../constants/roles');
const { requireRole } = require('../middleware/requireRole');
const { logAudit } = require('../middleware/audit');
const { getById, revoke, revokeAllForUser } = require('../services/refreshTokens');

const router = express.Router();

router.get('/_ping', (req,res)=> res.json({ ok:true, role:req.user?.role }));
// All admin routes require Developer (you already mount verifyAccessToken in server.js)
router.use(requireRole(['Developer']));

/** GET /api/admin/audit?limit=50&userId=..&action=..&status=success|failure */
router.get('/audit', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
    const { userId, action, status } = req.query;

    const q = db('AuditLog') // NOTE: case must match your migration table names
      .select('id', 'timestamp', 'userId', 'action', 'status', 'resource', 'ip', 'userAgent', 'metadata')
      .orderBy('id', 'desc')
      .limit(limit);

    if (userId) q.where('userId', Number(userId));
    if (action) q.where('action', action);
    if (status) q.where('status', status);

    const rows = await q;
    const parsed = rows.map(r => ({
      ...r,
      metadata: r.metadata ? (() => { try { return JSON.parse(r.metadata); } catch { return r.metadata; } })() : null
    }));
    res.json(parsed);
  } catch (e) {
    console.error('GET /admin/audit error:', e);
    res.status(500).json({ message: 'Failed to read logs', detail: e.message });
  }
});

/** GET /api/admin/refresh-tokens?userId=..&active=true */
router.get('/refresh-tokens', async (req, res) => {
  try {
    const { userId, active } = req.query;

    const q = db('RefreshTokens')
      .select('tokenId', 'userId', 'createdAt', 'expiresAt', 'revokedAt', 'userAgent', 'ip')
      .orderBy('createdAt', 'desc')
      .limit(200);

    if (userId) q.where('userId', Number(userId));

    let rows = await q;

    if (active === 'true') {
      const now = new Date();
      rows = rows.filter(r => !r.revokedAt && new Date(r.expiresAt) > now);
    }
    res.json(rows);
  } catch (e) {
    console.error('GET /admin/refresh-tokens error:', e);
    res.status(500).json({ message: 'Failed to read tokens', detail: e.message });
  }
});

/** POST /api/admin/refresh-tokens/:tokenId/revoke */
router.post('/refresh-tokens/:tokenId/revoke', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const rec = await getById(tokenId);
    if (!rec) return res.status(404).json({ message: 'Token not found' });

    await revoke(tokenId);

    logAudit({
      userId: req.user.id,
      action: 'admin_revoke_token',
      resource: '/api/admin/refresh-tokens/:tokenId/revoke',
      status: 'success',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { targetUserId: rec.userId, tokenId }
    });

    res.json({ message: 'Token revoked' });
  } catch (e) {
    console.error('POST /admin/refresh-tokens/:tokenId/revoke error:', e);
    res.status(500).json({ message: 'Failed to revoke token', detail: e.message });
  }
});

/** POST /api/admin/refresh-tokens/revoke-all { userId } */
router.post('/refresh-tokens/revoke-all', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId required' });

    await revokeAllForUser(Number(userId));

    logAudit({
      userId: req.user.id,
      action: 'admin_revoke_all_tokens',
      resource: '/api/admin/refresh-tokens/revoke-all',
      status: 'success',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { targetUserId: Number(userId) }
    });

    res.json({ message: 'All tokens for user revoked' });
  } catch (e) {
    console.error('POST /admin/refresh-tokens/revoke-all error:', e);
    res.status(500).json({ message: 'Failed to revoke all tokens', detail: e.message });
  }
});

/** GET /api/admin/users */
router.get('/users', async (_req, res) => {
  try {
    const rows = await db('Users') // NOTE: case-sensitive table name if created quoted
      .select('id', 'username', 'role')
      .orderBy('id', 'asc');
    res.json(rows);
  } catch (e) {
    console.error('GET /admin/users error:', e);
    res.status(500).json({ message: 'Failed to list users', detail: e.message });
  }
});

/** PUT /api/admin/users/:id/role { role } */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!SUPPORTED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role', supported: SUPPORTED_ROLES });
    }

    const updated = await db('Users')
      .where({ id: Number(id) })
      .update({ role });

    if (!updated) return res.status(404).json({ message: 'User not found' });

    logAudit({
      userId: req.user.id,
      action: 'admin_update_role',
      resource: '/api/admin/users/:id/role',
      status: 'success',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { targetUserId: Number(id), newRole: role }
    });

    res.json({ message: 'Role updated' });
  } catch (e) {
    console.error('PUT /admin/users/:id/role error:', e);
    res.status(500).json({ message: 'Failed to update role', detail: e.message });
  }
});

module.exports = router;
