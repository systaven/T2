import { siteConfig } from '@/lib/config'
import { useEffect, useRef, useState } from 'react'
import CONFIG from '../config'

/**
 * 横幅模式切换按钮 - 适配 Fuwari 主题
 * 支持 Banner, Fullscreen, 和 None 三种模式
 */
const WallpaperSwitch = () => {
  const [heroStyle, setHeroStyle] = useState('banner')
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const panelRef = useRef(null)

  // 从 localStorage 加载配置
  useEffect(() => {
    const savedStyle = localStorage.getItem('FUWARI_HERO_STYLE') || siteConfig('FUWARI_HERO_STYLE', 'banner', CONFIG)
    setHeroStyle(savedStyle)
    // 延迟一会确保 DOM 已加载
    setTimeout(() => {
      updateBodyClass(savedStyle)
    }, 100)
  }, [])

  // 监听点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateBodyClass = (style) => {
    const themeElement = document.getElementById('theme-fuwari')
    if (themeElement) {
      if (style === 'fullscreen') {
        themeElement.classList.add('fuwari-fullscreen-layout')
      } else {
        themeElement.classList.remove('fuwari-fullscreen-layout')
      }
    }
    
    // 发送事件通知 index.js 更新 LayoutBase 的状态
    window.dispatchEvent(new CustomEvent('fuwari-hero-style-change', { detail: style }))
  }

  const switchMode = (style) => {
    setHeroStyle(style)
    localStorage.setItem('FUWARI_HERO_STYLE', style)
    updateBodyClass(style)
    setIsPanelOpen(false)
  }

  const mainIcon = () => {
    switch (heroStyle) {
      case 'fullscreen':
        return <i className='fas fa-expand-arrows-alt' />
      case 'none':
        return <i className='fas fa-image-slash' />
      default:
        return <i className='fas fa-image' />
    }
  }

  return (
    <div className='relative' ref={panelRef}>
      <button
        type='button'
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className='fuwari-tool-btn'
        title='Switch Hero Mode'
      >
        {mainIcon()}
      </button>

      {isPanelOpen && (
        <div className='fuwari-card absolute right-0 top-12 p-2 w-40 z-50 animate-fuwari-enter'>
          <button
            onClick={() => switchMode('banner')}
            className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors ${heroStyle === 'banner' ? 'bg-[var(--fuwari-primary)] text-white' : 'hover:bg-[var(--fuwari-bg-soft)]'}`}
          >
            <i className='fas fa-image mr-3 w-4 text-center' />
            Banner
          </button>
          <button
            onClick={() => switchMode('fullscreen')}
            className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors ${heroStyle === 'fullscreen' ? 'bg-[var(--fuwari-primary)] text-white' : 'hover:bg-[var(--fuwari-bg-soft)]'}`}
          >
            <i className='fas fa-expand-arrows-alt mr-3 w-4 text-center' />
            Fullscreen
          </button>
          <button
            onClick={() => switchMode('none')}
            className={`flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors ${heroStyle === 'none' ? 'bg-[var(--fuwari-primary)] text-white' : 'hover:bg-[var(--fuwari-bg-soft)]'}`}
          >
            <i className='fas fa-image-slash mr-3 w-4 text-center' />
            None
          </button>
        </div>
      )}
    </div>
  )
}

export default WallpaperSwitch
