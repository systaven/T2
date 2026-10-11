import { COMMENT_TABLES } from '@/lib/comments/constants'
import { schema } from '@/lib/server/businessDatabase.cjs'
import { getAdminConfig, getAdminDb, requireAdmin, sendAdminError } from '@/lib/admin/server'

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end()
  try {
    await requireAdmin(req)
    const db = getAdminDb()
    const tables = {}
    for (const tableId of Object.values(COMMENT_TABLES)) {
      try {
        await db.getTable({ tableId })
        tables[tableId] = true
      } catch (error) {
        if (error?.code !== 404) throw error
        if (req.method === 'POST' && getAdminConfig().provider === 'appwrite') {
          const definition = schema[tableId]
          await db.createTable({ tableId, name: tableId, rowSecurity: false, enabled: true, columns: definition.columns, indexes: definition.indexes })
          tables[tableId] = true
        } else tables[tableId] = false
      }
    }
    const ready = Object.values(tables).every(Boolean)
    if (req.method === 'POST' && !ready) return res.status(409).json({ error: '请先由维护者执行数据库迁移，再重新检查。', ready, tables })
    return res.status(200).json({ ready, tables })
  } catch (error) {
    return sendAdminError(res, error)
  }
}
