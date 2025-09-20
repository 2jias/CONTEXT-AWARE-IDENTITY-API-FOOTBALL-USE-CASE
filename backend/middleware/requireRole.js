function requireRole(allowed) {
  const allow = new Set((Array.isArray(allowed) ? allowed : [allowed])
    .filter(Boolean)
    .map(r => String(r).toLowerCase()));
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
    const have = String(req.user.role || '').toLowerCase();
    if (!allow.has(have)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role', have: req.user.role, need: [...allow] });
    }
    next();
  };
}
module.exports = { requireRole };
