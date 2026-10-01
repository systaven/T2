/** @jest-environment node */
import {
  DEFAULT_WALLPAPER_SETTINGS,
  normalizeWallpaper,
  normalizeWallpaperSettings
} from '@/lib/wallpapers/constants'
import {
  fetchWallpaperSource,
  getWallpaperPage,
  readWallpaperSettings,
  writeWallpaperSettings
} from '@/lib/wallpapers/server'
import { getAdminDb } from '@/lib/admin/server'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'

jest.mock('@/lib/admin/server', () => ({
  getAdminDb: jest.fn(),
  getAdminConfig: () => ({ databaseId: 'test-db' })
}))
jest.mock('@/lib/cache/cache_manager', () => ({
  getDataFromCache: jest.fn(),
  setDataToCache: jest.fn()
}))

const settings = normalizeWallpaperSettings(DEFAULT_WALLPAPER_SETTINGS)
const sample = {
  pid: 1234,
  p: 0,
  title: '风景',
  author: '画师',
  uid: 456,
  width: 1920,
  height: 1080,
  tags: ['风景'],
  aiType: 0,
  r18: false,
  urls: {
    small:
      'https://i.pximg.net/c/540x540_70/img-master/img/2026/01/01/00/00/00/1234_p0_master1200.jpg',
    original:
      'https://i.pximg.net/img-original/img/2026/01/01/00/00/00/1234_p0.png'
  }
}
const jsonResponse = body => ({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => {
  global.fetch = jest.fn()
  getDataFromCache.mockResolvedValue(null)
  setDataToCache.mockResolvedValue(undefined)
})

test('community age classification is checked against artwork tags as well', () => {
  for (const tag of ['R-15', 'R-16', 'R-rated']) {
    expect(
      normalizeWallpaper({ ...sample, tags: [tag] }, 'lolicon', settings)
    ).toBeNull()
  }
  expect(
    normalizeWallpaper({ ...sample, tags: ['R-18'] }, 'lolicon', settings)
  ).toBeNull()
  expect(
    normalizeWallpaper({ ...sample, r18: true }, 'lolicon', settings)
  ).toBeNull()
  expect(
    normalizeWallpaper({ ...sample, aiType: 2 }, 'lolicon', settings)
  ).toBeNull()
  expect(
    normalizeWallpaper({ ...sample, height: 7000 }, 'lolicon', settings)
  ).toBeNull()
  expect(
    normalizeWallpaper({ ...sample, tags: ['广告'] }, 'lolicon', {
      ...settings,
      blockedTags: ['广告']
    })
  ).toBeNull()
})

test('normalizes metadata and proxy addresses without accepting arbitrary download URLs', () => {
  const item = normalizeWallpaper(sample, 'lolicon', settings)
  expect(item).toMatchObject({
    id: '1234-0',
    pid: '1234',
    artworkUrl: 'https://www.pixiv.net/artworks/1234',
    author: '画师'
  })
  expect(item.preview).toContain('https://i.pixiv.re/c/')
  expect(item.original).toContain('https://i.pixiv.re/img-original/')
  expect(
    normalizeWallpaper(
      { ...sample, urls: { small: 'https://example.com/private' } },
      'lolicon',
      settings
    )
  ).toBeNull()
})

test('ranking original URLs support single and multiple page works', () => {
  const ranked = {
    illust_id: 1234,
    url: sample.urls.small,
    width: 1920,
    height: 1080
  }
  expect(normalizeWallpaper(ranked, 'daily', settings).original).toBe(
    'https://pixiv.re/1234.jpg'
  )
  expect(
    normalizeWallpaper({ ...ranked, illust_page_count: '2' }, 'daily', settings)
      .original
  ).toBe('https://pixiv.re/1234-1.jpg')
})

test('settings reject unsafe domains, clamp costs, and exclude inherited object properties', () => {
  expect(() =>
    normalizeWallpaperSettings({ proxy: '127.0.0.1:8080' })
  ).toThrow()
  expect(
    normalizeWallpaperSettings({
      pageSize: 999,
      maxPages: 100,
      source: '__proto__',
      proxy: 'https://i.pixiv.re/'
    })
  ).toMatchObject({
    pageSize: 48,
    maxPages: 10,
    source: 'lolicon',
    proxy: 'i.pixiv.re'
  })
})

test('adapter applies filtering to upstream results', async () => {
  fetch.mockResolvedValue(
    jsonResponse({ data: [sample, { ...sample, pid: 2222, tags: ['R-18'] }] })
  )
  const items = await fetchWallpaperSource('lolicon', 1, settings)
  expect(items).toHaveLength(1)
  const called = new URL(fetch.mock.calls[0][0])
  expect(called.searchParams.get('r18')).toBe('0')
  expect(called.searchParams.getAll('size')).toEqual(['small', 'original'])
})

test('concurrent visitors share an upstream request and later visitors use the cache', async () => {
  fetch.mockResolvedValue(jsonResponse({ data: [sample] }))
  const first = await Promise.all([
    getWallpaperPage(1, settings),
    getWallpaperPage(1, settings)
  ])
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(first[0].items).toHaveLength(1)
  getDataFromCache.mockResolvedValue(first[0])
  expect((await getWallpaperPage(1, settings)).cached).toBe(true)
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('upstream failure uses configured fallback and stale cache when both fail', async () => {
  fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(
    jsonResponse({
      contents: [{ ...sample, illust_id: 1234, url: sample.urls.small }]
    })
  )
  const result = await getWallpaperPage(2, settings)
  expect(result).toMatchObject({ fallback: true, source: 'daily' })
  getDataFromCache.mockResolvedValue({ ...result, expires: 0 })
  fetch.mockRejectedValue(new Error('offline'))
  expect(await getWallpaperPage(3, settings)).toMatchObject({
    stale: true,
    cached: true
  })
})

test('missing settings use cached defaults to avoid database reads per visitor', async () => {
  const db = { getRow: jest.fn().mockRejectedValue({ code: 404 }) }
  getAdminDb.mockReturnValue(db)
  await readWallpaperSettings({ fresh: true })
  await readWallpaperSettings()
  await readWallpaperSettings()
  expect(db.getRow).toHaveBeenCalledTimes(1)
})

test('first save creates an isolated private settings table and subsequent reads reflect changes', async () => {
  const db = {
    getTable: jest
      .fn()
      .mockRejectedValueOnce({ code: 404 })
      .mockResolvedValue({
        columns: [
          { key: 'payload', status: 'available' },
          { key: 'updatedBy', status: 'available' }
        ]
      }),
    createTable: jest.fn(),
    updateRow: jest.fn().mockRejectedValue({ code: 404 }),
    createRow: jest.fn()
  }
  getAdminDb.mockReturnValue(db)
  await writeWallpaperSettings({ ...settings, enabled: false }, 'admin-1')
  expect(db.createTable).toHaveBeenCalledWith(
    expect.objectContaining({
      tableId: 'wallpaper_settings',
      permissions: [],
      rowSecurity: true
    })
  )
  expect(db.createRow).toHaveBeenCalledWith(
    expect.objectContaining({
      rowId: 'config',
      permissions: [],
      data: expect.objectContaining({ updatedBy: 'admin-1' })
    })
  )
  expect((await readWallpaperSettings()).enabled).toBe(false)
})
