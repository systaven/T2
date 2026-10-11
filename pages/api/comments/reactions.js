import { REACTIONS } from '@/lib/comments/constants'
import { commentApiError, getActor } from '@/lib/comments/server'
import { getAdminDb } from '@/lib/admin/server'

export default async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).end()
  try {
    const postId = String(req.method === 'GET' ? req.query.postId || '' : req.body?.postId || '').trim().slice(0, 128)
    if (!postId) return res.status(400).json({ error: '缺少文章标识。' })
    const actor = await getActor(req, req.method === 'GET' ? req.headers['x-guest-token'] : req.body?.guestToken)
    const reaction = req.method === 'PUT' ? String(req.body?.reaction || '') : null
    if (req.method === 'PUT') {
      if (!actor) return res.status(401).json({ error: '身份凭证无效。' })
      if (!REACTIONS.some(item => item.id === reaction)) return res.status(400).json({ error: '未知的文章评价。' })
    }
    const result = await getAdminDb().articleReaction(postId, actor?.hash || '', reaction)
    return res.status(200).json(result)
  } catch (error) {
    return commentApiError(res, error)
  }
}
