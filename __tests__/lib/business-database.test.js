/** @jest-environment node */
const { Query, getDatabaseConfig, getDatabase, createDatabase, createAppwriteDatabase, fromRow, toData } = require('../../lib/server/businessDatabase.cjs')
const originalEnv = { ...process.env }
beforeEach(() => {
  for (const key of Object.keys(process.env)) if (/^(DATABASE_PROVIDER|APPWRITE_|SUPABASE_|BUSINESS_SETTINGS_)/.test(key)) delete process.env[key]
})
afterAll(() => { process.env = originalEnv })
const record = { id: 'legacy-id', created_at: '2026-10-01T00:00:00+00:00', updated_at: '2026-10-01T00:00:00+00:00', code: 'old', _appwrite_document: { secret: 'private archive' } }

test('old deployments default to Appwrite and honor their table overrides', () => {
  process.env.APPWRITE_API_KEY = 'server-key'
  process.env.APPWRITE_ADMIN_ROLES_TABLE_ID = 'custom_roles'
  expect(getDatabaseConfig()).toMatchObject({ provider: 'appwrite', apiKey: 'server-key', databaseId: 't2_data', rolesTableId: 'custom_roles' })
})
test('Supabase uses only its own credentials, migrated schema and legacy server key', () => {
  process.env.DATABASE_PROVIDER = 'supabase'
  process.env.APPWRITE_API_KEY = 'irrelevant'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only'
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  expect(getDatabaseConfig()).toMatchObject({ provider: 'supabase', apiKey: 'server-only', databaseId: 'appwrite_t2_data' })
  process.env.SUPABASE_SECRET_KEY = 'new-secret'
  expect(getDatabaseConfig().apiKey).toBe('new-secret')
})
test('missing selected credentials fail without falling back to the other provider', () => {
  process.env.DATABASE_PROVIDER = 'supabase'
  process.env.APPWRITE_API_KEY = 'valid-other-provider'
  expect(getDatabase).toThrow('SUPABASE_URL')
  process.env.DATABASE_PROVIDER = 'invalid'
  expect(getDatabaseConfig).toThrow('DATABASE_PROVIDER')
})
test('row mapping preserves existing IDs/dates and strips raw archived private data', () => {
  expect(fromRow('short_links', record)).toEqual({ code: 'old', $id: 'legacy-id', $createdAt: '2026-10-01T00:00:00.000Z', $updatedAt: '2026-10-01T00:00:00.000Z' })
})
test('migrated plaintext settings still load; optional encryption round-trips new settings', () => {
  expect(fromRow('native_comment_settings', { ...record, payload: '{"enabled":true}' }).payload).toBe('{"enabled":true}')
  expect(toData('native_comment_settings', { payload: '{}' }).payload).toBe('{}')
  process.env.BUSINESS_SETTINGS_ENCRYPTION_KEY = 'a'.repeat(64)
  const encrypted = toData('native_comment_settings', { payload: '{"token":"private"}' }).payload
  expect(encrypted).toMatch(/^enc:v1:/)
  expect(fromRow('native_comment_settings', { ...record, payload: encrypted }).payload).toBe('{"token":"private"}')
})
test('Supabase passes query values safely as RPC JSON, keeps row contract and total', async () => {
  const client = { rpc: jest.fn().mockResolvedValue({ data: { rows: [record], total: 102 }, error: null }) }
  const queries = [Query.equal('targetUrl', "https://example.com/?q=it's,(quoted)"), Query.limit(1), Query.cursorAfter('old')]
  const db = createDatabase(client, { databaseId: 'appwrite_t2_data' })
  const result = await db.listRows({ tableId: 'short_links', queries })
  expect(result.total).toBe(102)
  expect(result.rows[0].$id).toBe('legacy-id')
  expect(client.rpc).toHaveBeenCalledWith('t2_business_database', { p_schema: 'appwrite_t2_data', p_operation: 'list', p_request: { tableId: 'short_links', queries, total: true } })
})
test.each([['23505',409],['P0002',404],['42501',503],['FETCH_ERROR',503]])('Supabase %s errors are actionable and do not retry another provider', async (code, status) => {
  const client = { rpc: jest.fn().mockResolvedValue({ error: { code, message: 'failure' } }) }
  await expect(createDatabase(client).getRow({ tableId: 'short_links', rowId: 'missing' })).rejects.toMatchObject({ code: status, statusCode: status })
  expect(client.rpc).toHaveBeenCalledTimes(1)
})
const sdkQuery = require('node-appwrite').Query
const appwrite = () => ({
  getRow: jest.fn().mockResolvedValue({ $id: 'comment', likes: 2 }),
  listRows: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
  createRow: jest.fn().mockResolvedValue({}), updateRow: jest.fn().mockResolvedValue({}), deleteRow: jest.fn().mockResolvedValue({}),
  createTransaction: jest.fn().mockResolvedValue({ $id: 'tx' }), updateTransaction: jest.fn().mockResolvedValue({})
})
test('Appwrite translates scalar/array queries to SDK strings with the selected database', async () => {
  const sdk = appwrite(), db = createAppwriteDatabase(sdk, sdkQuery, { databaseId: 'legacy' })
  await db.listRows({ tableId: 'custom_roles', queries: [Query.equal('userId', ['a','b']), Query.orderDesc('$createdAt'), Query.cursorAfter('row'), Query.limit(10), Query.offset(2)] })
  const options = sdk.listRows.mock.calls[0][0]
  expect(options.databaseId).toBe('legacy')
  expect(options.queries.map(value => JSON.parse(value).method)).toEqual(['equal','orderDesc','cursorAfter','limit','offset'])
})
test('Appwrite likes commit the like and counter in one transaction', async () => {
  const sdk = appwrite(), db = createAppwriteDatabase(sdk, sdkQuery, { databaseId: 'legacy' })
  await expect(db.toggleCommentLike('comment','actor')).resolves.toEqual({ liked: true, likes: 3 })
  expect(sdk.createRow).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'tx', data: { commentId: 'comment', actorHash: 'actor' } }))
  expect(sdk.updateRow).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'tx', data: { likes: 3 } }))
  expect(sdk.updateTransaction).toHaveBeenCalledWith({ transactionId: 'tx', commit: true })
})
test('Appwrite conflict retries roll back failed transactions, while connection errors propagate', async () => {
  const sdk = appwrite(), db = createAppwriteDatabase(sdk, sdkQuery, { databaseId: 'legacy' })
  sdk.updateTransaction.mockRejectedValueOnce(Object.assign(new Error('conflict'), { code: 409 }))
  await expect(db.toggleCommentLike('comment','actor')).resolves.toMatchObject({ liked: true })
  expect(sdk.updateTransaction).toHaveBeenCalledWith({ transactionId: 'tx', rollback: true })
  expect(sdk.createTransaction).toHaveBeenCalledTimes(2)
  sdk.getRow.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 503 }))
  await expect(db.toggleCommentLike('comment','actor')).rejects.toThrow('offline')
})
test('Appwrite reaction updates the migrated row ID and retains other voters', async () => {
  const sdk = appwrite(), db = createAppwriteDatabase(sdk, sdkQuery, { databaseId: 'legacy' })
  sdk.listRows.mockResolvedValue({ rows: [{ $id: 'original-reaction-id', votes: '{"voters":{"other":"love","actor":"love"}}' }] })
  const result = await db.articleReaction('post','actor','useful')
  expect(result).toEqual({ counts: { love: 1, useful: 1, thinking: 0, surprised: 0, confused: 0 }, selected: 'useful' })
  expect(sdk.updateRow).toHaveBeenCalledWith(expect.objectContaining({ rowId: 'original-reaction-id', transactionId: 'tx' }))
  expect(sdk.createRow).not.toHaveBeenCalled()
})
