import { siteConfig } from '@/lib/config'
import { loadExternalResource } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

/**
 * Giscus评论 @see https://giscus.app/zh-CN
 * Contribute by @txs https://github.com/txs/NotionNext/commit/1bf7179d0af21fb433e4c7773504f244998678cb
 * @returns {JSX.Element}
 * @constructor
 */

const Twikoo = ({ isDarkMode }) => {
  const envId = siteConfig('COMMENT_TWIKOO_ENV_ID')
  const el = siteConfig('COMMENT_TWIKOO_ELEMENT_ID', '#twikoo')
  const twikooCDNURL = siteConfig('COMMENT_TWIKOO_CDN_URL')
  const lang = siteConfig('LANG')
  const [isInit] = useState(useRef(false))

  // 监听并同步 Clerk 登录状态
  useEffect(() => {
    const updateClerkState = () => {
      const clerk = window.Clerk
      if (clerk && clerk.user) {
        window.clerkUser = {
          nick: clerk.user.fullName || clerk.user.username || 'Clerk User',
          mail: clerk.user.primaryEmailAddress?.emailAddress || '',
          avatar: clerk.user.imageUrl || '',
          link: ''
        }
        window.getClerkToken = async () => {
          return await clerk.session?.getToken()
        }
      } else {
        window.clerkUser = null
        window.getClerkToken = null
      }
    }

    // 初始读取
    updateClerkState()

    let unsubscribe = null
    if (window.Clerk && typeof window.Clerk.addListener === 'function') {
      unsubscribe = window.Clerk.addListener(updateClerkState)
    } else {
      // 如果 Clerk SDK 尚未加载完成，进行循环轮询直到加载
      const interval = setInterval(() => {
        if (window.Clerk) {
          updateClerkState()
          if (typeof window.Clerk.addListener === 'function') {
            unsubscribe = window.Clerk.addListener(updateClerkState)
          }
          clearInterval(interval)
        }
      }, 500)
      return () => {
        clearInterval(interval)
        if (unsubscribe) unsubscribe()
      }
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const loadTwikoo = async () => {
    try {
      await loadExternalResource(twikooCDNURL, 'js')
      const twikoo = window?.twikoo
      if (
        typeof twikoo !== 'undefined' &&
        twikoo &&
        typeof twikoo.init === 'function'
      ) {
        twikoo.init({
          envId: envId, // 腾讯云环境填 envId；Vercel 环境填地址（https://xxx.vercel.app）
          el: el, // 容器元素
          lang: lang, // 用于手动设定评论区语言，支持的语言列表 https://github.com/imaegoo/twikoo/blob/main/src/client/utils/i18n/index.js
          clerkUser: window?.clerkUser || null,
          getClerkToken: window?.getClerkToken || null
          // region: 'ap-guangzhou', // 环境地域，默认为 ap-shanghai，腾讯云环境填 ap-shanghai 或 ap-guangzhou；Vercel 环境不填
          // path: location.pathname, // 用于区分不同文章的自定义 js 路径，如果您的文章路径不是 location.pathname，需传此参数
        })
        console.log('twikoo init', twikoo)
        isInit.current = true
      }
    } catch (error) {
      console.error('twikoo 加载失败', error)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (isInit.current) {
        console.log('twioo init! clear interval')
        clearInterval(interval)
      } else {
        loadTwikoo()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isDarkMode])

  return <div id="twikoo"></div>
}

export default Twikoo
