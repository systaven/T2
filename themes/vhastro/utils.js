export const enabled = value => value === true || value === 'true'

export function menuIcon(name = '', href = '') {
  const value = `${name} ${href}`.toLowerCase()
  const mappings = [
    ['archive', /归档|archive/],
    ['friends', /友情链接|友链|朋友|friend/],
    ['message', /留言|message|guestbook/],
    ['talking', /说说|动态|talk/],
    ['rss', /订阅|rss|feed/],
    ['about', /关于|about/],
    ['tags', /分类|标签|category|tag/],
    ['search', /搜索|search/]
  ]
  return mappings.find(([, pattern]) => pattern.test(value))?.[0] || 'link'
}

export function normalizeMenus(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item, index) => ({
      id: item.id || `menu-${index}`,
      name: item.name || item.title || item.label || '',
      href: item.href || item.url || '',
      target: item.target,
      show: item.show,
      children: normalizeMenus(item.subMenus || item.children || [])
    }))
    .filter(
      item =>
        item.show !== false && item.name && (item.href || item.children.length)
    )
}

export function previewHref(href, asPath = '') {
  if (
    typeof href !== 'string' ||
    !href.startsWith('/') ||
    href.startsWith('//') ||
    /^\/(admin|r|sign-in|sign-up)(\/|$|\?)/.test(href)
  )
    return href
  const current = new URL(asPath || '/', 'https://preview.local')
  if (current.searchParams.get('theme') !== 'vhastro') return href
  const target = new URL(href, current.origin)
  if (!target.searchParams.has('theme'))
    target.searchParams.set('theme', 'vhastro')
  return `${target.pathname}${target.search}${target.hash}`
}

export const commentsVisible = (post, lock, setting = true) =>
  Boolean(
    post &&
    !lock &&
    enabled(setting) &&
    String(post.comment || '').toLowerCase() !== 'hide'
  )
export const postHref = post => post.href || `/${post.slug || post.id}`

export function pageNumbers(page, total) {
  return Array.from({ length: total }, (_, i) => i + 1)
    .filter(n => n === 1 || n === total || Math.abs(n - page) <= 2)
    .flatMap((n, i, list) => (i && n - list[i - 1] > 1 ? ['…', n] : [n]))
}
