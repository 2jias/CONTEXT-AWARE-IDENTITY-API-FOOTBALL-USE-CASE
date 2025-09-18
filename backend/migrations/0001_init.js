/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function(knex) {
  // Roles check constraint or enum-like behavior
  await knex.schema.createTable('Users', (t) => {
    t.increments('id').primary();
    t.string('username').notNullable().unique();
    t.string('passwordHash').notNullable();
    t.string('role').notNullable(); // we'll add a CHECK below
    t.text('totpSecret');
    t.boolean('is2FAEnabled').notNullable().defaultTo(false);
    t.text('recoveryCodes'); // JSON string
  });
  // CHECK constraint for role
  await knex.raw(`
    ALTER TABLE "Users"
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('Player','Coach','Journalist','Developer'))
  `);

  await knex.schema.createTable('Players', (t) => {
    t.increments('id').primary();
    t.integer('userId').references('Users.id').onDelete('CASCADE');
    t.text('fullName');
    t.text('preferredName');
    t.text('jerseyName');
    t.text('dob');       // keep as TEXT to mirror current behavior
    t.text('position');
  });

  await knex.schema.createTable('PlayerFieldVisibility', (t) => {
    t.integer('playerId').notNullable().references('Players.id').onDelete('CASCADE');
    t.text('field').notNullable();
    t.text('visibleTo').notNullable();
    t.primary(['playerId','field','visibleTo']);
  });

  await knex.schema.createTable('RefreshTokens', (t) => {
    t.text('tokenId').primary();
    t.integer('userId').notNullable().references('Users.id').onDelete('CASCADE');
    t.timestamp('expiresAt', { useTz: true }).notNullable();
    t.timestamp('revokedAt', { useTz: true }).nullable();
    t.text('userAgent');
    t.text('ip');
    t.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['userId']);
  });

  await knex.schema.createTable('AuditLog', (t) => {
    t.increments('id').primary();
    t.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer('userId').nullable().references('Users.id').onDelete('SET NULL');
    t.text('action').notNullable();
    t.text('resource');
    t.text('status').notNullable();
    t.text('ip');
    t.text('userAgent');
    t.text('metadata'); // JSON string
    t.index(['userId','action','status']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('AuditLog');
  await knex.schema.dropTableIfExists('RefreshTokens');
  await knex.schema.dropTableIfExists('PlayerFieldVisibility');
  await knex.schema.dropTableIfExists('Players');
  await knex.schema.dropTableIfExists('Users');
};
