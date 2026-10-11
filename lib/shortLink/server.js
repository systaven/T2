import { createHash, randomBytes } from 'crypto'
import { isExternalHttpLink } from '@/lib/utils/externalLink'
import { siteConfig } from '@/lib/config'
import { getDatabase, getDatabaseConfig, isDatabaseConfigured, Query } from '@/lib/server/businessDatabase.cjs'

const SHORT_CODE_LENGTH = 8
const SHORT_CODE_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const FILE_LIKE_URL_PATTERN =
  /\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|txt|csv|json|xml|mp3|mp4|mov|avi|apk|dmg|exe|iso)(?:[?#]|$)/i
const NOTION_FILE_HOST_PATTERN = /(^|\.)file\.notion\.(?:com|so)$/i
// SSR workers are long-lived. These caches remove repeated database reads on
// common page renders without turning a changed Notion link into stale data.
const CODE_CACHE_TTL_MS = 10 * 60 * 1000
const TARGET_CACHE_TTL_MS = 60 * 1000
const SOURCE_SYNC_CACHE_TTL_MS = 60 * 1000
const codeCache = new Map()
const targetCache = new Map()
const sourceSyncCache = new Map()

const getBlockValue = entry => entry?.value?.value || entry?.value || entry

const getServiceConfig = getDatabaseConfig
export const isShortLinkServiceConfigured = isDatabaseConfigured

const normalizeExternalUrl = href => {
  const siteOrigin = siteConfig('LINK') || undefined
  if (!isExternalHttpLink(href, siteOrigin)) return null

  try {
    return new URL(href).toString()
  } catch {
    return null
  }
}

// Attachments stay direct. Redirecting a signed Notion file URL would make
// browsers download the /r HTML page instead of the file.
const isDirectDownloadUrl = href => {
  if (typeof href !== 'string') return false
  if (FILE_LIKE_URL_PATTERN.test(href)) return true

  try {
    return NOTION_FILE_HOST_PATTERN.test(new URL(href).hostname)
  } catch {
    return false
  }
}

const getTargetHash = href =>
  createHash('sha256').update(href).digest('hex')

const readCache = (cache, key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.value
}

const writeCache = (cache, key, value, ttl) => {
  cache.set(key, { value, expiresAt: Date.now() + ttl })
  return value
}

const invalidateTargetCache = targetHash => {
  for (const [code, entry] of targetCache) {
    if (entry.targetHash === targetHash) targetCache.delete(code)
  }
}

const getSourceKey = (postId, targetHash) =>
  createHash('sha256').update(`${postId}:${targetHash}`).digest('hex')

const getUrlSetFingerprint = urls =>
  createHash('sha256').update([...urls].sort().join('\n')).digest('hex')

const makeShortCode = () => {
  const bytes = randomBytes(SHORT_CODE_LENGTH)
  return Array.from(bytes, byte =>
    SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length]
  ).join('')
}

const getTablesDb = getDatabase

const findRowByHash = async (tablesDB, targetHash) => {
  const { databaseId, tableId } = getServiceConfig()
  const result = await tablesDB.listRows({
    databaseId,
    tableId,
    queries: [Query.equal('targetHash', targetHash), Query.limit(1)]
  })

  return result.rows?.[0] || null
}

/**
 * Returns a stable code for an external URL. The unique target hash makes the
 * operation safe when ISR requests try to create the same short link together.
 */
export const getOrCreateShortCode = async href => {
  const targetUrl = normalizeExternalUrl(href)
  if (!targetUrl || !isShortLinkServiceConfigured()) return null

  const targetHash = getTargetHash(targetUrl)
  const cachedCode = readCache(codeCache, targetHash)
  if (cachedCode) return cachedCode

  const tablesDB = getTablesDb()
  const { databaseId, tableId } = getServiceConfig()
  const existing = await findRowByHash(tablesDB, targetHash)
  if (existing?.code) {
    return writeCache(codeCache, targetHash, existing.code, CODE_CACHE_TTL_MS)
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const row = await tablesDB.createRow({
        databaseId,
        tableId,
        rowId: 'unique()',
        data: {
          code: makeShortCode(),
          targetHash,
          targetUrl
        }
      })
      return writeCache(codeCache, targetHash, row.code, CODE_CACHE_TTL_MS)
    } catch (error) {
      // Another build/request may have inserted this URL first. Prefer that
      // record instead of emitting a second code.
      const concurrentRow = await findRowByHash(tablesDB, targetHash)
      if (concurrentRow?.code) {
        return writeCache(
          codeCache,
          targetHash,
          concurrentRow.code,
          CODE_CACHE_TTL_MS
        )
      }
      if (attempt === 3) throw error
    }
  }

  return null
}

const visitDecorationLinks = (value, visitor) => {
  if (!Array.isArray(value)) return

  if (value[0] === 'a' && typeof value[1] === 'string') {
    visitor(value)
    return
  }

  value.forEach(item => {
    if (Array.isArray(item)) visitDecorationLinks(item, visitor)
  })
}

export const collectPostExternalUrls = blockMap => {
  const urls = new Set()

  Object.values(blockMap?.block || {}).forEach(entry => {
    const block = getBlockValue(entry)
    if (!block?.properties) return

    if (block.type === 'bookmark') {
      const bookmarkUrl = block.properties.link?.[0]?.[0]
      const normalizedBookmarkUrl = isDirectDownloadUrl(bookmarkUrl)
        ? null
        : normalizeExternalUrl(bookmarkUrl)
      if (normalizedBookmarkUrl) urls.add(normalizedBookmarkUrl)
    }

    Object.values(block.properties).forEach(property => {
      visitDecorationLinks(property, format => {
        const normalizedUrl = isDirectDownloadUrl(format[1])
          ? null
          : normalizeExternalUrl(format[1])
        if (normalizedUrl) urls.add(normalizedUrl)
      })
    })
  })

  return Array.from(urls)
}

/**
 * Apply generated routes to ordinary rich-text links.
 *
 * react-notion-x reads Bookmark's `properties.link` for both its href and
 * visible URL, so it is preserved and ArticleLink replaces only the href.
 */
export const applyShortLinkRoutes = (blockMap, routes) => {
  if (!routes?.size) return 0
  let rewritten = 0

  const replaceHref = href => {
    const normalizedUrl = normalizeExternalUrl(href)
    return normalizedUrl ? routes.get(normalizedUrl) || href : href
  }

  Object.values(blockMap?.block || {}).forEach(entry => {
    const block = getBlockValue(entry)
    if (!block?.properties) return

    Object.values(block.properties).forEach(property => {
      if (block.type === 'bookmark' && property === block.properties.link) {
        return
      }
      visitDecorationLinks(property, format => {
        const previousHref = format[1]
        const nextHref = replaceHref(previousHref)
        if (nextHref !== previousHref) {
          format[1] = nextHref
          rewritten += 1
        }
      })
    })
  })

  return rewritten
}

const listPostSources = async (tablesDB, postId) => {
  const { databaseId, sourceTableId } = getServiceConfig()
  const result = await tablesDB.listRows({
    databaseId,
    tableId: sourceTableId,
    queries: [Query.equal('postId', postId), Query.limit(5000)]
  })
  return result.rows || []
}

const syncPostSources = async (tablesDB, postId, urls) => {
  const { databaseId, sourceTableId } = getServiceConfig()
  const targetHashes = new Set(urls.map(getTargetHash))
  const currentRows = await listPostSources(tablesDB, postId)
  const currentHashes = new Set(currentRows.map(row => row.targetHash))

  await Promise.all(
    currentRows
      .filter(row => !targetHashes.has(row.targetHash))
      .map(async row => {
        await tablesDB.deleteRow({
          databaseId,
          tableId: sourceTableId,
          rowId: row.$id
        })
        invalidateTargetCache(row.targetHash)
      })
  )

  await Promise.all(
    Array.from(targetHashes)
      .filter(targetHash => !currentHashes.has(targetHash))
      .map(targetHash =>
        tablesDB.createRow({
          databaseId,
          tableId: sourceTableId,
          rowId: 'unique()',
          data: {
            postId,
            targetHash,
            sourceKey: getSourceKey(postId, targetHash)
          }
        })
      )
  )
}

/**
 * Called by resolvePostProps, so it runs for production builds, ISR refreshes,
 * and SSR rendering. A missing API key deliberately leaves existing Base64
 * redirect behaviour in place.
 */
export const preparePostShortLinks = async (blockMap, postId) => {
  if (!isShortLinkServiceConfigured() || !postId) return {}

  const urls = collectPostExternalUrls(blockMap)
  const routes = new Map()

  for (const url of urls) {
    const code = await getOrCreateShortCode(url)
    if (code) routes.set(url, `/r/${code}`)
  }

  // This source set is what makes a no-longer-used code expire after a Notion
  // article changes, while still allowing another article to reuse the code.
  const sourceFingerprint = getUrlSetFingerprint(urls)
  const cachedFingerprint = readCache(sourceSyncCache, postId)
  if (cachedFingerprint !== sourceFingerprint) {
    await syncPostSources(getTablesDb(), postId, urls)
    writeCache(
      sourceSyncCache,
      postId,
      sourceFingerprint,
      SOURCE_SYNC_CACHE_TTL_MS
    )
  }

  applyShortLinkRoutes(blockMap, routes)
  return Object.fromEntries(routes)
}

export const findShortLinkTarget = async code => {
  if (!/^[A-Za-z0-9]{8}$/.test(code || '')) {
    return null
  }

  const cachedTarget = readCache(targetCache, code)
  if (cachedTarget !== null) return cachedTarget

  const tablesDB = getTablesDb()
  const { databaseId, tableId } = getServiceConfig()
  const result = await tablesDB.listRows({
    databaseId,
    tableId,
    queries: [Query.equal('code', code), Query.limit(1)]
  })
  const row = result.rows?.[0]
  if (!row?.targetHash) return null

  const sourceResult = await tablesDB.listRows({
    databaseId,
    tableId: getServiceConfig().sourceTableId,
    queries: [Query.equal('targetHash', row.targetHash), Query.limit(1)]
  })
  if (!sourceResult.rows?.length) return null

  const targetUrl = row.targetUrl
  const target = normalizeExternalUrl(targetUrl)
  if (!target) return null
  targetCache.set(code, {
    value: target,
    targetHash: row.targetHash,
    expiresAt: Date.now() + TARGET_CACHE_TTL_MS
  })
  return target
}
