// This policy must match the Cloudflare rule. It contains no Node-only imports.
const isAnonymousRootRequest = ({
  method,
  pathname,
  search = '',
  cookie = '',
  authorization = ''
}) =>
  ['GET', 'HEAD'].includes(method) &&
  pathname === '/' &&
  !search &&
  !cookie &&
  !authorization
const rootCacheHeaders = ttl => {
  const seconds = Number(ttl || 86400)
  if (!Number.isInteger(seconds) || seconds < 3600 || seconds > 86400)
    throw new Error(
      'Root edge cache TTL must be between 3600 and 86400 seconds'
    )
  return {
    'Cloudflare-CDN-Cache-Control': `public, max-age=${seconds}`,
    'Cache-Control': 'public, max-age=0, must-revalidate'
  }
}
module.exports = { isAnonymousRootRequest, rootCacheHeaders }
