import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const pilotAccounts = sqliteTable('pilot_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  passwordSalt: text('password_salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  firstAccessAt: integer('first_access_at'),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at').notNull(),
}, table => [uniqueIndex('idx_pilot_accounts_email').on(table.email)])

export const pilotSessions = sqliteTable('pilot_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  accountId: text('account_id').notNull().references(() => pilotAccounts.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('idx_pilot_sessions_account').on(table.accountId)])

export const pilotLoginAttempts = sqliteTable('pilot_login_attempts', {
  email: text('email').primaryKey(),
  failures: integer('failures').notNull(),
  lockedUntil: integer('locked_until').notNull(),
})

export const pilotRecords = sqliteTable('pilot_records', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => pilotAccounts.id, { onDelete: 'cascade' }),
  collection: text('collection').notNull(),
  dogId: text('dog_id'),
  data: text('data').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, table => [index('idx_pilot_records_account_collection').on(table.accountId, table.collection), index('idx_pilot_records_dog').on(table.accountId, table.dogId)])

export const pilotFiles = sqliteTable('pilot_files', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => pilotAccounts.id, { onDelete: 'cascade' }),
  recordId: text('record_id').notNull(),
  collection: text('collection').notNull(),
  filename: text('filename').notNull(),
  objectKey: text('object_key').notNull(),
  contentType: text('content_type').notNull(),
  size: integer('size').notNull(),
}, table => [uniqueIndex('idx_pilot_files_record_name').on(table.recordId, table.filename)])

export const pilotEvents = sqliteTable('pilot_events', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => pilotAccounts.id, { onDelete: 'cascade' }),
  event: text('event').notNull(),
  deviceId: text('device_id'),
  details: text('details'),
  durationMs: integer('duration_ms'),
  createdAt: integer('created_at').notNull(),
}, table => [index('idx_pilot_events_account_date').on(table.accountId, table.createdAt)])

// Histórico privado, preservado mesmo após exclusão do registro original.
export const pilotChanges = sqliteTable('pilot_changes', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => pilotAccounts.id),
  recordId: text('record_id').notNull(),
  collection: text('collection').notNull(),
  dogId: text('dog_id'),
  action: text('action').notNull(),
  actorType: text('actor_type').notNull().default('unknown'),
  beforeData: text('before_data'),
  afterData: text('after_data'),
  changedAt: integer('changed_at').notNull(),
}, table => [index('idx_pilot_changes_account_date').on(table.accountId, table.changedAt)])

export const pilotDevices = sqliteTable('pilot_devices', {
  id: text('id').primaryKey(), accountId: text('account_id').notNull().references(() => pilotAccounts.id),
  deviceId: text('device_id').notNull(), data: text('data').notNull(),
  activeMs: integer('active_ms').notNull().default(0), lastSeen: integer('last_seen').notNull(),
}, table => [uniqueIndex('idx_pilot_device_account').on(table.accountId, table.deviceId)])
