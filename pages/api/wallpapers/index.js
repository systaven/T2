import {
  getWallpaperPage,
  readWallpaperSettings
} from '@/lib/wallpapers/server'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const page = Number(req.query.page || 1)
  if (!Number.isInteger(page) || page < 1 || page > 10)
    return res.status(400).json({ error: '无效页码' })
  try {
    const settings = await readWallpaperSettings()
    if (!settings.enabled)
      return res.status(200).json({ enabled: false, items: [], hasMore: false })
    if (page > settings.maxPages)
      return res.status(200).json({ enabled: true, items: [], hasMore: false })
    const data = await getWallpaperPage(page, settings)
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res.status(200).json({ ...data, enabled: true })
  } catch (error) {
    res.setHeader('Retry-After', '60')
    return res.status(503).json({ error: error.message })
  }
}
