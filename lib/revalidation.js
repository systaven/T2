import BLOG from '@/blog.config'
import { cleanCache } from '@/lib/cache/local_file_cache'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'
import { clearRssRuntimeCache } from '@/lib/utils/rss_runtime_cache'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export function getRevalidationToken() {
  return process.env.REVALIDATION_TOKEN || BLOG.REVALIDATION_TOKEN || ''
}

export function normalizePath(input) {
  if (!input || typeof input !== 'string') return '/'
  let normalized = input.trim()
  if (!normalized.startsWith('/')) normalized = '/' + normalized
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

export function getAuthorizedToken(req) {
  const authHeader = req.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return req.body?.token || req.query?.token || ''
}

export function clearDerivedContentCache() {
  cleanCache()
  clearRssRuntimeCache()
  cleanGeneratedFeedFiles()
}

export async function getAllPathsForRevalidation() {
  const snapshots = await getSiteSnapshots()
  const paths = new Set()

  snapshots.forEach(({ locale, props }) => {
    getStaticPaths(locale).forEach(item => paths.add(item))

    const pagePaths = Array.isArray(props?.allPages)
      ? props.allPages
        .map(page => withLocalePrefix(page?.href || page?.slug || '', locale))
        .map(normalizePath)
        .filter(item => item && item !== '/')
      : []

    pagePaths.forEach(item => paths.add(item))
  })

  return [...paths]
}

export async function revalidatePaths(res, paths) {
  const results = []

  for (const item of paths) {
    const normalizedPath = normalizePath(item)
    try {
      await res.revalidate(normalizedPath)
      results.push({ path: normalizedPath, revalidated: true })
    } catch (error) {
      results.push({
        path: normalizedPath,
        revalidated: false,
        error: error.message
      })
    }
  }

  return results
}

export async function buildSiteContentSignature() {
  const snapshots = await getSiteSnapshots()
  const normalized = snapshots.map(({ locale, props }) => ({
    locale: locale || BLOG.LANG,
    siteInfo: {
      title: props?.siteInfo?.title || '',
      description: props?.siteInfo?.description || '',
      pageCover: props?.siteInfo?.pageCover || '',
      icon: props?.siteInfo?.icon || ''
    },
    pages: (props?.allPages || [])
      .map(page => ({
        id: page?.id || '',
        slug: page?.slug || '',
        href: page?.href || '',
        title: page?.title || '',
        status: page?.status || '',
        type: page?.type || '',
        publishDay: page?.publishDay || '',
        lastEditedDay: page?.lastEditedDay || '',
        pageCover: page?.pageCover || '',
        pageCoverThumbnail: page?.pageCoverThumbnail || ''
      }))
      .sort((a, b) => a.id.localeCompare(b.id) || a.slug.localeCompare(b.slug))
  }))

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
}

async function getSiteSnapshots() {
  const siteIds = String(BLOG.NOTION_PAGE_ID || '')
    .split(',')
    .filter(Boolean)

  if (siteIds.length === 0) {
    return [{ locale: '', props: await fetchGlobalAllData({ from: 'revalidation-default' }) }]
  }

  const snapshots = []
  for (let index = 0; index < siteIds.length; index++) {
    const siteId = siteIds[index]
    const pageId = extractLangId(siteId)
    const locale = extractLangPrefix(siteId)
    const props = await fetchGlobalAllData({
      pageId,
      locale: locale || undefined,
      from: `revalidation-${locale || 'default'}`
    })

    snapshots.push({ locale, props })

    if (index === 0 && !locale) {
      continue
    }
  }

  return snapshots
}

function getStaticPaths(locale) {
  const basePaths = ['/', '/archive', '/category', '/tag', '/search', '/sitemap.xml', '/rss/feed.xml', '/rss/atom.xml', '/rss/feed.json']
  return basePaths.map(item => withLocalePrefix(item, locale))
}

function withLocalePrefix(rawPath, locale) {
  const normalizedPath = normalizePath(rawPath)
  if (!locale || locale === BLOG.LANG) {
    return normalizedPath
  }
  if (normalizedPath === '/') {
    return `/${locale}`
  }
  return `/${locale}${normalizedPath}`
}

function cleanGeneratedFeedFiles() {
  const files = [
    path.join(process.cwd(), 'public', 'rss', 'feed.xml'),
    path.join(process.cwd(), 'public', 'rss', 'atom.xml'),
    path.join(process.cwd(), 'public', 'rss', 'feed.json'),
    path.join(process.cwd(), 'public', 'sitemap.xml'),
    path.join(process.cwd(), 'sitemap.xml')
  ]

  files.forEach(file => {
    try {
      fs.rmSync(file, { force: true })
    } catch (error) {
      console.warn(
        '[revalidation] Failed to remove generated file:',
        file,
        error?.message || error
      )
    }
  })
}
