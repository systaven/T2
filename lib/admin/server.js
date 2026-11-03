import { clerkClient, getAuth } from '@clerk/nextjs/server'

import { getDatabase, getDatabaseConfig, isDatabaseConfigured, Query } from '@/lib/server/businessDatabase.cjs'

const ROLE_CACHE_TTL = 5 * 60 * 1000
const roleCache = new Map()
const config = getDatabaseConfig
const getDb = getDatabase

const getEmail = user =>
  user?.primaryEmailAddress?.emailAddress ||
  user?.emailAddresses?.[0]?.emailAddress ||
  ''

const configuredAdmins = () =>
  new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  )

const getCached = key => {
  const entry = roleCache.get(key)
  if (!entry || entry.expiresAt < Date.now()) return null
  return entry.value
}

const cache = (key, value) => {
  roleCache.set(key, { value, expiresAt: Date.now() + ROLE_CACHE_TTL })
  return value
}

const readBootstrapAdmin = async db => {
  const service = config()
  try {
    return await db.getRow({
      databaseId: service.databaseId,
      tableId: service.settingsTableId,
      rowId: 'bootstrap'
    })
  } catch (error) {
    if (error?.code === 404) return null
    throw error
  }
}

const ensureBootstrapAdmin = async (db, userId) => {
  const current = await readBootstrapAdmin(db)
  if (current) return current.adminUserId
  const service = config()
  try {
    const row = await db.createRow({
      databaseId: service.databaseId,
      tableId: service.settingsTableId,
      rowId: 'bootstrap',
      data: { adminUserId: userId }
    })
    return row.adminUserId
  } catch (error) {
    // A simultaneous first login can only create this fixed row once.
    if (error?.code !== 409) throw error
    const winner = await readBootstrapAdmin(db)
    return winner?.adminUserId || null
  }
}

export const getRequestUser = async req => {
  const { userId } = getAuth(req)
  if (!userId) {
    const error = new Error('Unauthorized')
    error.statusCode = 401
    throw error
  }
  return clerkClient.users.getUser(userId)
}

export const getUserRole = async user => {
  const cached = getCached(user.id)
  if (cached) return cached

  const email = getEmail(user).toLowerCase()
  if (configuredAdmins().has(email)) return cache(user.id, 'admin')

  const db = getDb()
  const service = config()
  const roles = await db.listRows({
    databaseId: service.databaseId,
    tableId: service.rolesTableId,
    queries: [Query.equal('userId', user.id), Query.limit(1)]
  })
  if (roles.rows?.[0]?.role) return cache(user.id, roles.rows[0].role)

  // With no ADMIN_EMAILS, the first completed login wins a fixed-row race.
  if (configuredAdmins().size === 0) {
    const bootstrapUserId = await ensureBootstrapAdmin(db, user.id)
    if (bootstrapUserId === user.id) return cache(user.id, 'admin')
  }
  return cache(user.id, 'user')
}

export const getRolesForUsers = async users => {
  const pending = users.filter(user => !getCached(user.id))
  if (pending.length) {
    const db = getDb()
    const service = config()
    const result = await db.listRows({
      databaseId: service.databaseId,
      tableId: service.rolesTableId,
      queries: [
        Query.equal(
          'userId',
          pending.map(user => user.id)
        ),
        Query.limit(pending.length)
      ]
    })
    const explicitRoles = new Map(
      result.rows.map(row => [row.userId, row.role])
    )
    const bootstrap =
      configuredAdmins().size === 0 ? await readBootstrapAdmin(db) : null
    pending.forEach(user => {
      const email = getEmail(user).toLowerCase()
      const role = configuredAdmins().has(email)
        ? 'admin'
        : explicitRoles.get(user.id) ||
          (bootstrap?.adminUserId === user.id ? 'admin' : 'user')
      cache(user.id, role)
    })
  }
  return new Map(users.map(user => [user.id, getCached(user.id) || 'user']))
}

export const requireAdmin = async req => {
  const user = await getRequestUser(req)
  const role = await getUserRole(user)
  if (role !== 'admin') {
    const error = new Error('Forbidden')
    error.statusCode = 403
    throw error
  }
  return user
}

export const getAdminDb = getDb
export const getAdminConfig = config
export const getClerkEmail = getEmail
export const clearRoleCache = userId => roleCache.delete(userId)

export const sendAdminError = (res, error) => {
  const status = error?.statusCode || error?.code || 500
  const configured = isDatabaseConfigured()
  const message = !configured && status >= 500
    ? `Admin service is not configured: configure ${config().provider} server credentials first.`
    : error?.message || 'Admin service failed'
  if (status >= 500) console.error('[admin]', error)
  return res.status(status).json({ error: message })
}
