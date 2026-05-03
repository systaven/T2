import { useState, useEffect } from 'react'
import BLOG from '@/blog.config'
import { isBrowser } from '@/lib/utils'

/**
 * 外部链接拦截器
 * 当点击非白名单外链时，弹出确认窗口
 */
const ExternalLinkIntercepter = () => {
  const [showModal, setShowModal] = useState(false)
  const [targetUrl, setTargetUrl] = useState('')

  useEffect(() => {
    if (!isBrowser) return

    const handleGlobalClick = (e) => {
      // 1. 寻找最近的 a 标签
      const link = e.target.closest('a')
      if (!link) return

      const href = link.getAttribute('href')
      if (!href) return

      // 2. 检查是否是外链
      const isExternal = /^https?:\/\//i.test(href) && !href.includes(window.location.hostname)
      if (!isExternal) return

      // 3. 检查白名单
      const whitelist = BLOG.LINK_WHITELIST || []
      const inWhitelist = whitelist.some(domain => href.includes(domain))
      if (inWhitelist) return

      // 4. 拦截点击，弹出确认
      e.preventDefault()
      e.stopPropagation()
      setTargetUrl(href)
      setShowModal(true)
    }

    document.addEventListener('click', handleGlobalClick, true)
    return () => document.removeEventListener('click', handleGlobalClick, true)
  }, [])

  if (!showModal) return null

  return (
    <div className='fixed inset-0 z-[9999] flex items-center justify-center px-4'>
      {/* 遮罩 */}
      <div 
        className='absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity'
        onClick={() => setShowModal(false)}
      />
      
      {/* 弹窗卡片 */}
      <div className='fuwari-card relative w-full max-w-md bg-white dark:bg-[#1a0b12] p-6 shadow-2xl animate-fuwari-enter'>
        <div className='flex items-center gap-3 mb-4 text-red-500'>
           <i className='fas fa-exclamation-triangle text-2xl' />
           <h3 className='text-xl font-bold'>您即将离开本站</h3>
        </div>
        
        <p className='text-[var(--fuwari-text)] opacity-80 mb-4 leading-relaxed'>
          即将跳转到第三方外部网站，请注意您的账号与财产安全：
        </p>
        
        <div className='bg-[var(--fuwari-bg-soft)] p-3 rounded-xl border border-[var(--fuwari-border)] mb-6'>
           <p className='text-sm break-all text-[var(--fuwari-primary)] font-mono italic'>
             {targetUrl}
           </p>
        </div>
        
        <div className='flex flex-col sm:flex-row gap-3'>
          <button 
            onClick={() => {
              window.open(targetUrl, '_blank')
              setShowModal(false)
            }}
            className='flex-1 bg-[var(--fuwari-primary)] text-white py-2.5 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-[var(--fuwari-primary-soft)]'
          >
            确认前往
          </button>
          <button 
            onClick={() => setShowModal(false)}
            className='flex-1 bg-[var(--fuwari-bg-soft)] text-[var(--fuwari-text)] py-2.5 rounded-xl font-medium hover:bg-[var(--fuwari-border)] transition-all'
          >
            点错了，返回
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExternalLinkIntercepter
