import { commentApiError, getPublicCommentConfig } from '@/lib/comments/server'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const config = await getPublicCommentConfig()
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    )
    return res.status(200).json({ data: config })
  } catch (error) {
    return commentApiError(res, error)
  }
}
