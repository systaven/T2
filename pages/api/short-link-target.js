import { findShortLinkTarget } from '@/lib/shortLink/server'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = typeof req.query?.token === 'string' ? req.query.token : ''
  let target
  try {
    target = await findShortLinkTarget(token)
  } catch (error) {
    console.error('[short-link]', error)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(503).json({ error: '链接暂时无法加载，请重试。' })
  }
  if (!target) return res.status(404).json({ error: 'Not found' })

  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return res.status(200).json({ url: target })
}
