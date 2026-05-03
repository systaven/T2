/* eslint-disable no-undef */
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isMobile, loadExternalResource } from '@/lib/utils'
import { useEffect, useState } from 'react'

/**
 * 网页动画
 * @returns
 */
export default function Live2D() {
  const { theme, switchTheme } = useGlobal()
  const [isShown, setIsShown] = useState(true)
  const showPet = JSON.parse(siteConfig('WIDGET_PET'))
  const petLink = siteConfig('WIDGET_PET_LINK')
  const petSwitchTheme = siteConfig('WIDGET_PET_SWITCH_THEME')

  useEffect(() => {
    if (showPet && isShown && !isMobile()) {
      Promise.all([
        loadExternalResource(
          'https://cdn.jsdelivr.net/gh/stevenjoezhang/live2d-widget@latest/live2d.min.js',
          'js'
        )
      ]).then(e => {
        if (typeof window?.loadlive2d !== 'undefined') {
          try {
            loadlive2d('live2d', petLink)
          } catch (error) {
            console.error('读取PET模型', error)
          }
        }
      })
    }
  }, [theme, isShown])

  function handleClick() {
    if (petSwitchTheme) {
      switchTheme()
    }
  }

  if (!showPet) {
    return <></>
  }

  return (
    <div className='relative group'>
      {/* 关闭按钮 */}
      {isShown && (
        <div
          onClick={() => setIsShown(false)}
          className='absolute top-0 right-0 z-50 cursor-pointer pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-10 hover:bg-opacity-30 rounded-full w-6 h-6 flex items-center justify-center text-white'>
          <i className='fas fa-times text-xs' />
        </div>
      )}

      {/* 展开按钮（当隐藏时显示一个小爪子或猫咪图标） */}
      {!isShown && (
        <div
          onClick={() => setIsShown(true)}
          className='cursor-pointer pointer-events-auto bg-[var(--fuwari-primary)] text-white p-2 rounded-l-lg shadow-lg hover:scale-110 transition-all flex items-center justify-center'>
          <i className='fas fa-paw animate-bounce' />
        </div>
      )}

      {isShown && (
        <canvas
          id='live2d'
          width='280'
          height='250'
          onClick={handleClick}
          className='cursor-grab pointer-events-auto'
          onMouseDown={e => e.target.classList.add('cursor-grabbing')}
          onMouseUp={e => e.target.classList.remove('cursor-grabbing')}
        />
      )}
    </div>
  )
}
