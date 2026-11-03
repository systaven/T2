#!/usr/bin/env node
// Private JSON snapshots contain complete source rows. Never commit them.
const fs = require('node:fs')
const { getPostgresPool } = require('../../lib/server/postgres.cjs')
const { migrate } = require('./postgres.cjs')
const definitions = require('../../lib/server/businessSchema.json')
const tableNames = [...Object.keys(definitions), '__appwrite_tables']
const identifier = value => '"' + value.replace(/"/g, '""') + '"'
const validateSnapshot = snapshot => {
  if (
    snapshot.version !== 1 ||
    snapshot.schema !== 'appwrite_t2_data' ||
    !snapshot.tables
  )
    throw new Error('Unsupported snapshot')
  for (const table of tableNames) {
    const rows = snapshot.tables[table]
    if (!Array.isArray(rows))
      throw new Error(`Missing snapshot table: ${table}`)
    const columns =
      table === '__appwrite_tables'
        ? ['table_id', 'source', 'definition']
        : [
            'id',
            'created_at',
            'updated_at',
            '_appwrite_document',
            ...definitions[table].columns.map(c => c.key)
          ]
    const ids = new Set()
    for (const row of rows) {
      const id = row[table === '__appwrite_tables' ? 'table_id' : 'id']
      if (typeof id !== 'string' || !id || ids.has(id))
        throw new Error(`Invalid/duplicate snapshot ID in ${table}`)
      if (
        Object.keys(row).length !== columns.length ||
        columns.some(c => !Object.hasOwn(row, c))
      )
        throw new Error(`Unexpected snapshot columns in ${table}`)
      ids.add(id)
    }
  }
}
const compare = async (client, table, rows, schema) => {
  const qualified = `${identifier(schema)}.${identifier(table)}`
  const pk = table === '__appwrite_tables' ? 'table_id' : 'id'
  const result = await client.query(
    `with expected as (select * from jsonb_populate_recordset(null::${qualified},$1::jsonb))
    select count(*) filter(where actual.${pk} is null)::int as missing,
           count(*) filter(where expected.${pk} is null)::int as extra,
           count(*) filter(where actual.${pk} is not null and expected.${pk} is not null and to_jsonb(actual) is distinct from to_jsonb(expected))::int as changed
    from expected full join ${qualified} actual using (${pk})`,
    [JSON.stringify(rows)]
  )
  return result.rows[0]
}
const copySnapshot = async (pool, snapshot, write = false) => {
  validateSnapshot(snapshot)
  const schema = process.env.POSTGRES_DB_SCHEMA || 'appwrite_t2_data'
  if (!/^appwrite_[a-zA-Z0-9_]+$/.test(schema))
    throw new Error('Invalid PostgreSQL business schema')
  if (write) await migrate(pool)
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query("set local timezone='UTC'")
    if (write)
      await client.query(
        `lock table ${tableNames.map(t => `${identifier(schema)}.${identifier(t)}`).join(',')} in share row exclusive mode`
      )
    for (const table of tableNames) {
      const check = await compare(client, table, snapshot.tables[table], schema)
      if (check.extra || check.changed || (!write && check.missing))
        throw new Error(`Snapshot conflict in ${table}; no records overwritten`)
    }
    if (write) {
      for (const table of tableNames) {
        const qualified = `${identifier(schema)}.${identifier(table)}`
        const pk = table === '__appwrite_tables' ? 'table_id' : 'id'
        await client.query(
          `insert into ${qualified} select * from jsonb_populate_recordset(null::${qualified},$1::jsonb) on conflict (${pk}) do nothing`,
          [JSON.stringify(snapshot.tables[table])]
        )
      }
    }
    for (const table of tableNames) {
      const check = await compare(client, table, snapshot.tables[table], schema)
      if (check.missing || check.extra || check.changed)
        throw new Error(`Exact verification failed: ${table}`)
    }
    await client.query('commit')
    return Object.fromEntries(
      tableNames.map(t => [t, snapshot.tables[t].length])
    )
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
const exportSnapshot = async pool => {
  const schema = process.env.POSTGRES_DB_SCHEMA || 'appwrite_t2_data'
  if (!/^appwrite_[a-zA-Z0-9_]+$/.test(schema))
    throw new Error('Invalid PostgreSQL business schema')
  const client = await pool.connect()
  try {
    await client.query('begin isolation level repeatable read read only')
    const tables = {}
    for (const table of tableNames) {
      // PostgreSQL JSON preserves timestamp precision, unlike JS Date objects.
      const result = await client.query(
        `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as rows from ${identifier(schema)}.${identifier(table)} t`
      )
      tables[table] = result.rows[0].rows
    }
    await client.query('commit')
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      schema: 'appwrite_t2_data',
      tables
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
if (require.main === module) {
  const [command, file] = process.argv.slice(2)
  if (!['export', 'inspect', 'import', 'verify'].includes(command) || !file) {
    console.error(
      'Usage: node scripts/database/copy-postgres.cjs export|inspect|import|verify <private-snapshot.json>'
    )
    process.exitCode = 1
  } else if (command === 'export') {
    const pool = getPostgresPool()
    exportSnapshot(pool)
      .then(snapshot => {
        validateSnapshot(snapshot)
        fs.writeFileSync(file, JSON.stringify(snapshot), {
          mode: 0o600,
          flag: 'wx'
        })
        console.log(
          'Private PostgreSQL snapshot exported; existing files are never overwritten.'
        )
      })
      .catch(error => {
        console.error('Export stopped:', error.code || error.message)
        process.exitCode = 1
      })
      .finally(() => pool.end())
  } else {
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'))
    validateSnapshot(snapshot)
    if (command === 'inspect')
      console.log(
        Object.fromEntries(tableNames.map(t => [t, snapshot.tables[t].length]))
      )
    else {
      const pool = getPostgresPool()
      copySnapshot(pool, snapshot, command === 'import')
        .then(counts => console.log('Exact source/target match:', counts))
        .catch(error => {
          console.error('Copy stopped:', error.code || error.message)
          process.exitCode = 1
        })
        .finally(() => pool.end())
    }
  }
}
module.exports = { validateSnapshot, compare, copySnapshot, exportSnapshot }
