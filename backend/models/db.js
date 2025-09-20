const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');
const { SUPPORTED_ROLES } = require('../constants/roles');
const roleCheck = SUPPORTED_ROLES.map(r => `'${r}'`).join(', ');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT CHECK(role IN (${roleCheck})) NOT NULL,
    totpSecret TEXT,                     -- 2FA secret (base32)
    is2FAEnabled INTEGER DEFAULT 0,      -- 0/1
    recoveryCodes TEXT                   -- JSON array of codes
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    fullName TEXT,
    preferredName TEXT,
    jerseyName TEXT,
    dob TEXT,
    position TEXT,
    FOREIGN KEY (userId) REFERENCES Users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS PlayerFieldVisibility (
    playerId INTEGER,
    field TEXT,
    visibleTo TEXT,
    FOREIGN KEY (playerId) REFERENCES Players(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS RefreshTokens (
    tokenId TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    expiresAt TEXT NOT NULL,
    revokedAt TEXT,
    userAgent TEXT,
    ip TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES Users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS AuditLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    userId INTEGER,
    action TEXT NOT NULL,
    resource TEXT,
    status TEXT NOT NULL,
    ip TEXT,
    userAgent TEXT,
    metadata TEXT,
    FOREIGN KEY (userId) REFERENCES Users(id)
  )`);

  //schema upgrades for existing DBs (safe no-op if column already exists)
  const ensureColumn = (table, column, def) => {
    db.all(`PRAGMA table_info(${table})`, (err, cols) => {
      if (err) return;
      const has = (cols || []).some(c => c.name === column);
      if (!has) db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    });
  };

  ensureColumn('Users', 'totpSecret', 'TEXT');
  ensureColumn('Users', 'is2FAEnabled', 'INTEGER DEFAULT 0');
  ensureColumn('Users', 'recoveryCodes', 'TEXT');
});

module.exports = db;
