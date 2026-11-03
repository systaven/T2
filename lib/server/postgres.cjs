const fs = require('node:fs')
const { createHash } = require('node:crypto')

const postgresOptions = (env = process.env) => {
  let url
  try {
    url = new URL(env.DATABASE_URL)
  } catch {
    throw new Error('Configure a valid DATABASE_URL')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('DATABASE_URL must use PostgreSQL')
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  const disableTLS = env.DATABASE_SSL === 'disable'
  if (disableTLS && !local)
    throw new Error(
      'DATABASE_SSL=disable is only supported for a local development database'
    )
  // pg connection-string SSL parameters otherwise replace the explicit CA config.
  for (const key of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert'])
    url.searchParams.delete(key)
  const caPath = env.PGSSLROOTCERT || '/etc/ssl/certs/ca-certificates.crt'
  const ssl = disableTLS
    ? false
    : {
        rejectUnauthorized: true,
        ...(fs.existsSync(caPath)
          ? { ca: fs.readFileSync(caPath, 'utf8') }
          : {})
      }
  const max = Number(env.POSTGRES_POOL_MAX || 3)
  if (!Number.isInteger(max) || max < 1 || max > 20)
    throw new Error('POSTGRES_POOL_MAX must be between 1 and 20')
  return {
    connectionString: url.toString(),
    ssl,
    max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: true
  }
}

const getPostgresPool = () => {
  const options = postgresOptions()
  const signature = createHash('sha256')
    .update(JSON.stringify(options))
    .digest('hex')
  const slot = Symbol.for('t2.postgres.pool')
  if (globalThis[slot]?.signature === signature) return globalThis[slot].pool
  if (globalThis[slot]) globalThis[slot].pool.end().catch(() => {})
  const { Pool } = require('pg')
  const pool = new Pool(options)
  // Idle-connection errors must not terminate the web process.
  pool.on('error', error =>
    console.error(
      '[postgres] Idle connection lost:',
      error.code || 'connection_error'
    )
  )
  globalThis[slot] = { signature, pool }
  return pool
}

module.exports = { postgresOptions, getPostgresPool }
