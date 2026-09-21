import { COMMENT_TABLES } from '@/lib/comments/constants'
import { safePublicUrl } from '@/lib/comments/server'
import {
  getAdminConfig,
  getAdminDb,
  requireAdmin,
  sendAdminError
} from '@/lib/admin/server'

const map = row => ({
  id: row.$id,
  postId: row.postId,
  postTitle: row.postTitle,
  href: safePublicUrl(row.href),
  parentId: row.parentId,
  authorType: row.authorType,
  authorId: row.authorId,
  authorName: row.authorName,
  authorEmail: row.authorEmail,
  authorAvatar: row.authorAvatar,
  content: row.content,
  status: row.status,
  likes: row.likes || 0,
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt
})

export default async function handler(req, res) {
  if (!['GET', 'PATCH', 'DELETE'].includes(req.method))
    return res.status(405).end()
  try {
    await requireAdmin(req)
    const db = getAdminDb()
    const service = getAdminConfig()
    if (req.method === 'GET') {
      const { Query } = require('node-appwrite')
      const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100)
      const offset = Math.max(Number(req.query.offset) || 0, 0)
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ]
      if (req.query.status && req.query.status !== 'all')
        queries.unshift(Query.equal('status', String(req.query.status)))
      const result = await db.listRows({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.comments,
        queries,
        total: true
      })
      return res
        .status(200)
        .json({ data: result.rows.map(map), total: result.total })
    }
    const id = String(req.body?.id || req.query.id || '')
    if (!id) return res.status(400).json({ error: '缺少评论标识。' })
    if (req.method === 'DELETE') {
      await db.deleteRow({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.comments,
        rowId: id
      })
      return res.status(200).json({ success: true })
    }
    const status = String(req.body?.status || '')
    if (!['visible', 'hidden', 'deleted', 'pending', 'spam'].includes(status)) {
      return res.status(400).json({ error: '无效的评论状态。' })
    }
    const row = await db.updateRow({
      databaseId: service.databaseId,
      tableId: COMMENT_TABLES.comments,
      rowId: id,
      data: {
        status,
        ...(status === 'deleted' ? { content: '' } : {})
      }
    })
    return res.status(200).json({ data: map(row) })
  } catch (error) {
    return sendAdminError(res, error)
  }
}
