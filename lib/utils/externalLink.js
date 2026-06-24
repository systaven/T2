const EXTERNAL_HTTP_LINK = /^https?:\/\//i
const REDIRECT_ROUTE_PREFIX = '/r'

const encodeBase64 = value => {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64')
  }

  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

const decodeBase64 = value => {
  if (typeof window === 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8')
  }

  const binary = window.atob(value)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

const toBase64Url = value =>
  encodeBase64(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

const fromBase64Url = value => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddingLength = (4 - (normalized.length % 4)) % 4
  const padding = '='.repeat(paddingLength)

  return decodeBase64(`${normalized}${padding}`)
}

export const mergeRelValues = (...values) => {
  const rel = new Set()

  values
    .filter(Boolean)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .forEach(token => rel.add(token))

  return rel.size > 0 ? Array.from(rel).join(' ') : undefined
}

export const isExternalHttpLink = (href, siteOrigin) => {
  if (typeof href !== 'string' || !EXTERNAL_HTTP_LINK.test(href)) {
    return false
  }

  if (!siteOrigin) {
    return true
  }

  try {
    const hrefUrl = new URL(href)
    return hrefUrl.origin !== siteOrigin
  } catch {
    return true
  }
}

export const encodeExternalUrl = href => {
  if (typeof href !== 'string' || !href.trim()) return null
  return toBase64Url(href.trim())
}

export const decodeExternalUrl = token => {
  if (typeof token !== 'string' || !token.trim()) return null

  try {
    return fromBase64Url(token.trim())
  } catch {
    return null
  }
}

export const buildExternalRedirectPath = href => {
  const token = encodeExternalUrl(href)
  return token ? `${REDIRECT_ROUTE_PREFIX}/${token}` : href
}

export const validateExternalRedirectTarget = (href, siteOrigin) => {
  if (!isExternalHttpLink(href, siteOrigin)) return null

  try {
    const url = new URL(href)
    return url.toString()
  } catch {
    return null
  }
}

export const EXTERNAL_REDIRECT_ROUTE_PREFIX = REDIRECT_ROUTE_PREFIX
