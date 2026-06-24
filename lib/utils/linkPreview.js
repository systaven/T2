const META_TAG_PATTERN = /<meta\s+[^>]*?(?:name|property)=["']([^"']+)["'][^>]*?content=["']([^"']*)["'][^>]*?>/gi
const META_TAG_REVERSED_PATTERN = /<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:name|property)=["']([^"']+)["'][^>]*?>/gi
const LINK_ICON_PATTERN = /<link\s+[^>]*?rel=["']([^"']+)["'][^>]*?href=["']([^"']+)["'][^>]*?>/gi
const LINK_ICON_REVERSED_PATTERN = /<link\s+[^>]*?href=["']([^"']+)["'][^>]*?rel=["']([^"']+)["'][^>]*?>/gi
const IMG_PATTERN = /<img\s+[^>]*?src=["']([^"']+)["'][^>]*?>/gi
const TITLE_PATTERN = /<title[^>]*>([\s\S]*?)<\/title>/i

const decodeHtmlEntities = value => {
  if (typeof value !== 'string') return ''

  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .trim()
}

const stripHtml = value =>
  decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())

const pickFirst = (...values) => values.find(value => typeof value === 'string' && value.trim())

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const collectMetaMap = html => {
  const map = new Map()
  let match

  while ((match = META_TAG_PATTERN.exec(html)) !== null) {
    map.set(match[1].toLowerCase(), decodeHtmlEntities(match[2]))
  }

  while ((match = META_TAG_REVERSED_PATTERN.exec(html)) !== null) {
    map.set(match[2].toLowerCase(), decodeHtmlEntities(match[1]))
  }

  return map
}

const collectIcons = (html, baseUrl) => {
  const icons = []
  let match

  while ((match = LINK_ICON_PATTERN.exec(html)) !== null) {
    if (/\bicon\b/i.test(match[1])) {
      const iconUrl = toAbsoluteUrl(match[2], baseUrl)
      if (iconUrl) icons.push(iconUrl)
    }
  }

  while ((match = LINK_ICON_REVERSED_PATTERN.exec(html)) !== null) {
    if (/\bicon\b/i.test(match[2])) {
      const iconUrl = toAbsoluteUrl(match[1], baseUrl)
      if (iconUrl) icons.push(iconUrl)
    }
  }

  return icons
}

const extractFirstImage = (html, baseUrl) => {
  let match

  while ((match = IMG_PATTERN.exec(html)) !== null) {
    const imageUrl = toAbsoluteUrl(match[1], baseUrl)
    if (imageUrl) return imageUrl
  }

  return null
}

export const extractLinkPreview = ({ html, url }) => {
  const baseUrl = typeof url === 'string' ? url : ''
  const meta = collectMetaMap(html)
  const titleMatch = html.match(TITLE_PATTERN)
  const title = pickFirst(
    meta.get('og:title'),
    meta.get('twitter:title'),
    titleMatch ? stripHtml(titleMatch[1]) : ''
  )
  const description = pickFirst(
    meta.get('og:description'),
    meta.get('twitter:description'),
    meta.get('description')
  )
  const image = pickFirst(
    toAbsoluteUrl(meta.get('og:image'), baseUrl),
    toAbsoluteUrl(meta.get('twitter:image'), baseUrl),
    extractFirstImage(html, baseUrl)
  )

  let resolvedUrl = baseUrl
  try {
    resolvedUrl = pickFirst(meta.get('og:url'), baseUrl)
  } catch {
    resolvedUrl = baseUrl
  }

  const icons = collectIcons(html, baseUrl)
  const fallbackFavicon = toAbsoluteUrl('/favicon.ico', baseUrl)
  const favicon = pickFirst(
    icons[0],
    toAbsoluteUrl(meta.get('og:image:secure_url'), baseUrl),
    fallbackFavicon
  )

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    favicon: favicon || null,
    siteName: pickFirst(meta.get('og:site_name'), meta.get('application-name')),
    url: resolvedUrl || baseUrl
  }
}
