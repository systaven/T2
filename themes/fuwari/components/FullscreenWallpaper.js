import { siteConfig } from '@/lib/config'
import { useEffect, useState } from 'react'
import CONFIG from '../config'

/**
 * 全屏壁纸组件 - 适配 Fuwari 主题
 * 模仿 Mizuki 风格
 */
const FullscreenWallpaper = (props) => {
  const { siteInfo } = props
  const [heroStyle, setHeroStyle] = useState(siteConfig('FUWARI_HERO_STYLE', 'banner', CONFIG))

  useEffect(() => {
    const savedStyle = localStorage.getItem('FUWARI_HERO_STYLE')
    if (savedStyle) setHeroStyle(savedStyle)

    const handleStyleChange = (e) => {
      setHeroStyle(e.detail)
    }
    window.addEventListener('fuwari-hero-style-change', handleStyleChange)
    return () => window.removeEventListener('fuwari-hero-style-change', handleStyleChange)
  }, [])

  if (heroStyle !== 'fullscreen') return null

  const cover = siteInfo?.pageCover || siteConfig('FUWARI_HERO_BG_IMAGE', '', CONFIG) || siteConfig('HOME_BANNER_IMAGE') || '/bg_image.jpg'

  return (
    <div className='fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-[-1]'>
      {cover && (
        <div
          className='absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-opacity duration-1000'
          style={{ 
            backgroundImage: `url(${cover})`,
            opacity: 0.9,
            filter: 'brightness(0.8) saturate(1.2)'
          }}
        />
      )}
      <div className='absolute inset-0 bg-black/5 dark:bg-black/30' />
    </div>
  )
}

export default FullscreenWallpaper
