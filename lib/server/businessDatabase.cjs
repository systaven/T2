// Server-only adapter. Both providers expose the existing Appwrite row contract.
const { randomUUID, randomBytes, createCipheriv, createDecipheriv, createHash } = require('crypto')
const schema = require('./businessSchema.json')
const Query = {
  equal: (column, value) => ({ type: 'equal', column, value }),
  limit: value => ({ type: 'limit', value }),
  offset: value => ({ type: 'offset', value }),
  cursorAfter: value => ({ type: 'cursor', value }),
  orderAsc: column => ({ type: 'order', column, ascending: true }),
  orderDesc: column => ({ type: 'order', column, ascending: false })
}
const getDatabaseConfig = () => {
  const provider = process.env.DATABASE_PROVIDER || 'appwrite'
  if (!['appwrite', 'supabase'].includes(provider)) throw new Error('DATABASE_PROVIDER must be appwrite or supabase')
  return {
    provider,
    url: provider === 'supabase'
      ? process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      : process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1',
    projectId: process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '69ca8e510018b435866c',
    apiKey: provider === 'supabase'
      ? process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      : process.env.APPWRITE_API_KEY || '',
    databaseId: provider === 'supabase' ? process.env.SUPABASE_DB_SCHEMA || 'appwrite_t2_data' : process.env.APPWRITE_DATABASE_ID || 't2_data',
    rolesTableId: (provider === 'appwrite' ? process.env.APPWRITE_ADMIN_ROLES_TABLE_ID : '') || 'admin_roles',
    announcementsTableId: (provider === 'appwrite' ? process.env.APPWRITE_ADMIN_ANNOUNCEMENTS_TABLE_ID : '') || 'admin_announcements',
    settingsTableId: (provider === 'appwrite' ? process.env.APPWRITE_ADMIN_SETTINGS_TABLE_ID : '') || 'admin_settings',
    tableId: (provider === 'appwrite' ? process.env.APPWRITE_SHORT_LINK_TABLE_ID : '') || 'short_links',
    sourceTableId: (provider === 'appwrite' ? process.env.APPWRITE_SHORT_LINK_SOURCE_TABLE_ID : '') || 'short_link_sources'
  }
}
const isDatabaseConfigured = () => {
  const { url, apiKey } = getDatabaseConfig()
  return Boolean(url && apiKey)
}
const databaseError = error => {
  const code = ['23505', '40001', '40P01'].includes(error.code) ? 409
    : ['PGRST116', 'PGRST205', '42P01', 'P0002'].includes(error.code) ? 404
      : ['22023', '23502', '23514', '22P02'].includes(error.code) ? 400 : 503
  return Object.assign(new Error(error.message || 'Database request failed'), { code, statusCode: code, type: ['42P01', 'PGRST205'].includes(error.code) ? 'table_not_found' : error.code === 'P0002' ? 'row_not_found' : 'database_error' })
}
const encryptionKey = () => {
  const key = process.env.BUSINESS_SETTINGS_ENCRYPTION_KEY || ''
  if (!/^[a-f\d]{64}$/i.test(key)) throw new Error('BUSINESS_SETTINGS_ENCRYPTION_KEY must be 32 bytes encoded as 64 hex characters')
  return Buffer.from(key, 'hex')
}
const encryptSettings = payload => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  return `enc:v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('base64')}`
}
const decryptSettings = payload => {
  // Existing Appwrite snapshots contain plain JSON. Do not rewrite migrated data.
  if (!String(payload).startsWith('enc:v1:')) return payload
  const [, , iv, tag, value] = payload.split(':')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(value, 'base64')), decipher.final()]).toString('utf8')
}
const fromRow = (tableId, row) => {
  if (!row) throw databaseError({ code: 'P0002', message: 'Record not found' })
  const { id, created_at, updated_at, _appwrite_document, ...data } = row
  if (tableId === 'native_comment_settings' && data.payload) data.payload = decryptSettings(data.payload)
  return { ...data, $id: id, $createdAt: new Date(created_at).toISOString(), $updatedAt: new Date(updated_at).toISOString() }
}
const toData = (tableId, data) => {
  const result = { ...data }
  if (tableId === 'native_comment_settings' && result.payload !== undefined && process.env.BUSINESS_SETTINGS_ENCRYPTION_KEY) result.payload = encryptSettings(result.payload)
  return result
}
const createDatabase = (client, config = getDatabaseConfig()) => {
  const invoke = async (operation, payload = {}) => {
    const { data, error } = await client.rpc('t2_business_database', { p_schema: config.databaseId, p_operation: operation, p_request: payload })
    if (error) throw databaseError(error)
    return data
  }
  return {
    async getRow({ tableId, rowId }) { return fromRow(tableId, await invoke('get', { tableId, rowId })) },
    async listRows({ tableId, queries = [], total = true }) {
      const result = await invoke('list', { tableId, queries, total })
      return { rows: result.rows.map(row => fromRow(tableId, row)), total: result.total }
    },
    async createRow({ tableId, rowId = 'unique()', data }) {
      return fromRow(tableId, await invoke('create', { tableId, rowId: rowId === 'unique()' ? randomUUID() : rowId, data: toData(tableId, data) }))
    },
    async updateRow({ tableId, rowId, data }) { return fromRow(tableId, await invoke('update', { tableId, rowId, data: toData(tableId, data) })) },
    async deleteRow({ tableId, rowId }) { return invoke('delete', { tableId, rowId }) },
    async getTable({ tableId }) { return invoke('table', { tableId }) },
    async toggleCommentLike(commentId, actorHash) { return invoke('like', { commentId, actorHash }) },
    async articleReaction(postId, actorHash, reaction = null) { return invoke('reaction', { postId, actorHash, reaction }) }
  }
}
const reactionIds = ['love', 'useful', 'thinking', 'surprised', 'confused']
const reactionState = value => {
  let parsed
  try { parsed = JSON.parse(value || '{}') } catch { parsed = {} }
  const voters = parsed?.voters && typeof parsed.voters === 'object' && !Array.isArray(parsed.voters) ? parsed.voters : {}
  return { voters, counts: Object.fromEntries(reactionIds.map(id => [id, Object.values(voters).filter(value => value === id).length])) }
}
const createAppwriteDatabase = (db, sdkQuery, config = getDatabaseConfig()) => {
  const queries = values => values.map(q => {
    if (q.type === 'equal') return sdkQuery.equal(q.column, q.value)
    if (q.type === 'order') return sdkQuery[q.ascending ? 'orderAsc' : 'orderDesc'](q.column)
    if (q.type === 'cursor') return sdkQuery.cursorAfter(q.value)
    if (['limit', 'offset'].includes(q.type)) return sdkQuery[q.type](q.value)
    throw new Error('Unknown database query')
  })
  const adapter = {}
  for (const method of ['getRow', 'listRows', 'createRow', 'updateRow', 'deleteRow', 'getTable', 'createTable']) {
    adapter[method] = options => db[method]({ ...options, databaseId: config.databaseId, ...(options.queries ? { queries: queries(options.queries) } : {}) })
  }
  // Transactions prevent lost counters/votes. Conflict retries never change provider.
  const transaction = async operation => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const tx = await db.createTransaction({ ttl: 60 })
      try {
        const result = await operation(tx.$id)
        await db.updateTransaction({ transactionId: tx.$id, commit: true })
        return result
      } catch (error) {
        try { await db.updateTransaction({ transactionId: tx.$id, rollback: true }) } catch { /* Retain the original error. */ }
        if (error.code !== 409 || attempt === 2) throw error
      }
    }
  }
  adapter.toggleCommentLike = (commentId, actorHash) => transaction(async transactionId => {
    const base = { databaseId: config.databaseId, transactionId }
    const comment = await db.getRow({ ...base, tableId: 'native_comments', rowId: commentId })
    const found = await db.listRows({ ...base, tableId: 'native_comment_likes', queries: queries([Query.equal('commentId', commentId), Query.equal('actorHash', actorHash), Query.limit(1)]) })
    const liked = !found.rows.length
    if (liked) await db.createRow({ ...base, tableId: 'native_comment_likes', rowId: 'unique()', data: { commentId, actorHash } })
    else await db.deleteRow({ ...base, tableId: 'native_comment_likes', rowId: found.rows[0].$id })
    const likes = Math.max(0, Number(comment.likes || 0) + (liked ? 1 : -1))
    await db.updateRow({ ...base, tableId: 'native_comments', rowId: commentId, data: { likes } })
    return { liked, likes }
  })
  adapter.articleReaction = async (postId, actorHash, reaction = null) => {
    const operation = async transactionId => {
      const base = { databaseId: config.databaseId, ...(transactionId ? { transactionId } : {}), tableId: 'native_article_reactions' }
      const found = await db.listRows({ ...base, queries: queries([Query.equal('postId', postId), Query.limit(1)]) })
      const row = found.rows[0]
      let state = reactionState(row?.votes)
      if (reaction !== null) {
        if (!actorHash || !reactionIds.includes(reaction)) throw Object.assign(new Error('Invalid article reaction'), { code: 400 })
        if (state.voters[actorHash] === reaction) delete state.voters[actorHash]
        else state.voters[actorHash] = reaction
        state = reactionState(JSON.stringify(state))
        const data = { postId, votes: JSON.stringify(state) }
        if (row) await db.updateRow({ ...base, rowId: row.$id, data })
        else await db.createRow({ ...base, rowId: createHash('sha256').update(`reaction:${postId}`).digest('hex').slice(0, 36), data })
      }
      return { counts: state.counts, selected: state.voters[actorHash] || null }
    }
    return reaction === null ? operation() : transaction(operation)
  }
  return adapter
}
const getDatabase = () => {
  if (typeof window !== 'undefined') throw new Error('Business database is server-only')
  const config = getDatabaseConfig()
  if (!config.url || !config.apiKey) throw Object.assign(new Error(config.provider === 'supabase'
    ? 'Configure SUPABASE_URL and SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY'
    : 'Configure APPWRITE_API_KEY'), { code: 503 })
  if (config.provider === 'supabase') {
    const { createClient } = require('@supabase/supabase-js')
    return createDatabase(createClient(config.url, config.apiKey, { auth: { persistSession: false, autoRefreshToken: false } }), config)
  }
  const { Client, TablesDB, Query: sdkQuery } = require('node-appwrite')
  const client = new Client().setEndpoint(config.url).setProject(config.projectId).setKey(config.apiKey)
  return createAppwriteDatabase(new TablesDB(client), sdkQuery, config)
}
module.exports = { Query, getDatabase, getDatabaseConfig, isDatabaseConfigured, createDatabase, createAppwriteDatabase, fromRow, toData, encryptSettings, decryptSettings, schema }
