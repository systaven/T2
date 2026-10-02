import BLOG from '@/blog.config'
import { useEffect } from 'react'
import { buildExternalRedirectPath } from '@/lib/utils/externalLink'

/** Collection/bookmark cards bypass React's inline link renderer. Scope to article only. */
export default function ArticleLinks() {
  useEffect(() => {
    const root = document.getElementById('notion-article')
    if (!root) return
    const rewrite = () =>
      root.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href')
        if (!/^https?:\/\//i.test(href) || link.hasAttribute('download')) return
        try {
          const url = new URL(href)
          if (
            url.origin === window.location.origin ||
            url.origin === new URL(BLOG.LINK).origin
          )
            return
          if (
            (BLOG.LINK_WHITELIST || []).some(
              domain =>
                url.hostname === domain || url.hostname.endsWith(`.${domain}`)
            )
          )
            return
          if (
            /amazonaws\.com|notion-static|file\.notion\.(?:com|so)/i.test(
              url.hostname
            ) ||
            /\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|txt|mp3|mp4|mov|avi|apk|dmg|exe)$/i.test(
              url.pathname
            )
          )
            return
          link.dataset.linkPreviewUrl = url.toString()
          link.setAttribute('href', buildExternalRedirectPath(url.toString()))
          link.setAttribute('target', '_blank')
          link.setAttribute('rel', 'noopener noreferrer nofollow external')
        } catch {
          /* Leave malformed links to the existing renderer. */
        }
      })
    rewrite()
    const observer = new MutationObserver(rewrite)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return null
}
