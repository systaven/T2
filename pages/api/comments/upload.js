import {
  commentApiError,
  getActor,
  getClientIp,
  readCommentSettings,
  verifyTurnstile
} from '@/lib/comments/server'

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const settings = await readCommentSettings()
    const upload = settings.imageUpload
    if (!upload.enabled || !upload.endpoint)
      return res.status(403).json({ error: '评论图片上传尚未启用。' })
    const actor = await getActor(req, req.body?.guestToken)
    if (!actor) return res.status(401).json({ error: '身份凭证无效。' })
    if (actor.type === 'guest' && settings.turnstile.enabled) {
      const verified = await verifyTurnstile({
        token: req.body?.turnstileToken,
        secret: settings.turnstile.secretKey,
        ip: getClientIp(req)
      })
      if (!verified)
        return res.status(403).json({ error: '上传图片前请完成人机验证。' })
    }
    const match = String(req.body?.dataUrl || '').match(
      /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/
    )
    if (!match)
      return res
        .status(400)
        .json({ error: '只支持 PNG、JPEG、GIF 和 WebP 图片。' })
    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length > Number(upload.maxSizeMb || 5) * 1024 * 1024) {
      return res
        .status(413)
        .json({ error: `图片不能超过 ${upload.maxSizeMb || 5}MB。` })
    }
    const extension = match[1].split('/')[1].replace('jpeg', 'jpg')
    const form = new FormData()
    form.set(
      'file',
      new Blob([buffer], { type: match[1] }),
      `comment-${Date.now()}.${extension}`
    )
    if (upload.strategyId) form.set('strategy_id', String(upload.strategyId))
    if (upload.albumId) form.set('album_id', String(upload.albumId))
    const endpoint = upload.endpoint
      .replace(/\/$/, '')
      .endsWith('/api/v1/upload')
      ? upload.endpoint.replace(/\/$/, '')
      : `${upload.endpoint.replace(/\/$/, '')}/api/v1/upload`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(upload.token
          ? {
              Authorization: `Bearer ${upload.token.replace(/^Bearer\s+/i, '')}`
            }
          : {})
      },
      body: form
    })
    const result = await response.json().catch(() => ({}))
    const url = result?.data?.links?.url || result?.data?.url
    if (!response.ok || !url)
      throw new Error(result?.message || '兰空图床上传失败。')
    return res.status(200).json({ url })
  } catch (error) {
    return commentApiError(res, error)
  }
}
