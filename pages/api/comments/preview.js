import { renderComment } from '@/lib/comments/server'

export const config = { api: { bodyParser: { sizeLimit: '64kb' } } }

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const content = String(req.body?.content || '').slice(0, 10000)
  return res.status(200).json({ html: renderComment(content) })
}
