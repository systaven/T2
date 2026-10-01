import crypto from 'crypto'
import { getAdminConfig, getAdminDb } from '@/lib/admin/server'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import {
  DEFAULT_WALLPAPER_SETTINGS,
  normalizeWallpaper,
  normalizeWallpaperSettings
} from './constants'

const TABLE = 'wallpaper_settings'
const settingsCache = { value: null, expires: 0 }
const pending = new Map()
const failures = new Map()

export async function readWallpaperSettings({
  fresh = false,
  strict = false
} = {}) {
  if (!fresh && settingsCache.expires > Date.now()) return settingsCache.value
  let settings =
    settingsCache.value ||
    normalizeWallpaperSettings(DEFAULT_WALLPAPER_SETTINGS)
  try {
    const db = getAdminDb()
    const { databaseId } = getAdminConfig()
    const row = await db.getRow({ databaseId, tableId: TABLE, rowId: 'config' })
    settings = normalizeWallpaperSettings(JSON.parse(row.payload))
  } catch (error) {
    if (strict && error.code !== 404) throw error
    if (error.code !== 404)
      console.warn('[wallpapers] settings unavailable:', error.message)
  }
  settingsCache.value = settings
  settingsCache.expires = Date.now() + 5 * 60 * 1000
  return settings
}

export async function writeWallpaperSettings(value, userId) {
  const settings = normalizeWallpaperSettings(value)
  const db = getAdminDb()
  const { databaseId } = getAdminConfig()
  let created = false
  try {
    await db.getTable({ databaseId, tableId: TABLE })
  } catch (error) {
    if (error.code !== 404) throw error
    try {
      await db.createTable({
        databaseId,
        tableId: TABLE,
        name: 'Wallpaper settings',
        rowSecurity: true,
        permissions: [],
        columns: [
          { key: 'payload', type: 'mediumtext', required: true },
          { key: 'updatedBy', type: 'varchar', size: 128, required: false }
        ]
      })
      created = true
    } catch (creationError) {
      if (creationError.code !== 409) throw creationError
    }
  }
  if (created) {
    // Appwrite may still be provisioning inline columns after creating a table.
    let ready = false
    for (let attempt = 0; attempt < 12; attempt++) {
      const table = await db.getTable({ databaseId, tableId: TABLE })
      ready = ['payload', 'updatedBy'].every(key =>
        table.columns?.some(
          column => column.key === key && String(column.status) === 'available'
        )
      )
      if (ready) break
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    if (!ready) throw new Error('壁纸墙设置表正在初始化，请稍后再次保存。')
  }
  const data = { payload: JSON.stringify(settings), updatedBy: userId }
  try {
    await db.updateRow({ databaseId, tableId: TABLE, rowId: 'config', data })
  } catch (error) {
    if (error.code !== 404) throw error
    try {
      await db.createRow({
        databaseId,
        tableId: TABLE,
        rowId: 'config',
        data,
        permissions: []
      })
    } catch (creationError) {
      if (creationError.code !== 409) throw creationError
      await db.updateRow({ databaseId, tableId: TABLE, rowId: 'config', data })
    }
  }
  settingsCache.value = settings
  settingsCache.expires = Date.now() + 5 * 60 * 1000
  return settings
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(10000)
  })
  if (!response.ok) throw new Error(`图片源返回 ${response.status}`)
  return response.json()
}

export async function fetchWallpaperSource(source, page, settings) {
  if (source === 'mixed') {
    const results = await Promise.allSettled(
      ['lolicon', 'daily'].map(name =>
        fetchWallpaperSource(name, page, settings)
      )
    )
    const items = results.flatMap(result =>
      result.status === 'fulfilled' ? result.value : []
    )
    if (!items.length) throw new Error('精选和日榜暂时无法访问')
    return items
  }
  let items
  if (source === 'lolicon') {
    const params = new URLSearchParams({
      r18: '0',
      num: '20',
      excludeAI: String(settings.excludeAI),
      proxy: settings.proxy
    })
    params.append('size', 'small')
    params.append('size', 'original')
    if (settings.keyword) params.set('keyword', settings.keyword)
    const body = await fetchJson(
      `https://api.lolicon.app/setu/v2?${params.toString()}`
    )
    if (body.error) throw new Error(body.error)
    items = body.data
  } else if (source === 'anosu') {
    const params = new URLSearchParams({
      r18: '0',
      num: '30',
      proxy: settings.proxy,
      size: 'original'
    })
    if (settings.keyword) params.set('keyword', settings.keyword)
    const body = await fetchJson(
      `https://image.anosu.top/pixiv/json?${params.toString()}`
    )
    items = Array.isArray(body) ? body : body.data
    items = items?.map(item => ({
      ...item,
      urls: item.urls || {
        original: item.url,
        small: item.url
          ?.replace('/img-original/', '/c/540x540_70/img-master/')
          .replace(/_p(\d+)\.[a-z]+$/, '_p$1_master1200.jpg')
      }
    }))
  } else {
    const params = new URLSearchParams({
      format: 'json',
      mode: source,
      content: source === 'original' ? 'all' : 'illust',
      p: String(Math.min(page, 10))
    })
    const body = await fetchJson(
      `https://www.pixiv.net/ranking.php?${params.toString()}`,
      {
        headers: {
          Referer: 'https://www.pixiv.net/',
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json'
        }
      }
    )
    items = body.contents
  }
  if (!Array.isArray(items)) throw new Error('图片源返回格式不正确')
  return items
    .map(item => normalizeWallpaper(item, source, settings))
    .filter(Boolean)
}

export async function getWallpaperPage(page, settings, { probe = false } = {}) {
  const digest = crypto
    .createHash('sha256')
    .update(JSON.stringify(settings))
    .digest('hex')
    .slice(0, 20)
  const key = `wallpaper-v1-${digest}-${page}`
  const cached = await getDataFromCache(key, true)
  if (!probe && cached && cached.expires > Date.now())
    return { ...cached, cached: true }
  if (!probe && failures.get(key) > Date.now()) {
    if (cached) return { ...cached, stale: true, cached: true }
    throw new Error('图片源暂时不可用，请稍后重试。')
  }
  if (pending.has(key)) return pending.get(key)
  const promise = (async () => {
    const sources = [
      ...new Set(
        [settings.source, settings.fallbackSource].filter(
          source => source !== 'none'
        )
      )
    ]
    for (const source of sources) {
      try {
        const records = await fetchWallpaperSource(source, page, settings)
        const items = [
          ...new Map(records.map(item => [item.id, item])).values()
        ].slice(0, settings.pageSize)
        if (!items.length) throw new Error('没有符合筛选条件的图片')
        const result = {
          items,
          source,
          updatedAt: new Date().toISOString(),
          expires: Date.now() + settings.cacheHours * 3600000,
          hasMore: page < settings.maxPages,
          page,
          fallback: source !== settings.source
        }
        if (!probe) await setDataToCache(key, result, 7 * 86400)
        return result
      } catch (error) {
        console.warn(`[wallpapers] ${source}:`, error.message)
      }
    }
    failures.set(key, Date.now() + 60000)
    if (failures.size > 100) failures.delete(failures.keys().next().value)
    if (cached) return { ...cached, stale: true, cached: true }
    throw new Error('图片源暂时不可用，请稍后重试。')
  })()
  pending.set(key, promise)
  try {
    return await promise
  } finally {
    pending.delete(key)
  }
}
