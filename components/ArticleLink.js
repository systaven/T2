/* eslint-disable @next/next/no-img-element */

import SmartLink from '@/components/SmartLink'
import {
  buildExternalRedirectPath,
  isExternalHttpLink,
  mergeRelValues
} from '@/lib/utils/externalLink'
import { siteConfig } from '@/lib/config'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const PREVIEW_WIDTH = 320
const PREVIEW_OFFSET = 14
const PREVIEW_HOVER_DELAY_MS = 320
const FILE_LIKE_URL_PATTERN =
  /\.(pdf|zip|rar|7z|docx?|xlsx?|pptx?|txt|mp3|mp4|mov|avi|apk|dmg|exe)(?:[?#]|$)/i
const previewCache = new Map()

const getUrlString = href => {
  if (typeof href === 'string') return href
  if (href && typeof href === 'object' && typeof href.pathname === 'string') {
    return href.pathname
  }
  return ''
}

const getFallbackFavicon = href => {
  try {
    const url = new URL(href)
    return `${url.origin}/favicon.ico`
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

const ExternalArticleLink = ({ href, children, ...rest }) => {
  const anchorRef = useRef(null)
  const hoverTimerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState(null)
  const LINK = siteConfig('LINK')
  const linkPreviewEnabled = siteConfig('LINK_PREVIEW_ENABLE', true)
  const urlString = getUrlString(href)
  const isExternal = isExternalHttpLink(urlString, LINK)
  const shouldShowPreview =
    linkPreviewEnabled &&
    isExternal &&
    !FILE_LIKE_URL_PATTERN.test(urlString) &&
    typeof window !== 'undefined'

  const finalHref = isExternal ? buildExternalRedirectPath(urlString) : href
  const rel = isExternal
    ? mergeRelValues(rest.rel, 'noopener noreferrer nofollow external')
    : rest.rel
  const favicon = useMemo(() => {
    if (preview?.favicon) return preview.favicon
    if (isExternal) return getFallbackFavicon(urlString)
    return null
  }, [preview?.favicon, isExternal, urlString])

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

    const cachedPreview = previewCache.get(urlString)
    if (cachedPreview && !preview) {
      setPreview(cachedPreview)
    }
  }, [preview, shouldShowPreview, urlString])

  useEffect(() => {
    if (!open || !shouldShowPreview || loading || preview) return

    let cancelled = false
    setLoading(true)

    fetch(`/api/link-preview?url=${encodeURIComponent(urlString)}`)
      .then(async response => {
        if (!response.ok) {
          throw new Error('preview request failed')
        }
        return await response.json()
      })
      .then(data => {
        if (!cancelled) {
          previewCache.set(urlString, data)
          setPreview(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          const fallbackPreview = {
            title: null,
            description: null,
            image: null,
            favicon: getFallbackFavicon(urlString),
            siteName: null,
            url: urlString
          }
          previewCache.set(urlString, fallbackPreview)
          setPreview(fallbackPreview)
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
  }, [open, shouldShowPreview, loading, preview, urlString])

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

  return (
    <>
      <a
        {...rest}
        ref={anchorRef}
        href={finalHref}
        rel={rel}
        target={rest.target || '_blank'}
        onMouseEnter={openPreview}
        onMouseLeave={closePreview}
        onFocus={() => setOpen(true)}
        onBlur={closePreview}
        className={`notion-article-link group inline-flex max-w-full items-center gap-1.5 align-baseline ${rest.className || ''}`}
      >
        {favicon ? (
          <img
            src={favicon}
            alt=''
            aria-hidden='true'
            className='h-4 w-4 shrink-0 rounded-[4px] border border-black/5 bg-white/80 object-cover'
            onError={event => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        <span className='min-w-0 break-all'>{children}</span>
      </a>
      {open && shouldShowPreview && position && typeof document !== 'undefined'
        ? createPortal(
            <div
              className='pointer-events-none fixed z-[10020] w-80'
              style={position}
            >
              <div className='overflow-hidden rounded-2xl border border-[var(--fuwari-border)] bg-[var(--fuwari-surface)] shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-sm'>
                {preview?.image ? (
                  <div className='h-36 w-full overflow-hidden bg-[var(--fuwari-bg-soft)]'>
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
                  <div className='flex items-center gap-2 text-xs text-[var(--fuwari-muted)]'>
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
                          return new URL(urlString).hostname
                        } catch {
                          return urlString
                        }
                      })()}
                    </span>
                  </div>
                  <div className='text-sm font-semibold leading-6 text-[var(--fuwari-text)]'>
                    {loading
                      ? '正在读取网页信息...'
                      : preview?.title || '外部链接预览'}
                  </div>
                  {(loading || preview?.description) && (
                    <p className='line-clamp-3 text-sm leading-6 text-[var(--fuwari-muted)]'>
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
