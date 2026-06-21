import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import CONFIG from '../config'

const getCurrentSearchQuery = router => {
  const queryString = router?.asPath?.split('?')[1]?.split('#')[0] || ''
  const params = new URLSearchParams(queryString)
  const query = {}
  params.forEach((value, key) => {
    query[key] = value
  })
  return query
}

const getArchiveHref = (publishDay, router) => {
  const query = getCurrentSearchQuery(router)
  if (!publishDay) return { pathname: '/archive', query }
  const str = String(publishDay)
  const matched = str.match(/^(\d{4})[-/.](\d{1,2})/)
  if (!matched) return { pathname: '/archive', query }
  const year = matched[1]
  const month = matched[2].padStart(2, '0')
  return {
    pathname: '/archive',
    query,
    hash: `archive-${year}-${month}`
  }
}

const PostCard = ({ post, layout }) => {
  const router = useRouter()
  const isGrid = layout === 'grid'

  const coverColPx = Math.min(
    360,
    Math.max(200, Number(siteConfig('FUWARI_POST_LIST_COVER_COL_WIDTH', 280, CONFIG)) || 280)
  )
  const coverSrc =
    post.pageCoverThumbnail ||
    (siteConfig('FUWARI_POST_LIST_COVER_DEFAULT', false, CONFIG) &&
      siteConfig('HOME_BANNER_IMAGE'))
  const [coverFailed, setCoverFailed] = useState(false)
  const showCover = Boolean(coverSrc) && !coverFailed
  const showRail = !showCover
  const listCoverOn = siteConfig('FUWARI_POST_LIST_COVER', true, CONFIG)
  const showCoverBlock = listCoverOn && showCover

  const gridTemplateColumns = (() => {
    if (showCoverBlock) {
      return `minmax(0, 1fr) ${coverColPx}px`
    }
    if (showRail) {
      return `minmax(0, 1fr) 56px`
    }
    return 'minmax(0, 1fr)'
  })()

  return (
    <article className='fuwari-card fuwari-card-hover p-4 relative w-full max-w-full min-w-0 flex flex-col justify-between h-full'>
      <div className={`w-full min-w-0 flex h-full ${isGrid ? 'flex-col' : 'flex-col md:grid md:gap-4 md:items-stretch min-h-[178px]'}`} style={!isGrid ? { gridTemplateColumns } : undefined}>
        
        {/* Cover Image for Grid Mode (renders at top) */}
        {showCoverBlock && isGrid && (
          <div className='w-full aspect-[2/1] rounded-xl overflow-hidden mb-3.5 shrink-0'>
            <SmartLink href={post.href || `/${post.slug}`}>
              <div
                className={`fuwari-cover-wrap h-full ${siteConfig('FUWARI_POST_LIST_COVER_HOVER_ENLARGE', true, CONFIG) ? 'fuwari-cover-enlarge' : ''}`}>
                <img
                  src={coverSrc}
                  alt={post.title}
                  className='w-full h-full object-cover rounded-xl'
                  onError={() => setCoverFailed(true)}
                />
              </div>
            </SmartLink>
          </div>
        )}

        {/* Text content details */}
        <div className={`min-w-0 flex-1 flex flex-col justify-between ${!isGrid ? 'md:pr-1' : ''}`}>
          <div>
            <h2 className={`fuwari-post-title font-bold mb-1.5 leading-tight ${isGrid ? 'text-xl md:text-2xl line-clamp-2' : 'text-[2rem]'}`}>
              <SmartLink href={post.href || `/${post.slug}`} className='hover:opacity-90 transition-opacity'>
                {post.title}
              </SmartLink>
            </h2>
            
            <div className='fuwari-meta-row mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fuwari-muted)]'>
              <SmartLink href={getArchiveHref(post.publishDay, router)} className='fuwari-meta-item flex items-center gap-1 hover:text-[var(--fuwari-primary)] transition-colors'>
                <i className='far fa-calendar-alt text-xs' />
                <span>{post.publishDay}</span>
              </SmartLink>
              {siteConfig('FUWARI_POST_LIST_TAG', true, CONFIG) && (
                <>
                  {post.category && (
                    <SmartLink
                      href={`/category/${encodeURIComponent(post.category)}`}
                      className='fuwari-meta-item flex items-center gap-1 hover:text-[var(--fuwari-primary)] transition-colors'>
                      <i className='far fa-bookmark text-xs' />
                      <span>{post.category}</span>
                    </SmartLink>
                  )}
                </>
              )}
            </div>
            
            {siteConfig('FUWARI_POST_LIST_SUMMARY', true, CONFIG) && post.summary && (
              <p className={`text-sm leading-relaxed text-[var(--fuwari-muted)] fuwari-summary mb-3 ${isGrid ? 'line-clamp-2' : 'line-clamp-3'}`}>
                {post.summary}
              </p>
            )}
          </div>

          {/* Tags list (renders at bottom for both list and grid view for cleaner layout) */}
          {siteConfig('FUWARI_POST_LIST_TAG', true, CONFIG) && !!post.tagItems?.length && (
            <div className='flex flex-wrap gap-1.5 mt-2'>
              {post.tagItems.slice(0, 3).map((tag) => (
                <SmartLink
                  key={tag.name}
                  href={`/tag/${encodeURIComponent(tag.name)}`}
                  className='text-[10px] px-2 py-0.5 rounded-lg bg-[var(--fuwari-bg-soft)] text-[var(--fuwari-muted)] hover:text-[var(--fuwari-primary)] hover:bg-[var(--fuwari-primary-soft)] transition-colors'
                >
                  # {tag.name}
                </SmartLink>
              ))}
            </div>
          )}
        </div>

        {/* Cover Image for List Mode (renders at right on desktop) */}
        {showCoverBlock && !isGrid && (
          <div className='mt-4 md:mt-0'>
            <SmartLink href={post.href || `/${post.slug}`}>
              <div
                className={`fuwari-cover-wrap h-full ${siteConfig('FUWARI_POST_LIST_COVER_HOVER_ENLARGE', true, CONFIG) ? 'fuwari-cover-enlarge' : ''}`}>
                <img
                  src={coverSrc}
                  alt={post.title}
                  className='w-full aspect-[2/1] max-h-52 md:aspect-auto md:max-h-none md:h-full md:min-h-[168px] object-cover rounded-xl'
                  onError={() => setCoverFailed(true)}
                />
              </div>
            </SmartLink>
          </div>
        )}

        {!isGrid && showRail && (
          <SmartLink href={post.href || `/${post.slug}`} className='hidden md:flex fuwari-readmore-rail'>
            <i className='fas fa-chevron-right' />
          </SmartLink>
        )}
      </div>
    </article>
  )
}

const PostList = ({ posts = [] }) => {
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

  return (
    <div id='posts-wrapper' className={`grid gap-4 w-full min-w-0 max-w-full ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {posts.map(post => (
        <PostCard key={post.id} post={post} layout={layout} />
      ))}
    </div>
  )
}

export default PostList
