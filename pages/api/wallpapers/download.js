import {
  getWallpaperPage,
  readWallpaperSettings
} from '@/lib/wallpapers/server'

export const config = { api: { responseLimit: '25mb' } }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const page = Number(req.query.page)
  const id = String(req.query.id || '')
  if (!Number.isInteger(page) || page < 1 || page > 10 || !/^\d+-\d+$/.test(id))
    return res.status(400).json({ error: '无效作品' })
  try {
    const settings = await readWallpaperSettings()
    if (!settings.enabled || page > settings.maxPages)
      return res.status(404).end()
    const data = await getWallpaperPage(page, settings)
    const item = data.items.find(value => value.id === id)
    if (!item)
      return res.status(404).json({ error: '作品已更新，请刷新壁纸墙。' })
    const response = await fetch(item.original, {
      signal: AbortSignal.timeout(30000)
    })
    const type = response.headers.get('content-type') || ''
    if (!response.ok || !/^image\/(jpeg|png|webp|gif)/.test(type))
      throw new Error('原图暂时无法下载，请到 Pixiv 原作页面查看。')
    const reader = response.body.getReader()
    const chunks = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 25 * 1024 * 1024) {
        await reader.cancel()
        throw new Error('原图超过 25MB，请到原作页面下载。')
      }
      chunks.push(value)
    }
    const extension =
      {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
      }[type.split(';')[0]] || 'jpg'
    res.setHeader('Content-Type', type)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pixiv-${item.id}.${extension}"`
    )
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    return res.send(Buffer.concat(chunks))
  } catch (error) {
    return res.status(502).json({
      error:
        error.name === 'TimeoutError' || error.name === 'AbortError'
          ? '原图源响应超时，请稍后重试或查看 Pixiv 原作。'
          : error.message
    })
  }
}
