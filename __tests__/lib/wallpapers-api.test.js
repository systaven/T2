/** @jest-environment node */
import handler from '@/pages/api/admin/wallpapers'
import publicHandler from '@/pages/api/wallpapers'
import downloadHandler from '@/pages/api/wallpapers/download'
import { requireAdmin } from '@/lib/admin/server'
import {
  getWallpaperPage,
  readWallpaperSettings,
  writeWallpaperSettings
} from '@/lib/wallpapers/server'

jest.mock('@/lib/admin/server', () => ({
  requireAdmin: jest.fn(),
  sendAdminError: (res, err) =>
    res.status(err.statusCode || 500).json({ error: err.message })
}))
jest.mock('@/lib/wallpapers/server', () => ({
  getWallpaperPage: jest.fn(),
  readWallpaperSettings: jest.fn(),
  writeWallpaperSettings: jest.fn()
}))
const response = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn()
  }
  res.status.mockReturnValue(res)
  return res
}

test.each([401, 403])(
  'rejects unauthorized settings writes with %i',
  async code => {
    requireAdmin.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { statusCode: code })
    )
    const res = response()
    await handler({ method: 'PUT', body: { settings: {} } }, res)
    expect(res.status).toHaveBeenCalledWith(code)
    expect(writeWallpaperSettings).not.toHaveBeenCalled()
  }
)

test('admin saves settings and tests unsaved settings without persisting them', async () => {
  requireAdmin.mockResolvedValue({ id: 'owner' })
  writeWallpaperSettings.mockResolvedValue({ enabled: false })
  getWallpaperPage.mockResolvedValue({
    items: [1, 2],
    source: 'daily',
    fallback: true
  })
  const req = { method: 'PUT', body: { settings: { enabled: false } } }
  const res = response()
  await handler(req, res)
  expect(writeWallpaperSettings).toHaveBeenCalledWith(
    expect.objectContaining({ enabled: false }),
    'owner'
  )
  expect(res.json).toHaveBeenCalledWith({ data: { enabled: false } })
  writeWallpaperSettings.mockClear()
  await handler({ ...req, method: 'POST' }, res)
  expect(writeWallpaperSettings).not.toHaveBeenCalled()
  expect(res.json).toHaveBeenLastCalledWith({
    count: 2,
    source: 'daily',
    fallback: true
  })
})

test('download returns a cached artwork as an attachment and rejects unknown IDs', async () => {
  readWallpaperSettings.mockResolvedValue({ enabled: true, maxPages: 8 })
  getWallpaperPage.mockResolvedValue({
    items: [
      {
        id: '123-0',
        original: 'https://i.pixiv.re/img-original/img/sample.jpg'
      }
    ]
  })
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: new Map([['content-type', 'image/jpeg']]),
    body: {
      getReader: () => ({
        read: jest
          .fn()
          .mockResolvedValueOnce({ done: false, value: Buffer.from('image') })
          .mockResolvedValueOnce({ done: true })
      })
    }
  })
  const res = response()
  await downloadHandler(
    { method: 'GET', query: { page: '1', id: '123-0' } },
    res
  )
  expect(res.send).toHaveBeenCalledWith(Buffer.from('image'))
  expect(res.setHeader).toHaveBeenCalledWith(
    'Content-Disposition',
    'attachment; filename="pixiv-123-0.jpg"'
  )
  global.fetch.mockClear()
  await downloadHandler(
    { method: 'GET', query: { page: '1', id: '999-0' } },
    res
  )
  expect(res.status).toHaveBeenLastCalledWith(404)
  expect(global.fetch).not.toHaveBeenCalled()
})

test('download source timeouts produce a readable error without navigating away', async () => {
  readWallpaperSettings.mockResolvedValue({ enabled: true, maxPages: 8 })
  getWallpaperPage.mockResolvedValue({
    items: [
      {
        id: '123-0',
        original: 'https://i.pixiv.re/img-original/img/sample.jpg'
      }
    ]
  })
  global.fetch = jest
    .fn()
    .mockRejectedValue(
      Object.assign(new Error('timeout'), { name: 'TimeoutError' })
    )
  const res = response()
  await downloadHandler(
    { method: 'GET', query: { page: '1', id: '123-0' } },
    res
  )
  expect(res.status).toHaveBeenCalledWith(502)
  expect(res.json).toHaveBeenCalledWith({
    error: '原图源响应超时，请稍后重试或查看 Pixiv 原作。'
  })
})

test('disabled wall does not contact upstream and invalid pages are rejected', async () => {
  readWallpaperSettings.mockResolvedValue({ enabled: false })
  const res = response()
  await publicHandler({ method: 'GET', query: { page: '1' } }, res)
  expect(getWallpaperPage).not.toHaveBeenCalled()
  expect(res.json).toHaveBeenCalledWith({
    enabled: false,
    items: [],
    hasMore: false
  })
  await publicHandler({ method: 'GET', query: { page: '999' } }, res)
  expect(res.status).toHaveBeenLastCalledWith(400)
})
