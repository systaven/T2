import { Query } from '@/lib/server/businessDatabase.cjs'
import {
  getAdminConfig,
  getAdminDb,
  getRequestUser,
  getUserRole,
  requireAdmin,
  sendAdminError
} from '@/lib/admin/server'

const mapRow = row => ({ id: row.$id, ...row })

export default async function handler(req, res) {
  try {
    const db = getAdminDb()
    const service = getAdminConfig()
    if (req.method === 'GET') {
      const user = await getRequestUser(req)
      const role = await getUserRole(user)
      const queries = [Query.orderDesc('$createdAt'), Query.limit(100)]
      if (role !== 'admin') queries.unshift(Query.equal('published', true))
      const rows = await db.listRows({
        databaseId: service.databaseId,
        tableId: service.announcementsTableId,
        queries
      })
      return res
        .status(200)
        .json({ data: rows.rows.map(mapRow), total: rows.total })
    }
    if (req.method === 'POST') {
      const user = await requireAdmin(req)
      const { title, content, published = true } = req.body || {}
      if (!title?.trim())
        return res.status(400).json({ error: 'Title is required' })
      const row = await db.createRow({
        databaseId: service.databaseId,
        tableId: service.announcementsTableId,
        rowId: 'unique()',
        data: {
          title: title.trim().slice(0, 255),
          content: String(content || '').slice(0, 16000),
          published: Boolean(published),
          authorId: user.id
        }
      })
      return res.status(201).json({ data: mapRow(row) })
    }
    return res.status(405).end()
  } catch (error) {
    return sendAdminError(res, error)
  }
}
