import { requireAdmin, sendAdminError } from '@/lib/admin/server'
import {
  getWallpaperPage,
  readWallpaperSettings,
  writeWallpaperSettings
} from '@/lib/wallpapers/server'
import { normalizeWallpaperSettings } from '@/lib/wallpapers/constants'

export default async function handler(req, res) {
  if (!['GET', 'PUT', 'POST'].includes(req.method)) return res.status(405).end()
  res.setHeader('Cache-Control', 'no-store')
  try {
    const user = await requireAdmin(req)
    if (req.method === 'GET')
      return res.json({
        data: await readWallpaperSettings({ fresh: true, strict: true })
      })
    const settings = normalizeWallpaperSettings(req.body?.settings || {})
    if (req.method === 'POST') {
      const data = await getWallpaperPage(1, settings, { probe: true })
      return res.json({
        count: data.items.length,
        source: data.source,
        fallback: data.fallback
      })
    }
    return res.json({ data: await writeWallpaperSettings(settings, user.id) })
  } catch (error) {
    return sendAdminError(res, error)
  }
}
