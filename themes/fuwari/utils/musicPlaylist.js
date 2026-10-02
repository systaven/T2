export const DEFAULT_METING_API =
  'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r'
export const BACKUP_METING_API =
  'https://api.injahow.cn/meting/?server=:server&type=:type&id=:id'

export const musicEnabled = value => value === true || value === 'true'

export function normalizeMusicPlaylist(value) {
  if (!Array.isArray(value)) throw new Error('歌单接口没有返回歌曲列表')
  return value
    .filter(
      song =>
        song &&
        typeof song === 'object' &&
        typeof song.url === 'string' &&
        song.url.trim()
    )
    .map((song, index) => {
      const duration = Number(song.duration)
      return {
        id: song.id ?? index,
        title: String(song.name || song.title || '未知歌曲'),
        artist: Array.isArray(song.artist)
          ? song.artist.join(' / ')
          : String(song.artist || song.author || '未知艺术家'),
        cover: song.pic || song.cover || '/favicon.ico',
        url: song.url.trim(),
        duration:
          Number.isFinite(duration) && duration > 0
            ? duration > 10000
              ? Math.floor(duration / 1000)
              : duration
            : 0
      }
    })
}

export async function fetchMusicPlaylist({ api, server, id, signal }) {
  const templates = [api]
  // Do not send custom API credentials or change a user's explicitly chosen
  // service. The backup is only for the old built-in public endpoint.
  try {
    new URL(api)
    if (api === DEFAULT_METING_API) templates.push(BACKUP_METING_API)
  } catch {
    throw new Error('音乐接口地址无效')
  }
  let failure
  for (const template of templates) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const controller = new AbortController()
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, 10000)
    try {
      const params = { server, type: 'playlist', id, auth: '', r: Date.now() }
      const url = template.replace(/:(server|type|id|auth|r)\b/g, (_, key) =>
        encodeURIComponent(params[key])
      )
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`歌单接口返回 HTTP ${response.status}`)
      const songs = normalizeMusicPlaylist(await response.json())
      if (!songs.length) throw new Error('歌单为空或没有可播放的歌曲')
      return { songs, backup: template !== api }
    } catch (error) {
      if (signal?.aborted) throw error
      failure = controller.signal.aborted
        ? new Error('歌单接口响应超时')
        : error
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    }
  }
  throw failure
}
