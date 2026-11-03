#!/usr/bin/env node
// Applies the shared business schema to a server-only PostgreSQL connection.
const fs = require('node:fs')
const path = require('node:path')
const { getPostgresPool } = require('../../lib/server/postgres.cjs')
const getMigrationSql = (
  schema = process.env.POSTGRES_DB_SCHEMA || 'appwrite_t2_data'
) => {
  if (!/^appwrite_[a-zA-Z0-9_]+$/.test(schema))
    throw new Error(
      'POSTGRES_DB_SCHEMA must begin with appwrite_ and use letters, digits or underscores'
    )
  const source = fs.readFileSync(
    path.join(
      __dirname,
      '../../supabase/migrations/20261011054802_dual_business_database.sql'
    ),
    'utf8'
  )
  // Heroku uses its database-owner credential; Supabase's API roles do not exist.
  return (
    source
      .replace(/from public, anon, authenticated/g, 'from public')
      .replace(/^grant .* to service_role;\s*$/gm, '')
      .replace(/^notify pgrst, 'reload schema';\s*$/gm, '')
      .replace(/\bappwrite_t2_data\b/g, schema) +
    `\ncreate table if not exists "${schema}".__appwrite_tables (table_id text primary key, source jsonb not null, definition jsonb not null);\nalter table "${schema}".__appwrite_tables enable row level security;\nrevoke all on "${schema}".__appwrite_tables from public;\n`
  )
}
const migrate = async pool => {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended('t2-business-schema', 0))"
    )
    await client.query(getMigrationSql())
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
if (require.main === module) {
  if (process.argv[2] !== 'migrate') {
    console.error('Usage: node scripts/database/postgres.cjs migrate')
    process.exitCode = 1
  } else if (
    (process.env.DATABASE_PROVIDER || 'appwrite').toLowerCase() !== 'postgres'
  ) {
    console.log(
      'PostgreSQL release migration skipped for the selected database provider.'
    )
  } else {
    const pool = getPostgresPool()
    migrate(pool)
      .then(() =>
        console.log(
          'Business PostgreSQL schema ready; existing rows preserved.'
        )
      )
      .catch(error => {
        console.error('Migration failed:', error.code || error.name)
        process.exitCode = 1
      })
      .finally(() => pool.end())
  }
}
module.exports = { getMigrationSql, migrate }
