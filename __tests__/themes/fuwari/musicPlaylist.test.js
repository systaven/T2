import {
  BACKUP_METING_API,
  DEFAULT_METING_API,
  fetchMusicPlaylist,
  musicEnabled,
  normalizeMusicPlaylist
} from '@/themes/fuwari/utils/musicPlaylist'

const song = {
  name: '原歌单歌曲',
  artist: ['甲', '乙'],
  url: 'https://example.com/music.mp3',
  duration: 180000
}
const options = { api: DEFAULT_METING_API, server: 'netease', id: '6686195786' }
const response = body => ({ ok: true, json: () => Promise.resolve(body) })

beforeEach(() => {
  global.fetch = jest.fn()
})

test('normalizes string switches and filters missing audio URLs', () => {
  expect(musicEnabled('false')).toBe(false)
  expect(musicEnabled('true')).toBe(true)
  expect(normalizeMusicPlaylist([song, null, { url: '' }])).toEqual([
    expect.objectContaining({
      title: '原歌单歌曲',
      artist: '甲 / 乙',
      duration: 180
    })
  ])
})

test('default 403 falls back using the same server and playlist ID', async () => {
  fetch
    .mockResolvedValueOnce({ ok: false, status: 403 })
    .mockResolvedValueOnce(response([song]))
  expect(await fetchMusicPlaylist(options)).toMatchObject({
    backup: true,
    songs: [expect.objectContaining({ title: song.name })]
  })
  const url = new URL(fetch.mock.calls[1][0])
  expect(url.origin).toBe(new URL(BACKUP_METING_API).origin)
  expect(url.searchParams.get('id')).toBe(options.id)
  expect(url.searchParams.get('server')).toBe(options.server)
})

test('custom APIs are not silently replaced and malformed/empty lists report errors', async () => {
  const custom = { ...options, api: 'https://example.com/music?id=:id' }
  fetch.mockResolvedValue(response({ data: 'wrong shape' }))
  await expect(fetchMusicPlaylist(custom)).rejects.toThrow('没有返回歌曲列表')
  expect(fetch).toHaveBeenCalledTimes(1)
  fetch.mockResolvedValue(response([]))
  await expect(fetchMusicPlaylist(custom)).rejects.toThrow('歌单为空')
})

test('request timeout aborts loading instead of leaving it pending', async () => {
  jest.useFakeTimers()
  fetch.mockImplementation(
    (_, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        )
      })
  )
  const request = fetchMusicPlaylist({
    ...options,
    api: 'https://example.com/music'
  })
  const assertion = expect(request).rejects.toThrow('响应超时')
  await jest.advanceTimersByTimeAsync(10000)
  await assertion
  jest.useRealTimers()
})

test('unmount cancellation does not start a backup request', async () => {
  const controller = new AbortController()
  fetch.mockImplementation(
    (_, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        )
      })
  )
  const request = fetchMusicPlaylist({ ...options, signal: controller.signal })
  const assertion = expect(request).rejects.toThrow('Aborted')
  controller.abort()
  await assertion
  expect(fetch).toHaveBeenCalledTimes(1)
})
