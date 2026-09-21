import { COMMENT_TABLES } from '@/lib/comments/constants'
import {
  commentApiError,
  getActor,
  mapCommentRow,
  readCommentSettings
} from '@/lib/comments/server'
import { getAdminConfig, getAdminDb } from '@/lib/admin/server'

export default async function handler(req, res) {
  if (!['PUT', 'DELETE'].includes(req.method)) return res.status(405).end()
  try {
    const db = getAdminDb()
    const service = getAdminConfig()
    const body = req.body || {}
    const actor = await getActor(req, body.guestToken)
    if (!actor) return res.status(401).json({ error: '身份凭证无效。' })
    const row = await db.getRow({
      databaseId: service.databaseId,
      tableId: COMMENT_TABLES.comments,
      rowId: String(req.query.id)
    })
    if (row.actorHash !== actor.hash)
      return res.status(403).json({ error: '不能管理其他人的评论。' })
    const settings = await readCommentSettings()
    if (actor.type === 'guest') {
      const deadline =
        new Date(row.$createdAt).getTime() +
        settings.guestEditMinutes * 60 * 1000
      if (req.method === 'PUT' && Date.now() > deadline) {
        return res
          .status(403)
          .json({
            error: `游客只能在发布后 ${settings.guestEditMinutes} 分钟内编辑。`
          })
      }
    }
    if (req.method === 'DELETE') {
      const updated = await db.updateRow({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.comments,
        rowId: row.$id,
        data: { status: 'deleted', content: '', edited: true }
      })
      return res.status(200).json({ data: mapCommentRow(updated, actor.hash) })
    }
    const content = String(body.content || '')
      .trim()
      .slice(0, settings.maxCommentLength)
    if (!content) return res.status(400).json({ error: '评论内容不能为空。' })
    const updated = await db.updateRow({
      databaseId: service.databaseId,
      tableId: COMMENT_TABLES.comments,
      rowId: row.$id,
      data: { content, edited: true }
    })
    return res.status(200).json({ data: mapCommentRow(updated, actor.hash) })
  } catch (error) {
    return commentApiError(res, error)
  }
}
