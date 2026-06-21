import { siteConfig } from '@/lib/config'
import { useEffect, useState } from 'react'
import CONFIG from '../config'

const LayoutSwitchButton = () => {
  const [layout, setLayout] = useState('list')

  useEffect(() => {
    const savedLayout = localStorage.getItem('FUWARI_POST_LIST_LAYOUT') || siteConfig('FUWARI_POST_LIST_LAYOUT', 'list', CONFIG)
    setLayout(savedLayout)

    const handleLayoutChange = (e) => {
      setLayout(e.detail)
    }
    window.addEventListener('fuwari-post-list-layout-change', handleLayoutChange)
    return () => window.removeEventListener('fuwari-post-list-layout-change', handleLayoutChange)
  }, [])

  if (!siteConfig('FUWARI_POST_LIST_LAYOUT_ALLOW_SWITCH', true, CONFIG)) {
    return null
  }

  const toggleLayout = () => {
    const nextLayout = layout === 'list' ? 'grid' : 'list'
    setLayout(nextLayout)
    localStorage.setItem('FUWARI_POST_LIST_LAYOUT', nextLayout)
    window.dispatchEvent(new CustomEvent('fuwari-post-list-layout-change', { detail: nextLayout }))
  }

  return (
    <button
      type='button'
      onClick={toggleLayout}
      className='fuwari-tool-btn hidden md:inline-flex'
      title={layout === 'list' ? '切换为网格布局' : '切换为列表布局'}
    >
      {layout === 'list' ? (
        <i className='fas fa-th-large' />
      ) : (
        <i className='fas fa-list' />
      )}
    </button>
  )
}

export default LayoutSwitchButton
