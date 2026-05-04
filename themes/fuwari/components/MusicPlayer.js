import { siteConfig } from '@/lib/config'
import { loadExternalResource } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import CONFIG from '../config'

/**
 * 嵌入式音乐播放器 - 适配 Fuwari 侧栏
 */
const MusicPlayer = () => {
  const ref = useRef(null)
  const lrcType = JSON.parse(siteConfig('MUSIC_PLAYER_LRC_TYPE'))
  const autoPlay = JSON.parse(siteConfig('MUSIC_PLAYER_AUTO_PLAY'))
  const meting = JSON.parse(siteConfig('MUSIC_PLAYER_METING'))
  const order = siteConfig('MUSIC_PLAYER_ORDER')
  const audio = siteConfig('MUSIC_PLAYER_AUDIO_LIST')

  const musicPlayerEnable = siteConfig('MUSIC_PLAYER')
  const musicPlayerCDN = siteConfig('MUSIC_PLAYER_CDN_URL')
  const musicMetingEnable = siteConfig('MUSIC_PLAYER_METING')
  const musicMetingCDNUrl = siteConfig(
    'MUSIC_PLAYER_METING_CDN_URL',
    'https://cdnjs.cloudflare.com/ajax/libs/meting/2.0.1/Meting.min.js'
  )

  const initMusicPlayer = async () => {
    if (!musicPlayerEnable) {
      return
    }
    try {
      await loadExternalResource(musicPlayerCDN, 'css')
      await loadExternalResource(musicPlayerCDN, 'js')
    } catch (error) {
      console.error('音乐组件异常', error)
    }

    if (musicMetingEnable) {
      await loadExternalResource(musicMetingCDNUrl, 'js')
    }

    if (!meting && window.APlayer && ref.current) {
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
    }
  }

  useEffect(() => {
    initMusicPlayer()
  }, [])

  if (!musicPlayerEnable) return null

  return (
    <section className='fuwari-card p-0 overflow-hidden'>
      {meting ? (
        <meting-js
          fixed='false' // 关键：非固定模式
          type='playlist'
          preload='auto'
          api={siteConfig(
            'MUSIC_PLAYER_METING_API',
            'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r'
          )}
          autoplay={autoPlay}
          order={siteConfig('MUSIC_PLAYER_ORDER')}
          server={siteConfig('MUSIC_PLAYER_METING_SERVER')}
          id={siteConfig('MUSIC_PLAYER_METING_ID')}
        />
      ) : (
        <div ref={ref} className='aplayer-embedded' />
      )}
      <style jsx global>{`
        .fuwari-card .aplayer {
          margin: 0;
          box-shadow: none;
          background: transparent;
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
