'use client'

import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useEffect, useRef, useState } from 'react'
import CONFIG from '../config'
import { DEFAULT_METING_API, fetchMusicPlaylist, musicEnabled, normalizeMusicPlaylist } from '../utils/musicPlaylist'

/**
 * Mizuki-style Sidebar Card Music Player for Fuwari Theme
 */
const MusicPlayer = () => {
  const { locale } = useGlobal()
  const musicPlayerEnable = musicEnabled(siteConfig('MUSIC_PLAYER', true, CONFIG))
  const metingApi = siteConfig('MUSIC_PLAYER_METING_API', DEFAULT_METING_API)
  const metingId = siteConfig('MUSIC_PLAYER_METING_ID', '6686195786')
  const metingServer = siteConfig('MUSIC_PLAYER_METING_SERVER', 'netease')
  const autoPlay = musicEnabled(siteConfig('MUSIC_PLAYER_AUTO_PLAY', false, CONFIG))
  const musicMetingEnable = musicEnabled(siteConfig('MUSIC_PLAYER_METING', false, CONFIG))

  const [playlist, setPlaylist] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSong, setCurrentSong] = useState({
    title: 'Loading...',
    artist: 'Loading...',
    cover: '/favicon.ico',
    url: '',
    duration: 0
  })

  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [isRepeating, setIsRepeating] = useState(0) // 0: no repeat, 1: single, 2: list
  const [errorMessage, setErrorMessage] = useState('')
  const [showError, setShowError] = useState(false)
  const [autoplayFailed, setAutoplayFailed] = useState(false)
  const [isVolumeDragging, setIsVolumeDragging] = useState(false)
  const [playlistError, setPlaylistError] = useState('')
  const [sourceNotice, setSourceNotice] = useState('')

  const audioRef = useRef(null)
  const requestRef = useRef(null)
  const loadTimerRef = useRef(null)
  const errorTimerRef = useRef(null)
  const failedSongsRef = useRef(new Set())
  const selectionRef = useRef(0)
  const progressBarRef = useRef(null)
  const volumeBarRef = useRef(null)
  const isMouseDownRef = useRef(false)
  const volumeBarRectRef = useRef(null)

  const stateRef = useRef({
    isPlaying,
    isRepeating,
    isShuffled,
    playlist,
    currentIndex,
    volume,
    isMuted
  })

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      isRepeating,
      isShuffled,
      playlist,
      currentIndex,
      volume,
      isMuted
    }
  }, [isPlaying, isRepeating, isShuffled, playlist, currentIndex, volume, isMuted])

  const showErrorMessage = (message) => {
    clearTimeout(errorTimerRef.current)
    setErrorMessage(message)
    setShowError(true)
    errorTimerRef.current = setTimeout(() => {
      setShowError(false)
    }, 3000)
  }

  const hideError = () => {
    setShowError(false)
  }

  const getAssetPath = (path) => {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    if (path.startsWith('/')) return path
    return `/${path}`
  }

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleLoadSuccess = () => {
    clearTimeout(loadTimerRef.current)
    failedSongsRef.current.clear()
    setIsLoading(false)
    const audio = audioRef.current
    if (audio && audio.duration && audio.duration > 1) {
      const dur = Math.floor(audio.duration)
      setDuration(dur)
      
      const currentIdx = stateRef.current.currentIndex
      setPlaylist(prev => {
        const copy = [...prev]
        if (copy[currentIdx]) {
          copy[currentIdx] = { ...copy[currentIdx], duration: dur }
        }
        return copy
      })
      setCurrentSong(prev => ({ ...prev, duration: dur }))
    }

    if (stateRef.current.isPlaying) {
      audio.play().catch((err) => {
        console.warn('Playback blocked by browser policy:', err)
        setIsPlaying(false)
        setAutoplayFailed(true)
      })
    }
  }

  const handleLoadError = () => {
    clearTimeout(loadTimerRef.current)
    setIsLoading(false)
    setIsPlaying(false)
    const { playlist, currentIndex, isShuffled } = stateRef.current
    if (playlist[currentIndex]) {
      showErrorMessage(`无法播放 "${playlist[currentIndex].title}"，正在尝试下一首...`)
    }
    failedSongsRef.current.add(currentIndex)
    if (playlist.length > 1 && failedSongsRef.current.size < Math.min(playlist.length, 3)) {
      const candidates = playlist.map((_, index) => index).filter(index => !failedSongsRef.current.has(index))
      const nextIndex = candidates[isShuffled ? Math.floor(Math.random() * candidates.length) : 0]
      playSongByIndex(nextIndex)
    } else {
      audioRef.current?.pause()
      setPlaylistError('音频源无法播放或响应超时，请重试或检查歌曲链接。')
      showErrorMessage('播放列表中没有可用的歌曲')
    }
  }

  const loadSong = (song) => {
    const audio = audioRef.current
    if (!song || !audio) return
    selectionRef.current += 1
    setCurrentSong(song)
    if (song.url) {
      setIsLoading(true)
      setPlaylistError('')
      audio.currentTime = 0
      setCurrentTime(0)
      setDuration(song.duration ?? 0)

      clearTimeout(loadTimerRef.current)
      loadTimerRef.current = setTimeout(handleLoadError, 20000)
      audio.src = getAssetPath(song.url)
      audio.load()
    } else {
      setIsLoading(false)
    }
  }

  const playSongByIndex = (index) => {
    const list = stateRef.current.playlist
    if (index < 0 || index >= list.length) return
    setCurrentIndex(index)
    const song = list[index]
    loadSong(song)
    const audio = audioRef.current
    const selection = selectionRef.current
    audio.play().then(() => {
      if (audioRef.current === audio && selectionRef.current === selection) setIsPlaying(true)
    }).catch((err) => {
      if (audioRef.current !== audio || selectionRef.current !== selection) return
      console.warn('Playback blocked:', err)
      setIsPlaying(false)
      setAutoplayFailed(true)
    })
  }

  const playNextSong = (list, index, shuffle) => {
    if (list.length <= 1) return
    let newIndex
    if (shuffle) {
      do {
        newIndex = Math.floor(Math.random() * list.length)
      } while (newIndex === index && list.length > 1)
    } else {
      newIndex = index < list.length - 1 ? index + 1 : 0
    }
    playSongByIndex(newIndex)
  }

  const playPreviousSong = () => {
    const { playlist, currentIndex } = stateRef.current
    if (playlist.length <= 1) return
    const newIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1
    playSongByIndex(newIndex)
  }

  const fetchMetingPlaylist = async () => {
    requestRef.current?.abort()
    clearTimeout(loadTimerRef.current)
    audioRef.current?.pause()
    const request = new AbortController()
    requestRef.current = request
    setPlaylistError('')
    setSourceNotice('')
    setIsLoading(true)
    try {
      if (!metingApi || !metingId) throw new Error('请配置音乐接口地址和歌单 ID')
      const { songs: formatted, backup } = await fetchMusicPlaylist({
        api: metingApi, server: metingServer, id: metingId, signal: request.signal
      })
      if (request.signal.aborted) return
      if (backup) setSourceNotice('默认音乐接口不可用，已通过备用接口加载同一歌单。')
      if (formatted.length > 0) {
        setPlaylist(formatted)
        setCurrentIndex(0)
        failedSongsRef.current.clear()
        loadSong(formatted[0])
        const audio = audioRef.current
        if (audio) {
          if (autoPlay) {
            audio.play().then(() => {
              setIsPlaying(true)
            }).catch(err => {
              console.warn('Autoplay failed:', err)
              setIsPlaying(false)
              setAutoplayFailed(true)
            })
          }
        }
      }
    } catch (e) {
      if (request.signal.aborted) return
      console.error(e)
      setPlaylist([])
      setIsPlaying(false)
      setCurrentSong({ title: '歌单加载失败', artist: '请检查音乐接口或重试', url: '', cover: '/favicon.ico' })
      setPlaylistError(e.message || 'Meting 歌单获取失败')
    } finally {
      if (!request.signal.aborted) setIsLoading(false)
    }
  }

  const loadLocalPlaylist = () => {
    let localList = []
    try {
      const configAudio = siteConfig('MUSIC_PLAYER_AUDIO_LIST')
      if (Array.isArray(configAudio)) {
        localList = configAudio
      } else if (typeof configAudio === 'string') {
        localList = JSON.parse(configAudio)
      }
    } catch (e) {
      console.error('Failed to parse MUSIC_PLAYER_AUDIO_LIST', e)
    }
    const formatted = normalizeMusicPlaylist(Array.isArray(localList) ? localList : [])
    if (formatted.length > 0) {
      setPlaylist(formatted)
      setCurrentIndex(0)
      failedSongsRef.current.clear()
      loadSong(formatted[0])
      
      const audio = audioRef.current
      if (audio) {
        if (autoPlay) {
          audio.play().then(() => {
            setIsPlaying(true)
          }).catch(err => {
            console.warn('Autoplay failed:', err)
            setIsPlaying(false)
            setAutoplayFailed(true)
          })
        }
      }
    } else {
      setPlaylist([])
      setCurrentSong({ title: '未配置歌曲', artist: '请配置音乐列表', url: '', cover: '/favicon.ico' })
      setCurrentIndex(0)
      setIsLoading(false)
      setPlaylistError('音乐列表为空，请配置 MUSIC_PLAYER_AUDIO_LIST 或启用 Meting 歌单。')
    }
  }

  useEffect(() => {
    if (!musicPlayerEnable) return

    const audio = new Audio()
    setPlaylistError('')
    setSourceNotice('')
    audio.volume = volume
    audioRef.current = audio

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      const { isRepeating, isShuffled, playlist, currentIndex } = stateRef.current
      if (isRepeating === 1) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else if (isRepeating === 2 || isShuffled) {
        playNextSong(playlist, currentIndex, isShuffled)
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadeddata', handleLoadSuccess)
    audio.addEventListener('error', handleLoadError)
    audio.addEventListener('ended', onEnded)

    if (musicMetingEnable) {
      fetchMetingPlaylist()
    } else {
      loadLocalPlaylist()
    }

    return () => {
      selectionRef.current += 1
      requestRef.current?.abort()
      clearTimeout(loadTimerRef.current)
      clearTimeout(errorTimerRef.current)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadeddata', handleLoadSuccess)
      audio.removeEventListener('error', handleLoadError)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [musicPlayerEnable, musicMetingEnable, metingApi, metingId, metingServer, autoPlay])

  const handleUserInteraction = () => {
    if (autoplayFailed && audioRef.current && stateRef.current.isPlaying) {
      audioRef.current.play().then(() => {
        setAutoplayFailed(false)
      }).catch(() => {})
    }
  }

  useEffect(() => {
    const interactionEvents = ['click', 'keydown', 'touchstart']
    const handler = () => handleUserInteraction()
    interactionEvents.forEach(event => {
      document.addEventListener(event, handler, { capture: true })
    })
    return () => {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handler, { capture: true })
      })
    }
  }, [autoplayFailed])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !currentSong?.url) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => {
        setIsPlaying(true)
      }).catch((err) => {
        console.warn('Playback blocked:', err)
        setIsPlaying(false)
        setAutoplayFailed(true)
        showErrorMessage('播放失败，请检查音频链接后重试。')
      })
    }
  }

  const togglePlaylist = () => {
    setShowPlaylist(prev => !prev)
  }

  const toggleShuffle = () => {
    const newShuffle = !isShuffled
    setIsShuffled(newShuffle)
    if (newShuffle) {
      setIsRepeating(0)
    }
  }

  const toggleRepeat = () => {
    const newRepeat = (isRepeating + 1) % 3
    setIsRepeating(newRepeat)
    if (newRepeat !== 0) {
      setIsShuffled(false)
    }
  }

  const updateVolumeLogic = (clientX) => {
    const audio = audioRef.current
    const volumeBar = volumeBarRef.current
    if (!audio || !volumeBar) return

    const rect = volumeBarRectRef.current || volumeBar.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))

    setVolume(percent)
    audio.volume = percent
    setIsMuted(percent === 0)
  }

  const startVolumeDrag = (event) => {
    const volumeBar = volumeBarRef.current
    if (!volumeBar) return
    isMouseDownRef.current = true
    setIsVolumeDragging(true)
    volumeBarRectRef.current = volumeBar.getBoundingClientRect()
    updateVolumeLogic(event.clientX)
  }

  useEffect(() => {
    const handleVolumeMove = (event) => {
      if (!isMouseDownRef.current) return
      updateVolumeLogic(event.clientX)
    }

    const stopVolumeDrag = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false
        setIsVolumeDragging(false)
        volumeBarRectRef.current = null
      }
    }

    window.addEventListener('mousemove', handleVolumeMove)
    window.addEventListener('mouseup', stopVolumeDrag)
    return () => {
      window.removeEventListener('mousemove', handleVolumeMove)
      window.removeEventListener('mouseup', stopVolumeDrag)
    }
  }, [])

  const setProgress = (event) => {
    const audio = audioRef.current
    const progressBar = progressBarRef.current
    if (!audio || !progressBar || !duration) return
    const rect = progressBar.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const newTime = percent * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    const newMuted = !isMuted
    setIsMuted(newMuted)
    audio.muted = newMuted
  }

  if (!musicPlayerEnable) return null

  const isZh = siteConfig('LANG', 'zh-CN') === 'zh-CN'
  const playlistLabel = locale?.COMMON?.PLAYLIST || (isZh ? '播放列表' : 'Playlist')

  return (
    <>
      {showError && (
        <div className='fixed bottom-20 right-4 z-[99] max-w-sm'>
          <div className='bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up'>
            <i className='fas fa-exclamation-circle text-lg shrink-0' />
            <span className='text-sm flex-1'>{errorMessage}</span>
            <button onClick={hideError} className='text-white/80 hover:text-white transition-colors'>
              <i className='fas fa-times text-md' />
            </button>
          </div>
        </div>
      )}

      <section className="fuwari-card p-4 flex flex-col gap-3 min-w-0 w-full select-none">
        {sourceNotice && <p role='status' className='text-xs text-[var(--fuwari-muted)]'>{sourceNotice}</p>}
        {playlistError && (
          <div role='alert' className='text-xs text-red-600 dark:text-red-400'>
            <p>{playlistError}</p>
            <button type='button' className='mt-1 underline' onClick={() => {
              failedSongsRef.current.clear()
              if (musicMetingEnable) void fetchMetingPlaylist()
              else loadLocalPlaylist()
            }}>重试加载音乐</button>
          </div>
        )}
        {/* Upper part: Cover & Meta Info */}
        <div className="flex items-center gap-3">
          {/* Cover Art (rotates when playing) */}
          <div
            onClick={togglePlay}
            className="cover-container relative w-16 h-16 rounded-full overflow-hidden cursor-pointer shrink-0 border border-[var(--fuwari-border)]/50"
            role="button"
            tabIndex={0}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            <img
              src={getAssetPath(currentSong.cover)}
              alt="封面"
              className={`w-full h-full object-cover transition-transform duration-300 ${isPlaying && !isLoading ? 'spinning' : ''} ${isLoading ? 'animate-pulse' : ''}`}
            />
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              {isLoading ? (
                <i className="fas fa-spinner fa-spin text-white text-md" />
              ) : isPlaying ? (
                <i className="fas fa-pause text-white text-md" />
              ) : (
                <i className="fas fa-play text-white text-md ml-0.5" />
              )}
            </div>
          </div>

          {/* Title & Artist */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-[var(--fuwari-text)] truncate">{currentSong.title}</div>
            <div className="text-xs text-[var(--fuwari-muted)] truncate">{currentSong.artist}</div>
            <div className="text-[10px] text-[var(--fuwari-muted)] opacity-80 mt-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-section my-0.5">
          <div
            ref={progressBarRef}
            onClick={setProgress}
            className="progress-bar w-full h-1.5 bg-[var(--fuwari-bg-soft)] rounded-full cursor-pointer relative hover:h-2 transition-all"
            role="slider"
            tabIndex={0}
            aria-label="播放进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={duration > 0 ? Math.floor((currentTime / duration) * 100) : 0}
          >
            <div
              className="h-full bg-[var(--fuwari-primary)] rounded-full transition-all duration-100"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="controls flex items-center justify-between gap-1 px-1">
          <button
            onClick={toggleShuffle}
            disabled={playlist.length <= 1}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isShuffled ? 'text-[var(--fuwari-primary)] bg-[var(--fuwari-primary-soft)]/20' : 'text-[var(--fuwari-text)] opacity-70 hover:opacity-100 hover:bg-[var(--fuwari-bg-soft)]'
            }`}
            title="随机播放"
          >
            <i className="fas fa-random text-xs" />
          </button>

          <button
            onClick={playPreviousSong}
            disabled={playlist.length <= 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--fuwari-text)] opacity-70 hover:opacity-100 hover:bg-[var(--fuwari-bg-soft)] transition-colors disabled:opacity-30"
            title="上一首"
          >
            <i className="fas fa-backward text-xs" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading || !currentSong.url}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--fuwari-primary)] text-white hover:scale-105 active:scale-95 transition-all shadow-md shadow-[var(--fuwari-primary-soft)]"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isLoading ? (
              <i className="fas fa-spinner fa-spin text-xs" />
            ) : isPlaying ? (
              <i className="fas fa-pause text-xs" />
            ) : (
              <i className="fas fa-play text-xs ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              const { playlist, currentIndex, isShuffled } = stateRef.current
              playNextSong(playlist, currentIndex, isShuffled)
            }}
            disabled={playlist.length <= 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--fuwari-text)] opacity-70 hover:opacity-100 hover:bg-[var(--fuwari-bg-soft)] transition-colors disabled:opacity-30"
            title="下一首"
          >
            <i className="fas fa-forward text-xs" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isRepeating > 0 ? 'text-[var(--fuwari-primary)] bg-[var(--fuwari-primary-soft)]/20' : 'text-[var(--fuwari-text)] opacity-70 hover:opacity-100 hover:bg-[var(--fuwari-bg-soft)]'
            }`}
            title={isRepeating === 1 ? '单曲循环' : isRepeating === 2 ? '列表循环' : '无循环'}
          >
            {isRepeating === 1 ? (
              <div className="relative flex items-center justify-center">
                <i className="fas fa-redo text-xs" />
                <span className="absolute text-[7px] font-bold mt-[-2px]" style={{ color: 'inherit' }}>1</span>
              </div>
            ) : (
              <i className={`fas fa-redo text-xs ${isRepeating === 0 ? 'opacity-40' : ''}`} />
            )}
          </button>
        </div>

        {/* Volume & Playlist Panel Trigger */}
        <div className="bottom-bar flex items-center justify-between gap-2 mt-1">
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--fuwari-text)] opacity-70 hover:opacity-100 hover:bg-[var(--fuwari-bg-soft)] transition-colors shrink-0"
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted || volume === 0 ? (
              <i className="fas fa-volume-mute text-xs" />
            ) : volume < 0.5 ? (
              <i className="fas fa-volume-down text-xs" />
            ) : (
              <i className="fas fa-volume-up text-xs" />
            )}
          </button>

          {/* Volume Slider */}
          <div
            ref={volumeBarRef}
            onMouseDown={startVolumeDrag}
            className="flex-1 h-1.5 bg-[var(--fuwari-bg-soft)] hover:h-2 rounded-full cursor-pointer relative transition-all"
            role="slider"
            tabIndex={0}
            aria-label="音量控制"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(volume * 100)}
          >
            <div
              className="h-full bg-[var(--fuwari-primary)] rounded-full"
              style={{
                width: `${volume * 100}%`,
                transition: isVolumeDragging ? 'none' : 'width 100ms'
              }}
            />
          </div>

          <button
            onClick={togglePlaylist}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              showPlaylist ? 'text-[var(--fuwari-primary)] bg-[var(--fuwari-primary-soft)]/20' : 'text-[var(--fuwari-text)] opacity-70 hover:opacity-100 hover:bg-[var(--fuwari-bg-soft)]'
            }`}
            title="播放列表"
          >
            <i className="fas fa-list text-xs" />
          </button>
        </div>

        {/* Inline Playlist Panel */}
        <div
          className={`playlist-panel border-t border-[var(--fuwari-border)]/50 mt-2 transition-all duration-300 ease-in-out origin-top overflow-hidden ${
            showPlaylist ? 'opacity-100 max-h-60 py-2' : 'opacity-0 max-h-0 pointer-events-none'
          }`}
        >
          <div className="playlist-header flex items-center justify-between pb-2 mb-2 border-b border-[var(--fuwari-border)]/30">
            <span className="text-xs font-semibold text-[var(--fuwari-text)]">{playlistLabel}</span>
            <span className="text-[10px] text-[var(--fuwari-muted)]">{playlist.length} 首歌曲</span>
          </div>
          
          {/* Playlist Content List */}
          <div className="playlist-content overflow-y-auto max-h-[160px] divide-y divide-[var(--fuwari-border)]/20 pr-1 select-text">
            {playlist.map((song, index) => {
              const isCurrent = index === currentIndex
              return (
                <div
                  key={song.id}
                  onClick={() => playSongByIndex(index)}
                  className={`playlist-item flex items-center gap-2 py-2 px-1 hover:bg-[var(--fuwari-bg-soft)] cursor-pointer transition-colors rounded-lg ${
                    isCurrent ? 'bg-[var(--fuwari-primary-soft)]/10' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`播放 ${song.title} - ${song.artist}`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {isCurrent && isPlaying ? (
                      <i className="fas fa-volume-up text-[var(--fuwari-primary)] text-xs animate-pulse" />
                    ) : isCurrent ? (
                      <i className="fas fa-pause text-[var(--fuwari-primary)] text-xs" />
                    ) : (
                      <span className="text-[10px] text-[var(--fuwari-muted)]">{index + 1}</span>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded bg-[var(--fuwari-bg-soft)] shrink-0 overflow-hidden">
                    <img src={getAssetPath(song.cover)} alt={song.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-xs truncate ${isCurrent ? 'text-[var(--fuwari-primary)]' : 'text-[var(--fuwari-text)]'}`}>
                      {song.title}
                    </div>
                    <div className={`text-[10px] truncate ${isCurrent ? 'text-[var(--fuwari-primary)] opacity-80' : 'text-[var(--fuwari-muted)]'}`}>
                      {song.artist}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .cover-container img {
          animation: spin-continuous 6s linear infinite;
          animation-play-state: paused;
        }
        .cover-container img.spinning {
          animation-play-state: running;
        }
        @keyframes spin-continuous {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .playlist-content::-webkit-scrollbar {
          width: 4px;
        }
        .playlist-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .playlist-content::-webkit-scrollbar-thumb {
          background: var(--fuwari-border);
          border-radius: 4px;
        }
        .playlist-content::-webkit-scrollbar-thumb:hover {
          background: var(--fuwari-primary);
        }
      `}</style>
    </>
  )
}

export default MusicPlayer
