import { useEffect } from 'react'
import BLOG from '@/blog.config'
import { isBrowser } from '@/lib/utils'
import { buildExternalRedirectPath } from '@/lib/utils/externalLink'

/**
 * 外部链接静默改写器
 * 将正文中的非白名单外链改写为站内中转短链
 */
const ExternalLinkIntercepter = () => {
  useEffect(() => {
    if (!isBrowser) return

    const whitelist = BLOG.LINK_WHITELIST || []
    const articleSelector =
      '#article-wrapper a[href], #announcement-content a[href], #notion-article a[href]'

    const rewriteLink = link => {
      const href = link.getAttribute('href')
      if (!href) return

      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return
      }

      if (link.dataset.externalRedirectRewritten === 'true') {
        return
      }

      try {
        const url = new URL(href, window.location.origin)

        if (url.origin === window.location.origin) {
          return
        }

        const isNotionFile =
          /amazonaws\.com|notion-static|file\.notion\.so/i.test(href) ||
          /\.(zip|rar|7z|pdf|docx?|xlsx?|pptx?|txt|exe|dmg|apk)$/i.test(href)

        if (isNotionFile) {
          link.setAttribute('target', '_blank')
          link.setAttribute('download', '')
          return
        }

        const inWhitelist = whitelist.some(domain =>
          url.hostname.includes(domain)
        )
        if (inWhitelist) return

        link.setAttribute('href', buildExternalRedirectPath(url.toString()))
        link.setAttribute(
          'rel',
          'noopener noreferrer nofollow external'
        )
        if (!link.getAttribute('target')) {
          link.setAttribute('target', '_blank')
        }
        link.dataset.externalRedirectRewritten = 'true'
      } catch (err) {
        console.warn('URL parse failed:', href)
      }
    }

    const rewriteAllLinks = () => {
      const links = document.querySelectorAll(articleSelector)
      links.forEach(rewriteLink)
    }

    rewriteAllLinks()

    const observer = new MutationObserver(() => rewriteAllLinks())
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => observer.disconnect()
  }, [])

  return null
}

export default ExternalLinkIntercepter
