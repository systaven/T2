'use client'

import replaceSearchResult from '@/components/Mark'
import NotionPage from '@/components/NotionPage'
import ShareBar from '@/components/ShareBar'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { isBrowser } from '@/lib/utils'
import { generateLocaleDict } from '@/lib/utils/lang'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import ArchiveList from './components/ArchiveList'
import ArticleAdjacent from './components/ArticleAdjacent'
import ArticleCopyright from './components/ArticleCopyright'
import ArticleHeader from './components/ArticleHeader'
import ArticleLock from './components/ArticleLock'
import Footer from './components/Footer'
import Header from './components/Header'
import ArticleHeroCover from './components/ArticleHeroCover'
import CursorFollower from './components/CursorFollower'
import ExternalLinkIntercepter from './components/ExternalLinkIntercepter'
import HeroBanner from './components/HeroBanner'
import FullscreenWallpaper from './components/FullscreenWallpaper'
import Pagination from './components/Pagination'
import PostList from './components/PostList'
import RightFloatArea from './components/RightFloatArea'
import SidePanel from './components/SidePanel'
import SidePanelRight from './components/SidePanelRight'
import SearchInput from './components/SearchInput'
import CONFIG from './config'
import { Style } from './style'
import { isCommentServiceConfigured } from './utils/commentEnabled'

const Comment = dynamic(() => import('@/components/Comment'), { ssr: false })

const AlgoliaSearchModal = dynamic(
  () => import('@/components/AlgoliaSearchModal'),
  { ssr: false }
)
const Lenis = dynamic(() => import('@/components/Lenis'), { ssr: false })
const CursorDot = dynamic(() => import('@/components/CursorDot'), { ssr: false })
const Live2D = dynamic(() => import('@/components/Live2D'), { ssr: false })
const getLocale = () => generateLocaleDict(siteConfig('LANG', 'zh-CN'))

const LayoutBase = props => {
  const { children } = props
  const locale = getLocale()
  const searchModal = useRef(null)
  const router = useRouter()
  const [heroStyle, setHeroStyle] = useState(siteConfig('FUWARI_HERO_STYLE', 'banner', CONFIG))

  useEffect(() => {
    // 加载初始状态
    const savedStyle = localStorage.getItem('FUWARI_HERO_STYLE')
    if (savedStyle) setHeroStyle(savedStyle)

    // 监听切换事件
    const handleStyleChange = (e) => {
      setHeroStyle(e.detail)
    }
    window.addEventListener('fuwari-hero-style-change', handleStyleChange)
    return () => window.removeEventListener('fuwari-hero-style-change', handleStyleChange)
  }, [])

  const showHomeHero =
    !props.post &&
    (router.pathname === '/' || router.pathname === '/page/[page]') &&
    heroStyle === 'banner'
  const threeColumns = siteConfig('FUWARI_LAYOUT_THREE_COLUMNS', true, CONFIG)

  return (
    <div
      id='theme-fuwari'
      className={`${siteConfig('FONT_STYLE')} fuwari-bg min-h-screen text-[var(--fuwari-text)] ${heroStyle === 'fullscreen' ? 'fuwari-fullscreen-layout' : ''}`}>
      <Style />
      <FullscreenWallpaper {...props} />
      <CursorFollower />
      <ExternalLinkIntercepter />
      <Header
        locale={locale}
        customNav={props.customNav}
        customMenu={props.customMenu}
        searchModal={searchModal}
        siteInfo={props.siteInfo}
      />
      <AlgoliaSearchModal cRef={searchModal} {...props} />

      {showHomeHero && <HeroBanner {...props} />}

      <main
        className={`${threeColumns ? 'max-w-7xl' : 'max-w-6xl'} mx-auto px-3 md:px-4 pb-12 min-w-0 w-full ${showHomeHero ? 'fuwari-main-overlap' : 'pt-4 md:pt-8'}`}>
        <div className={`grid grid-cols-1 ${threeColumns ? 'xl:grid-cols-[280px_minmax(0,1fr)_280px] lg:grid-cols-[280px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'} gap-4 lg:gap-6 min-w-0`}>
          <div className='hidden lg:block sticky top-4 self-start'>
            <SidePanel {...props} isLeft={threeColumns} />
          </div>

          <section className='min-w-0 w-full max-w-full'>
            {children}
            <div className='lg:hidden mt-4'>
              <SidePanel {...props} />
            </div>
          </section>

          {threeColumns && (
            <div className='hidden xl:block self-stretch'>
              <SidePanelRight {...props} />
            </div>
          )}
        </div>
      </main>
      <Footer />
      <RightFloatArea post={props.post} />
      <div className="fixed bottom-0 right-0 z-40 pointer-events-none">
        <Live2D />
      </div>
      {siteConfig('FUWARI_EFFECT_LENIS', false, CONFIG) && <Lenis />}
      {siteConfig('FUWARI_EFFECT_CURSOR_DOT', false, CONFIG) && <CursorDot />}
    </div>
  )
}

const LayoutIndex = props => <LayoutPostList {...props} />

const LayoutPostList = props => {
  const locale = getLocale()
  const { category, tag } = props
  return (
    <>
      {(category || tag) && (
        <div className='fuwari-card p-5 mb-4'>
          <p className='text-sm uppercase tracking-widest text-[var(--fuwari-muted)] mb-2'>
            {category ? (locale?.COMMON?.CATEGORY || '分类') : (locale?.COMMON?.TAGS || '标签')}
          </p>
          <div className='flex items-center gap-2'>
            <h1 className='fuwari-section-title text-2xl font-bold'>
              {category || `#${tag}`}
            </h1>
            <span className='fuwari-chip'>{category ? (locale?.COMMON?.CATEGORY || '分类') : (locale?.COMMON?.TAGS || '标签')}</span>
          </div>
        </div>
      )}
      <PostList posts={props.posts} />
      <Pagination page={props.page} postCount={props.postCount} />
    </>
  )
}

const LayoutSlug = props => {
  const locale = getLocale()
  const { post, lock, validPassword, prev, next } = props
  if (!post) return null
  const showComments =
    siteConfig('FUWARI_ARTICLE_COMMENT', true, CONFIG) && isCommentServiceConfigured()
  const articleCoverSrc =
    siteConfig('FUWARI_ARTICLE_COVER_HERO', true, CONFIG) &&
    (post.pageCover || post.pageCoverThumbnail)
  return (
    <>
      {lock ? (
        <ArticleLock validPassword={validPassword} />
      ) : (
        <article className='fuwari-card p-6 overflow-hidden'>
          {articleCoverSrc ? (
            <ArticleHeroCover coverSrc={articleCoverSrc} title={post.title} />
          ) : null}
          <ArticleHeader post={post} />
          <div id='article-wrapper' className='fuwari-prose'>
            <NotionPage post={post} />
            {siteConfig('FUWARI_ARTICLE_SHARE', true, CONFIG) && <ShareBar post={post} />}
          </div>
          <ArticleCopyright post={post} />
          <ArticleAdjacent prev={prev} next={next} />
          {showComments && (
            <section className='mt-8 pt-6 border-t border-[var(--fuwari-border)]' aria-label={locale?.COMMON?.COMMENTS || 'Comments'}>
              <h2 className='text-base font-semibold mb-4 text-[var(--fuwari-text)] flex items-center gap-2'>
                <i className='far fa-comments text-[var(--fuwari-muted)]' aria-hidden='true' />
                {locale?.COMMON?.COMMENTS || 'Comments'}
              </h2>
              <Comment frontMatter={post} className='fuwari-comment !mt-0' />
            </section>
          )}
        </article>
      )}
    </>
  )
}

const LayoutSearch = props => {
  const { keyword, categoryOptions, tagOptions } = props
  const router = useRouter()
  const locale = getLocale()
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (isBrowser) {
      searchInputRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    if (isBrowser && keyword) {
      replaceSearchResult({
        doms: document.getElementById('posts-wrapper'),
        search: keyword,
        target: {
          element: 'span',
          className: 'text-red-500 border-b border-dashed'
        }
      })
    }
  }, [router, keyword])

  return (
    <>
      <div className='fuwari-card p-6 mb-4'>
        <p className='text-sm uppercase tracking-widest text-[var(--fuwari-muted)] mb-2'>
          {locale?.NAV?.SEARCH || '搜索'}
        </p>
        <h1 className='text-3xl font-bold mb-6'>
          {keyword ? `${locale?.NAV?.SEARCH}: ${keyword}` : (locale?.NAV?.SEARCH || '搜索')}
        </h1>
        <SearchInput cRef={searchInputRef} currentSearch={keyword} />

        {!keyword && (
          <div className='mt-8 space-y-6'>
            {categoryOptions?.length > 0 && (
              <div>
                <h2 className='text-sm font-semibold mb-3 tracking-wide uppercase text-[var(--fuwari-muted)]'>
                  {locale?.COMMON?.CATEGORY || '分类'}
                </h2>
                <div className='flex flex-wrap gap-2'>
                  {categoryOptions.map(c => (
                    <SmartLink
                      key={c.name}
                      href={`/category/${encodeURIComponent(c.name)}`}
                      className='fuwari-chip'>
                      {c.name} ({c.count})
                    </SmartLink>
                  ))}
                </div>
              </div>
            )}
            {tagOptions?.length > 0 && (
              <div>
                <h2 className='text-sm font-semibold mb-3 tracking-wide uppercase text-[var(--fuwari-muted)]'>
                  {locale?.COMMON?.TAGS || '标签'}
                </h2>
                <div className='flex flex-wrap gap-2'>
                  {tagOptions.map(t => (
                    <SmartLink
                      key={t.name}
                      href={`/tag/${encodeURIComponent(t.name)}`}
                      className='fuwari-chip'>
                      #{t.name}
                    </SmartLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <LayoutPostList {...props} />
    </>
  )
}


const LayoutArchive = props => {
  const locale = getLocale()
  return (
    <>
      <div className='fuwari-card p-6 mb-4'>
        <p className='text-sm uppercase tracking-widest text-[var(--fuwari-muted)] mb-2'>
          {locale?.NAV?.ARCHIVE || '归档'}
        </p>
        <h1 className='text-3xl font-bold leading-tight'>{locale?.NAV?.ARCHIVE || '归档'}</h1>
      </div>
      <ArchiveList archivePosts={props.archivePosts || {}} />
    </>
  )
}

const Layout404 = () => {
  const locale = getLocale()
  return (
    <div className='fuwari-card p-8 text-center'>
      <h1 className='text-4xl font-bold mb-2'>404</h1>
      <p className='text-sm text-[var(--fuwari-muted)] mb-4'>
        {locale?.NAV?.['404'] || '页面不存在'}
      </p>
      <SmartLink href='/' className='fuwari-link'>{locale?.NAV?.INDEX || '首页'}</SmartLink>
    </div>
  )
}

const LayoutCategoryIndex = props => {
  const locale = getLocale()
  const { categoryOptions } = props
  return (
    <div className='fuwari-card p-5'>
      <h2 className='fuwari-section-title text-2xl font-semibold mb-4'>{locale?.COMMON?.CATEGORY || '分类'}</h2>
      <div className='flex flex-wrap gap-2'>
        {(categoryOptions || []).map(c => (
          <SmartLink
            key={c.name}
            href={`/category/${encodeURIComponent(c.name)}`}
            className='fuwari-chip'>
            {c.name} {c.count ? `(${c.count})` : ''}
          </SmartLink>
        ))}
      </div>
    </div>
  )
}

const LayoutTagIndex = props => {
  const locale = getLocale()
  const { tagOptions } = props
  return (
    <div className='fuwari-card p-5'>
      <h2 className='fuwari-section-title text-2xl font-semibold mb-4'>{locale?.COMMON?.TAGS || '标签'}</h2>
      <div className='flex flex-wrap gap-2'>
        {(tagOptions || []).map(t => (
          <SmartLink
            key={t.name}
            href={`/tag/${encodeURIComponent(t.name)}`}
            className='fuwari-chip'>
            #{t.name} {t.count ? `(${t.count})` : ''}
          </SmartLink>
        ))}
      </div>
    </div>
  )
}

export {
  Layout404,
  LayoutArchive,
  LayoutBase,
  LayoutCategoryIndex,
  LayoutIndex,
  LayoutPostList,
  LayoutSearch,
  LayoutSlug,
  LayoutTagIndex,
  CONFIG as THEME_CONFIG
}

