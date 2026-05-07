'use client'

import { siteConfig } from '@/lib/config'
import { loadExternalResource } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

/**
 * 嵌入式音乐播放器 - 适配 Fuwari 侧栏
 */
const MusicPlayer = () => {
  const ref = useRef(null)
  const [mounted, setMounted] = useState(false)
  const [playerLoaded, setPlayerLoaded] = useState(false)

  // 读取配置
  const musicPlayerEnable = siteConfig('MUSIC_PLAYER')
  const musicPlayerCDN = siteConfig('MUSIC_PLAYER_CDN_URL')
  const musicMetingEnable = siteConfig('MUSIC_PLAYER_METING')
  const musicMetingCDNUrl = siteConfig(
    'MUSIC_PLAYER_METING_CDN_URL',
    'https://cdnjs.cloudflare.com/ajax/libs/meting/2.0.1/Meting.min.js'
  )

  useEffect(() => {
    setMounted(true)
    const initMusicPlayer = async () => {
      if (!musicPlayerEnable) return

      // 修正：musicPlayerCDN 可能是 JS 链接，APlayer 还需要 CSS
      const musicPlayerCssCDN = musicPlayerCDN?.includes('.js')
        ? musicPlayerCDN.replace(/\.js$/, '.css')
        : 'https://cdn.jsdelivr.net/npm/aplayer@1.10.0/dist/APlayer.min.css'

      try {
        await loadExternalResource(musicPlayerCssCDN, 'css')
        await loadExternalResource(musicPlayerCDN, 'js')
        if (musicMetingEnable) {
          await loadExternalResource(musicMetingCDNUrl, 'js')
        }
        setPlayerLoaded(true)
      } catch (error) {
        console.error('音乐组件加载失败', error)
      }
    }
    initMusicPlayer()
  }, [musicPlayerEnable, musicPlayerCDN, musicMetingEnable, musicMetingCDNUrl])

  useEffect(() => {
    // 非 Meting 模式下的 APlayer 初始化
    if (mounted && playerLoaded && !musicMetingEnable && window.APlayer && ref.current) {
      const lrcType = siteConfig('MUSIC_PLAYER_LRC_TYPE')
      const autoPlay = siteConfig('MUSIC_PLAYER_AUTO_PLAY')
      const order = siteConfig('MUSIC_PLAYER_ORDER')
      const audio = siteConfig('MUSIC_PLAYER_AUDIO_LIST')

      try {
        // eslint-disable-next-line no-new
        new window.APlayer({
          container: ref.current,
          fixed: false, // 关键：非固定模式
          lrcType: lrcType,
          autoplay: autoPlay,
          order: order,
          audio: audio,
          mini: false,
          listMaxHeight: '120px'
        })
      } catch (e) {
        console.error('APlayer 初始化失败', e)
      }
    }
  }, [mounted, playerLoaded, musicMetingEnable])

  if (!mounted || !musicPlayerEnable) return null

  return (
    <section className='fuwari-card p-0 overflow-hidden min-h-[100px] flex items-center justify-center'>
      {!playerLoaded && (
         <div className="animate-pulse text-[var(--fuwari-muted)] text-xs">Loading Player...</div>
      )}
      {playerLoaded && (
        <>
          {musicMetingEnable ? (
            <meting-js
              fixed='false' // 关键：非固定模式
              type='playlist'
              preload='auto'
              api={siteConfig(
                'MUSIC_PLAYER_METING_API',
                'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r'
              )}
              autoplay={siteConfig('MUSIC_PLAYER_AUTO_PLAY')}
              order={siteConfig('MUSIC_PLAYER_ORDER')}
              server={siteConfig('MUSIC_PLAYER_METING_SERVER')}
              id={siteConfig('MUSIC_PLAYER_METING_ID')}
            />
          ) : (
            <div ref={ref} className='aplayer-embedded w-full' />
          )}
        </>
      )}
      <style jsx global>{`
        .fuwari-card .aplayer {
          margin: 0;
          box-shadow: none;
          background: transparent;
          width: 100%;
        }
        .fuwari-card .aplayer .aplayer-list {
           background: var(--fuwari-bg-soft);
        }
        .dark .fuwari-card .aplayer {
          color: #eee;
        }
        .dark .fuwari-card .aplayer .aplayer-list ol li:hover {
          background: rgba(255,255,255,0.1);
        }
        .dark .fuwari-card .aplayer .aplayer-list ol li.aplayer-list-light {
          background: rgba(255,255,255,0.2);
        }
        .dark .fuwari-card .aplayer .aplayer-info .aplayer-music .aplayer-title {
           color: #fff;
        }
        .fuwari-card .aplayer .aplayer-info {
          padding: 14px 7px 10px 10px;
        }
      `}</style>
    </section>
  )
}

export default MusicPlayer
