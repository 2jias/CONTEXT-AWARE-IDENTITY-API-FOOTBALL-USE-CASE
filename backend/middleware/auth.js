require('dotenv').config();
const jwt = require('jsonwebtoken');

const {
  ACCESS_TOKEN_SECRET = 'dev_access_secret',
  REFRESH_TOKEN_SECRET = 'dev_refresh_secret',
  ACCESS_TOKEN_TTL = '15m',
  REFRESH_TOKEN_TTL = '30d',
} = process.env;

//create a short-lived access token
function signAccessToken({ userId, role }) {
  return jwt.sign({ sub: userId, role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

//create a refresh token with a server-side ID (jti) for rotation/revocation
function signRefreshToken({ userId, tokenId }) {
  return jwt.sign({ sub: userId, jti: tokenId }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

//express middleware to verify the access token
function verifyAccessToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token required' });

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ message: 'Invalid or expired token' });
    req.user = { id: payload.sub, role: payload.role };
    next();
  });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
};
