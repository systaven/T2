import { COMMENT_TABLES } from '@/lib/comments/constants'
import { commentApiError, getActor } from '@/lib/comments/server'
import { getAdminConfig, getAdminDb } from '@/lib/admin/server'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const actor = await getActor(req, req.body?.guestToken)
    if (!actor) return res.status(401).json({ error: '身份凭证无效。' })
    const db = getAdminDb()
    const service = getAdminConfig()
    const commentId = String(req.query.id)
    await db.getRow({
      databaseId: service.databaseId,
      tableId: COMMENT_TABLES.comments,
      rowId: commentId
    })
    const { Query } = require('node-appwrite')
    const current = await db.listRows({
      databaseId: service.databaseId,
      tableId: COMMENT_TABLES.likes,
      queries: [
        Query.equal('commentId', commentId),
        Query.equal('actorHash', actor.hash),
        Query.limit(1)
      ],
      total: false
    })
    const existing = current.rows[0]
    let comment
    if (existing) {
      await db.deleteRow({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.likes,
        rowId: existing.$id
      })
      comment = await db.decrementRowColumn({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.comments,
        rowId: commentId,
        column: 'likes',
        value: 1,
        min: 0
      })
    } else {
      await db.createRow({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.likes,
        rowId: 'unique()',
        data: { commentId, actorHash: actor.hash }
      })
      comment = await db.incrementRowColumn({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.comments,
        rowId: commentId,
        column: 'likes',
        value: 1
      })
    }
    return res.status(200).json({ liked: !existing, likes: comment.likes || 0 })
  } catch (error) {
    return commentApiError(res, error)
  }
}
