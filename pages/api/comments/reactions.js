import { COMMENT_TABLES, REACTIONS } from '@/lib/comments/constants'
import {
  buildEmptyReactionState,
  commentApiError,
  getActor,
  hashValue,
  safeReactionState
} from '@/lib/comments/server'
import { getAdminConfig, getAdminDb } from '@/lib/admin/server'

const rowIdFor = postId => hashValue(`reaction:${postId}`).slice(0, 36)

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).end()
  try {
    const postId = String(
      req.method === 'GET' ? req.query.postId : req.body?.postId || ''
    )
      .trim()
      .slice(0, 128)
    if (!postId) return res.status(400).json({ error: '缺少文章标识。' })
    const actor = await getActor(
      req,
      req.method === 'GET' ? req.headers['x-guest-token'] : req.body?.guestToken
    )
    const db = getAdminDb()
    const service = getAdminConfig()
    let row = null
    try {
      row = await db.getRow({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.reactions,
        rowId: rowIdFor(postId)
      })
    } catch (error) {
      if (error?.code !== 404) throw error
    }
    let state = row ? safeReactionState(row.votes) : buildEmptyReactionState()
    if (req.method === 'PUT') {
      if (!actor) return res.status(401).json({ error: '身份凭证无效。' })
      const reaction = String(req.body?.reaction || '')
      if (!REACTIONS.some(item => item.id === reaction))
        return res.status(400).json({ error: '未知的文章评价。' })
      const previous = state.voters[actor.hash]
      if (previous === reaction) delete state.voters[actor.hash]
      else state.voters[actor.hash] = reaction
      state.counts = Object.fromEntries(REACTIONS.map(item => [item.id, 0]))
      for (const value of Object.values(state.voters)) {
        if (Object.hasOwn(state.counts, value)) state.counts[value] += 1
      }
      const data = { postId, votes: JSON.stringify(state) }
      if (row) {
        row = await db.updateRow({
          databaseId: service.databaseId,
          tableId: COMMENT_TABLES.reactions,
          rowId: row.$id,
          data
        })
      } else {
        row = await db.createRow({
          databaseId: service.databaseId,
          tableId: COMMENT_TABLES.reactions,
          rowId: rowIdFor(postId),
          data
        })
      }
    }
    return res.status(200).json({
      counts: state.counts,
      selected: actor ? state.voters[actor.hash] || null : null
    })
  } catch (error) {
    return commentApiError(res, error)
  }
}
