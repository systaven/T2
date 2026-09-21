import { clerkClient } from '@clerk/nextjs/server'
import {
  clearRoleCache,
  getAdminConfig,
  getAdminDb,
  getClerkEmail,
  getUserRole,
  requireAdmin,
  sendAdminError
} from '@/lib/admin/server'

export default async function handler(req, res) {
  const userId = req.query.id
  if (typeof userId !== 'string')
    return res.status(400).json({ error: 'Invalid user id' })
  try {
    const actor = await requireAdmin(req)
    const user = await clerkClient.users.getUser(userId)
    if (req.method === 'GET') {
      return res
        .status(200)
        .json({
          data: {
            id: user.id,
            name: user.fullName || user.username || getClerkEmail(user),
            email: getClerkEmail(user),
            role: await getUserRole(user)
          }
        })
    }
    if (req.method !== 'PUT') return res.status(405).end()
    const role = req.body?.role
    if (!['admin', 'user'].includes(role))
      return res.status(400).json({ error: 'Role must be admin or user' })
    if (actor.id === userId && role !== 'admin')
      return res
        .status(409)
        .json({ error: '不能降低当前登录账号自己的管理员权限。' })
    const db = getAdminDb()
    const service = getAdminConfig()
    const { Query } = require('node-appwrite')
    const existing = await db.listRows({
      databaseId: service.databaseId,
      tableId: service.rolesTableId,
      queries: [Query.equal('userId', userId), Query.limit(1)]
    })
    const data = { userId, email: getClerkEmail(user), role }
    if (existing.rows?.[0]) {
      await db.updateRow({
        databaseId: service.databaseId,
        tableId: service.rolesTableId,
        rowId: existing.rows[0].$id,
        data
      })
    } else {
      await db.createRow({
        databaseId: service.databaseId,
        tableId: service.rolesTableId,
        rowId: 'unique()',
        data
      })
    }
    clearRoleCache(userId)
    return res.status(200).json({ data: { id: userId, ...data } })
  } catch (error) {
    return sendAdminError(res, error)
  }
}
