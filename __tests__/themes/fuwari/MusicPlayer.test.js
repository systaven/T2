import { act, fireEvent, render, screen } from '@testing-library/react'
import MusicPlayer from '@/themes/fuwari/components/MusicPlayer'
import { siteConfig } from '@/lib/config'

jest.mock('@/lib/config', () => ({ siteConfig: jest.fn() }))
jest.mock('@/lib/global', () => ({ useGlobal: () => ({ locale: {} }) }))
// These tests exercise playback state, not styled-jsx's DOM stylesheet registry.
jest.mock('styled-jsx/style', () => () => null)

let audio
let config
beforeEach(() => {
  config = {
    MUSIC_PLAYER: true,
    MUSIC_PLAYER_METING: true,
    MUSIC_PLAYER_METING_API: 'https://example.com/meting?id=:id'
  }
  siteConfig.mockImplementation((key, fallback) => config[key] ?? fallback)
  global.fetch = jest.fn()
  global.Audio = jest.fn(() => {
    audio = new EventTarget()
    Object.assign(audio, {
      pause: jest.fn(),
      play: jest.fn().mockResolvedValue(),
      load: jest.fn(),
      currentTime: 0,
      duration: 180,
      readyState: 4
    })
    return audio
  })
})

test('API failure shows a persistent error and retry loads the configured song', async () => {
  fetch.mockResolvedValue({ ok: false, status: 403 })
  const view = render(<MusicPlayer />)
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 403')
  expect(screen.getByTitle('播放')).toBeDisabled()
  fetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([
      {
        name: '配置的歌曲',
        artist: '原作者',
        url: 'https://example.com/song.mp3'
      }
    ])
  })
  fireEvent.click(screen.getByRole('button', { name: '重试加载音乐' }))
  await screen.findAllByText('配置的歌曲')
  act(() => audio.dispatchEvent(new Event('loadeddata')))
  expect(screen.getByText('0:00 / 3:00')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  view.unmount()
})

test('string false selects local audio without calling Meting or inserting unrelated demo songs', () => {
  config.MUSIC_PLAYER_METING = 'false'
  config.MUSIC_PLAYER_AUDIO_LIST = []
  const view = render(<MusicPlayer />)
  expect(fetch).not.toHaveBeenCalled()
  expect(screen.getByText('未配置歌曲')).toBeInTheDocument()
  expect(screen.getByTitle('播放')).toBeDisabled()
  view.unmount()
})

test('initial local audio has metadata listeners and all failed tracks stop rather than loop forever', () => {
  jest.useFakeTimers()
  config.MUSIC_PLAYER_METING = false
  config.MUSIC_PLAYER_AUDIO_LIST = [{ name: '本地音乐', url: '/music.mp3' }]
  const view = render(<MusicPlayer />)
  expect(screen.getByTitle('播放')).toBeDisabled()
  act(() => audio.dispatchEvent(new Event('loadeddata')))
  expect(screen.getByTitle('播放')).not.toBeDisabled()
  act(() => audio.dispatchEvent(new Event('error')))
  expect(screen.getByRole('alert')).toHaveTextContent('音频源无法播放')
  view.unmount()
  expect(audio.pause).toHaveBeenCalled()
  jest.useRealTimers()
})
