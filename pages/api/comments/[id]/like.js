import { commentApiError, getActor } from '@/lib/comments/server'
import { getAdminDb } from '@/lib/admin/server'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const actor = await getActor(req, req.body?.guestToken)
    if (!actor) return res.status(401).json({ error: '身份凭证无效。' })
    const result = await getAdminDb().toggleCommentLike(String(req.query.id), actor.hash)
    return res.status(200).json(result)
  } catch (error) {
    return commentApiError(res, error)
  }
}
