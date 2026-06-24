import { extractLinkPreview } from '@/lib/utils/linkPreview'
import { validateExternalRedirectTarget } from '@/lib/utils/externalLink'
import { siteConfig } from '@/lib/config'
import { getOrSetDataWithCustomCache } from '@/lib/cache/cache_manager'
import md5 from 'js-md5'

const REQUEST_TIMEOUT_MS = 5000
const HTML_PREVIEW_LIMIT = 300000
const PREVIEW_CACHE_TTL_SECONDS = 24 * 60 * 60

const fetchWithTimeout = async (url, init) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!siteConfig('LINK_PREVIEW_ENABLE', true)) {
    return res.status(403).json({ error: 'Link preview disabled' })
  }

  const siteOrigin = siteConfig('LINK') || undefined
  const rawUrl =
    typeof req.query?.url === 'string'
      ? req.query.url
      : Array.isArray(req.query?.url)
        ? req.query.url[0]
        : ''
  const targetUrl = validateExternalRedirectTarget(rawUrl, siteOrigin)

  if (!targetUrl) {
    return res.status(400).json({ error: 'Invalid url' })
  }

  try {
    const cacheKey = `link_preview_${md5(targetUrl)}`
    const preview = await getOrSetDataWithCustomCache(
      cacheKey,
      PREVIEW_CACHE_TTL_SECONDS,
      async () => {
        const response = await fetchWithTimeout(targetUrl, {
          redirect: 'follow',
          headers: {
            'user-agent':
              'Mozilla/5.0 (compatible; NotionNextLinkPreview/1.0; +https://blog.vachiika.me)',
            accept: 'text/html,application/xhtml+xml'
          }
        })

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('text/html')) {
          return {
            title: new URL(targetUrl).hostname,
            description: null,
            image: null,
            favicon: `${new URL(targetUrl).origin}/favicon.ico`,
            siteName: new URL(targetUrl).hostname,
            url: response.url || targetUrl
          }
        }

        const html = (await response.text()).slice(0, HTML_PREVIEW_LIMIT)
        return extractLinkPreview({
          html,
          url: response.url || targetUrl
        })
      }
    )

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=604800'
    )
    return res.status(200).json(preview)
  } catch (error) {
    const fallback = {
      title: null,
      description: null,
      image: null,
      favicon: `${new URL(targetUrl).origin}/favicon.ico`,
      siteName: new URL(targetUrl).hostname,
      url: targetUrl,
      error: 'preview_unavailable'
    }

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=86400'
    )
    return res.status(200).json(fallback)
  }
}
