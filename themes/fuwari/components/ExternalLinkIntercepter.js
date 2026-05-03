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
      // 1. 获取点击的目标及其父级链条
      const target = e.target

      // 2. 寻找最近的具有跳转意图的元素
      // 优先找 a 标签，但也兼容可能存在的 data-href 或其他自定义跳转属性
      const link = target.closest('a')
      if (!link) return

      // 1.5 限制作用域：仅在文章正文区域内生效
      // 匹配：主文章包装器、侧栏公告区域、Notion 渲染核心
      const isInsideArticle = link.closest('#article-wrapper, #announcement-content, #notion-article')
      if (!isInsideArticle) return

      const href = link.getAttribute('href')
      if (!href) return

      // 3. 排除无效链接和内部协议
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      try {
        // 4. 使用原生的 URL 解析来判断
        // 这样可以处理相对路径、绝对路径以及各种奇怪的格式
        const url = new URL(href, window.location.origin)

        // 检查是否为内部链接（同源）
        if (url.origin === window.location.origin) {
          // 特殊处理：如果是 Notion 内部页面链接但还没被转换成 slug（例如含有 notion.so）
          // 这种情况我们通常认为它是安全的，不需要弹窗
          return
        }

        // 5. 特殊处理 Notion 文件下载（保持之前的逻辑）
        const isNotionFile = /amazonaws\.com|notion-static|file\.notion\.so/i.test(href) || 
                            /\.(zip|rar|7z|pdf|docx?|xlsx?|pptx?|txt|exe|dmg|apk)$/i.test(href)

        if (isNotionFile) {
          link.setAttribute('target', '_blank')
          link.setAttribute('download', '')
          return 
        }

        // 6. 检查白名单
        const whitelist = BLOG.LINK_WHITELIST || []
        const inWhitelist = whitelist.some(domain => url.hostname.includes(domain))
        if (inWhitelist) return

        // 7. 到这里说明是真正的非白名单外链，执行拦截
        e.preventDefault()
        e.stopPropagation()

        setTargetUrl(href)
        setShowModal(true)

      } catch (err) {
        // 解析 URL 失败，说明不是有效的跳转链接，忽略
        console.warn('URL parse failed:', href)
      }
    }

    // 使用 capture 阶段监听，确保在组件内部的 stopPropagation 之前捕获到
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
