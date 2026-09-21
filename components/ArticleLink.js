/* eslint-disable @next/next/no-img-element */

import SmartLink from '@/components/SmartLink'
import {
  buildExternalRedirectPath,
  isExternalHttpLink,
  mergeRelValues
} from '@/lib/utils/externalLink'
import {
  getCachedLinkMetadataPreview,
  preloadLinkMetadataPreview
} from '@/lib/utils/linkMetadataPreview'
import { siteConfig } from '@/lib/config'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const PREVIEW_WIDTH = 320
const PREVIEW_OFFSET = 14
const PREVIEW_HOVER_DELAY_MS = 320
const FILE_LIKE_URL_PATTERN =
  /\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|txt|mp3|mp4|mov|avi|apk|dmg|exe)(?:[?#]|$)/i
const NON_TEXTUAL_LINK_CLASS_PATTERNS = [
  'notion-file-link',
  'notion-page-link',
  'notion-bookmark',
  'notion-collection-card',
  'notion-property-title'
]

const getUrlString = href => {
  if (typeof href === 'string') return href
  if (href && typeof href === 'object' && typeof href.pathname === 'string') {
    return href.pathname
  }
  return ''
}

const getFaviconProxyUrl = href => {
  try {
    const url = new URL(href)
    return `https://a.favicon.im/${encodeURIComponent(url.hostname)}`
  } catch {
    return null
  }
}

const buildPreviewPosition = rect => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const left = Math.min(
    Math.max(12, rect.left),
    Math.max(12, viewportWidth - PREVIEW_WIDTH - 12)
  )
  const estimatedHeight = 250
  const canShowAbove = rect.top > estimatedHeight + PREVIEW_OFFSET + 12

  return {
    left,
    top: canShowAbove
      ? rect.top - PREVIEW_OFFSET
      : Math.min(viewportHeight - 12, rect.bottom + PREVIEW_OFFSET),
    transform: canShowAbove ? 'translateY(-100%)' : 'none'
  }
}

const shouldDecorateHyperlink = className => {
  if (typeof className !== 'string' || !className.includes('notion-link')) {
    return false
  }

  return !NON_TEXTUAL_LINK_CLASS_PATTERNS.some(pattern =>
    className.includes(pattern)
  )
}

const isFileLikeLink = href => FILE_LIKE_URL_PATTERN.test(href)
const isManagedShortLink = href => /^\/r\/[A-Za-z0-9]+(?:[?#].*)?$/.test(href)
const isNotionFileLink = href => {
  try {
    return /(^|\.)file\.notion\.(?:com|so)$/i.test(new URL(href).hostname)
  } catch {
    return false
  }
}

const ExternalArticleLink = ({
  href,
  children,
  useShortlink = false,
  shortLinkRoutes,
  ...rest
}) => {
  const anchorRef = useRef(null)
  const hoverTimerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState(null)
  const [supportsHover, setSupportsHover] = useState(false)
  const [resolvedShortLink, setResolvedShortLink] = useState(null)
  const LINK = siteConfig('LINK')
  const linkPreviewEnabled = siteConfig('LINK_PREVIEW_ENABLE', true)
  const urlString = getUrlString(href)
  const isShortLink = isManagedShortLink(urlString)
  const targetUrl = resolvedShortLink || urlString
  const isExternal = isExternalHttpLink(targetUrl, LINK)
  const isFileLike = isFileLikeLink(targetUrl) || isNotionFileLink(targetUrl)
  const shouldShowPreview =
    linkPreviewEnabled &&
    isExternal &&
    shouldDecorateHyperlink(rest.className) &&
    !isFileLike &&
    supportsHover
  const shouldDecorate = isExternal && shouldDecorateHyperlink(rest.className)
  const shouldUseShortlink =
    isExternal && useShortlink && shouldDecorate && !isFileLike && !isShortLink
  const precomputedShortLink = shortLinkRoutes?.[targetUrl]

  const finalHref =
    precomputedShortLink ||
    (shouldUseShortlink ? buildExternalRedirectPath(targetUrl) : href)
  const rel = isExternal
    ? mergeRelValues(rest.rel, 'noopener noreferrer nofollow external')
    : rest.rel
  const favicon = useMemo(() => {
    if (isExternal) return getFaviconProxyUrl(targetUrl)
    return null
  }, [isExternal, targetUrl])

  useEffect(() => {
    if (!isShortLink) {
      setResolvedShortLink(null)
      return
    }
    const token = urlString.match(/^\/r\/([^?#/]+)/)?.[1]
    if (!token) return
    fetch(`/api/short-link-target?token=${encodeURIComponent(token)}`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => setResolvedShortLink(data?.url || null))
      .catch(() => setResolvedShortLink(null))
  }, [isShortLink, urlString])

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    const updateSupportsHover = () => setSupportsHover(media.matches)

    updateSupportsHover()
    media.addEventListener('change', updateSupportsHover)
    return () => media.removeEventListener('change', updateSupportsHover)
  }, [])

  useEffect(() => {
    if (!open || !shouldShowPreview || !anchorRef.current) return

    const updatePosition = () => {
      if (!anchorRef.current) return
      setPosition(buildPreviewPosition(anchorRef.current.getBoundingClientRect()))
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, shouldShowPreview])

  useEffect(() => {
    if (!shouldShowPreview) return

    const cachedPreview = getCachedLinkMetadataPreview(targetUrl)
    if (cachedPreview && !preview) {
      setPreview(cachedPreview)
      return
    }
    preloadLinkMetadataPreview(targetUrl)
      .then(data => setPreview(current => current || data))
      .catch(() => {})
  }, [preview, shouldShowPreview, targetUrl])

  useEffect(() => {
    if (!open || !shouldShowPreview || preview) return

    let cancelled = false
    setLoading(true)

    preloadLinkMetadataPreview(targetUrl)
      .then(data => {
        if (!cancelled) {
          setPreview(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpen(false)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, shouldShowPreview, preview, targetUrl])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
    }
  }, [])

  const openPreview = () => {
    if (!shouldShowPreview) return
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }
    hoverTimerRef.current = setTimeout(() => {
      setOpen(true)
      hoverTimerRef.current = null
    }, PREVIEW_HOVER_DELAY_MS)
  }

  const closePreview = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setOpen(false)
  }

  if (!isExternal) {
    return (
      <SmartLink href={href} {...rest}>
        {children}
      </SmartLink>
    )
  }

  if (!shouldDecorate) {
    return (
      <a
        {...rest}
        ref={anchorRef}
        href={finalHref}
        rel={rel}
        target='_blank'
        download={isFileLike ? '' : rest.download}
      >
        {children}
      </a>
    )
  }

  return (
    <>
      <a
        {...rest}
        ref={anchorRef}
        href={finalHref}
        rel={rel}
        target='_blank'
        download={isFileLike ? '' : rest.download}
        onMouseEnter={openPreview}
        onMouseLeave={closePreview}
        onFocus={() => setOpen(true)}
        onBlur={closePreview}
        data-link-preview-managed='true'
        data-link-preview-url={targetUrl}
        className={`notion-article-link ${rest.className || ''}`}
      >
        {favicon ? (
          <img
            src={favicon}
            alt=''
            aria-hidden='true'
            className='inline-block h-4 w-4 rounded-[4px] border border-black/5 bg-white/80 object-cover align-[-0.15em] mr-1'
            onError={event => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        <span className='break-all'>{children}</span>
      </a>
      {open && shouldShowPreview && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              className='pointer-events-none fixed z-[10020] w-80'
              style={position}
            >
              <div className='article-link-preview overflow-hidden rounded-2xl'>
                {preview?.image ? (
                  <div className='h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800'>
                    <img
                      src={preview.image}
                      alt=''
                      className='h-full w-full object-cover'
                      onError={event => {
                        event.currentTarget.parentElement?.remove()
                      }}
                    />
                  </div>
                ) : null}
                <div className='space-y-2 p-4'>
                  <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
                    {favicon ? (
                      <img
                        src={favicon}
                        alt=''
                        aria-hidden='true'
                        className='h-4 w-4 rounded-[4px] border border-black/5 bg-white/80'
                        onError={event => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <span className='truncate'>
                      {preview?.siteName || (() => {
                        try {
                          return new URL(targetUrl).hostname
                        } catch {
                          return targetUrl
                        }
                      })()}
                    </span>
                  </div>
                  <div className='text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100'>
                    {loading
                      ? '正在读取网页信息...'
                      : preview?.title || '外部链接预览'}
                  </div>
                  {(loading || preview?.description) && (
                    <p className='line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300'>
                      {loading
                        ? '鼠标停留时会读取网页标题、简介和首图。'
                        : preview?.description}
                    </p>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export default ExternalArticleLink
