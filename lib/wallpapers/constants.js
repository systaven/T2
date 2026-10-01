export const WALLPAPER_SOURCES = {
  lolicon: '社区精选',
  anosu: 'Anosu 精选',
  daily: 'Pixiv 日榜',
  weekly: 'Pixiv 周榜',
  monthly: 'Pixiv 月榜',
  original: 'Pixiv 原创榜',
  mixed: '精选与日榜'
}

export const DEFAULT_WALLPAPER_SETTINGS = {
  enabled: true,
  source: 'lolicon',
  fallbackSource: 'daily',
  pageSize: 24,
  maxPages: 8,
  cacheHours: 24,
  proxy: 'i.pixiv.re',
  excludeAI: true,
  excludeLongImages: true,
  blockedTags: [
    'R-15',
    'R-16',
    'R-rated',
    'R-18',
    'R18',
    'R-18G',
    'NSFW',
    '裸',
    '裸体',
    '乳首',
    '全裸',
    '性器',
    '露出',
    '性交'
  ],
  keyword: ''
}

const bounded = (value, fallback, min, max) => {
  const number = Number(value)
  return Number.isFinite(number)
    ? Math.min(max, Math.max(min, Math.round(number)))
    : fallback
}

export function normalizeWallpaperSettings(value = {}) {
  const defaults = DEFAULT_WALLPAPER_SETTINGS
  const proxy = String(value.proxy || defaults.proxy)
    .trim()
    .replace(/^https:\/\//, '')
    .replace(/\/$/, '')
  if (!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(proxy))
    throw new Error('图片代理请填写有效域名，例如 i.pixiv.re')
  return {
    enabled: value.enabled !== false,
    source: Object.hasOwn(WALLPAPER_SOURCES, value.source)
      ? value.source
      : defaults.source,
    fallbackSource:
      value.fallbackSource === 'none' ||
      Object.hasOwn(WALLPAPER_SOURCES, value.fallbackSource)
        ? value.fallbackSource
        : defaults.fallbackSource,
    pageSize: bounded(value.pageSize, defaults.pageSize, 12, 48),
    maxPages: bounded(value.maxPages, defaults.maxPages, 1, 10),
    cacheHours: bounded(value.cacheHours, defaults.cacheHours, 1, 72),
    proxy,
    excludeAI: value.excludeAI !== false,
    excludeLongImages: value.excludeLongImages !== false,
    blockedTags: (Array.isArray(value.blockedTags)
      ? value.blockedTags
      : defaults.blockedTags
    )
      .map(tag => String(tag).trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 100),
    keyword: String(value.keyword || '')
      .trim()
      .slice(0, 80)
  }
}

export function imageUrl(value, proxy) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port)
      return ''
    // Providers use pximg mirrors; keep paths and serve from the chosen proxy.
    if (
      !/^\/(?:c\/[^/]+\/)?(?:img-original|img-master|custom-thumb)\/img\//.test(
        url.pathname
      )
    )
      return ''
    url.hostname = proxy
    return url.toString()
  } catch {
    return ''
  }
}

export function normalizeWallpaper(item, source, settings) {
  const id = String(item.pid || item.illust_id || item.id || '')
  if (!/^\d+$/.test(id)) return null
  const tags = (Array.isArray(item.tags) ? item.tags : [])
    .map(tag => (typeof tag === 'string' ? tag : tag?.name || tag?.tag || ''))
    .filter(Boolean)
  const restriction = Number(item.x_restrict || 0)
  const content = item.illust_content_type || {}
  const ai = Number(item.aiType ?? item.illust_ai_type ?? item.ai_type ?? 0)
  if (
    item.r18 ||
    restriction > 0 ||
    Number(content.sexual) > 0 ||
    Number(item.illust_type) > 0
  )
    return null
  if (settings.excludeAI && ai === 2) return null
  const blocked = [
    ...DEFAULT_WALLPAPER_SETTINGS.blockedTags,
    ...settings.blockedTags
  ].map(tag => tag.toLowerCase())
  if (
    tags.some(tag => blocked.some(block => tag.toLowerCase().includes(block)))
  )
    return null
  const width = Number(item.width) || 1200
  const height = Number(item.height) || 1600
  if (
    settings.excludeLongImages &&
    (height / width > 2.4 || width / height > 3)
  )
    return null
  const page = Number(item.p) || 0
  const preview = imageUrl(
    item.urls?.small || item.urls?.regular || item.url || item.urls?.original,
    settings.proxy
  )
  const original =
    imageUrl(item.urls?.original, settings.proxy) ||
    `https://pixiv.re/${id}${Number(item.illust_page_count || item.page_count || 1) > 1 ? `-${page + 1}` : ''}.jpg`
  if (!preview) return null
  return {
    id: `${id}-${page}`,
    pid: id,
    page,
    title: String(item.title || '未命名作品').slice(0, 255),
    author: String(
      item.author || item.user_name || item.user?.name || '未知作者'
    ).slice(0, 100),
    authorUrl: `https://www.pixiv.net/users/${item.uid || item.user_id || item.user?.id || ''}`,
    artworkUrl: `https://www.pixiv.net/artworks/${id}`,
    width,
    height,
    tags: tags.slice(0, 30),
    preview,
    original,
    source,
    rank: Number(item.rank) || null
  }
}
