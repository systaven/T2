/** @jest-environment node */
const { postgresOptions } = require('../../lib/server/postgres.cjs')
const {
  createPostgresDatabase,
  Query,
  getDatabaseConfig,
  isDatabaseConfigured
} = require('../../lib/server/businessDatabase.cjs')
const { getMigrationSql } = require('../../scripts/database/postgres.cjs')
const {
  isAnonymousRootRequest,
  rootCacheHeaders
} = require('../../lib/server/edgeCachePolicy.cjs')
const { mergeRules } = require('../../scripts/cloudflare/heroku-cache.cjs')

test('Postgres connects with verified TLS and connection-string flags cannot disable it', () => {
  const options = postgresOptions({
    DATABASE_URL:
      'postgres://user:password@database.example/db?sslmode=disable&ssl=false'
  })
  expect(options.ssl.rejectUnauthorized).toBe(true)
  expect(options.connectionString).not.toContain('sslmode')
  expect(options.connectionString).not.toContain('ssl=')
  expect(options.max).toBe(3)
  expect(() =>
    postgresOptions({
      DATABASE_URL: 'postgres://user@database.example/db',
      DATABASE_SSL: 'disable'
    })
  ).toThrow('local development')
  expect(
    postgresOptions({
      DATABASE_URL: 'postgres://postgres@localhost/db',
      DATABASE_SSL: 'disable'
    }).ssl
  ).toBe(false)
})
test('Heroku requires DATABASE_URL and does not depend on an Appwrite or Supabase key', () => {
  const original = { ...process.env }
  try {
    process.env.DATABASE_PROVIDER = 'postgres'
    process.env.DATABASE_URL = 'postgres://localhost/db'
    delete process.env.APPWRITE_API_KEY
    delete process.env.SUPABASE_SECRET_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(getDatabaseConfig()).toMatchObject({
      provider: 'postgres',
      databaseId: 'appwrite_t2_data',
      apiKey: ''
    })
    expect(isDatabaseConfigured()).toBe(true)
  } finally {
    process.env = original
  }
})
test('Postgres binds query values as parameters and maps original row IDs', async () => {
  const pool = {
    query: jest
      .fn()
      .mockResolvedValue({
        rows: [
          {
            result: {
              rows: [
                {
                  id: 'old-id',
                  created_at: '2026-10-01T00:00:00Z',
                  updated_at: '2026-10-01T00:00:00Z',
                  code: 'stable',
                  _appwrite_document: { private: 'archive' }
                }
              ],
              total: 1
            }
          }
        ]
      })
  }
  const query = Query.equal(
    'targetUrl',
    "https://example.com/?x=';drop table users;--"
  )
  const result = await createPostgresDatabase(pool, {
    databaseId: 'appwrite_t2_data'
  }).listRows({ tableId: 'short_links', queries: [query] })
  expect(pool.query.mock.calls[0][0]).not.toContain('drop table')
  expect(JSON.parse(pool.query.mock.calls[0][1][2]).queries).toEqual([query])
  expect(result.rows[0]).toMatchObject({ $id: 'old-id', code: 'stable' })
  expect(result.rows[0]).not.toHaveProperty('_appwrite_document')
})
test('portable migration removes Supabase roles while preserving private-schema protection', () => {
  const sql = getMigrationSql()
  expect(sql).not.toMatch(/to service_role|from public, anon/)
  expect(sql).toContain('security invoker set search_path = pg_catalog')
  expect(sql).toContain(
    'revoke all on function public.t2_business_database(text,text,jsonb) from public'
  )
  expect(() => getMigrationSql('public;drop schema public')).toThrow(
    'POSTGRES_DB_SCHEMA'
  )
})
test('only cookie-free GET/HEAD of the exact root qualifies for public edge caching', () => {
  const root = { method: 'GET', pathname: '/' }
  expect(isAnonymousRootRequest(root)).toBe(true)
  expect(isAnonymousRootRequest({ ...root, method: 'HEAD' })).toBe(true)
  for (const override of [
    { cookie: '__session=private' },
    { authorization: 'Bearer private' },
    { method: 'POST' },
    { pathname: '/api/comments' },
    { pathname: '/admin' },
    { search: '?token=private' }
  ])
    expect(isAnonymousRootRequest({ ...root, ...override })).toBe(false)
  expect(rootCacheHeaders()['Cache-Control']).toBe(
    'public, max-age=0, must-revalidate'
  )
})
test('cache rules preserve unrelated rules and keep the private bypass last', () => {
  const original = {
    ref: 'existing-rule',
    action: 'set_cache_settings',
    action_parameters: { cache: false }
  }
  const once = mergeRules([original], 'blog.vachiika.me')
  const twice = mergeRules(once, 'blog.vachiika.me')
  expect(twice).toEqual(once)
  expect(twice[0]).toBe(original)
  expect(twice.at(-1).ref).toBe('t2_private_bypass')
  expect(twice.at(-1).action_parameters.cache).toBe(false)
  expect(() => mergeRules([], 'bad"host')).toThrow('hostname')
})
