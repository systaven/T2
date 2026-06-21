import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import SmartLink from '@/components/SmartLink'

const HeaderSearch = ({ isMobile }) => {
  const router = useRouter()
  const { lang, locale } = useGlobal()
  const [isRendered, setIsRendered] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  
  const searchRef = useRef(null)
  const desktopInputRef = useRef(null)
  const mobileInputRef = useRef(null)

  // Fetch posts once search is focused/clicked
  const fetchPosts = async () => {
    if (hasFetched || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/posts?locale=${lang || 'zh-CN'}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setPosts(data)
      }
      setHasFetched(true)
    } catch (e) {
      console.error('Failed to fetch posts', e)
    } finally {
      setLoading(false)
    }
  }

  const openModal = () => {
    setIsRendered(true)
    fetchPosts()
    setTimeout(() => {
      setIsModalOpen(true)
    }, 20)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setTimeout(() => {
      setIsRendered(false)
    }, 300)
  }

  const handleFocus = () => {
    openModal()
  }

  const handleInputChange = (val) => {
    setKeyword(val)
    setActiveIndex(-1)
  }

  // Filter posts based on keyword
  const filteredPosts = keyword.trim() === '' ? [] : posts.filter(post => {
    const title = post.title?.toLowerCase() || ''
    const summary = post.summary?.toLowerCase() || ''
    const tags = Array.isArray(post.tags) ? post.tags.join(' ').toLowerCase() : ''
    const category = Array.isArray(post.category) ? post.category.join(' ').toLowerCase() : (post.category?.toLowerCase() || '')
    const query = keyword.toLowerCase()
    return title.includes(query) || summary.includes(query) || tags.includes(query) || category.includes(query)
  })

  // Limit to top 6 results for clean UI
  const results = filteredPosts.slice(0, 6)

  // Handle outside clicks to close modal
  useEffect(() => {
    const onClickOutside = (e) => {
      const modalElement = document.querySelector('.search-modal-card')
      if (isModalOpen && modalElement && !modalElement.contains(e.target)) {
        closeModal()
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isModalOpen])

  // Handle ESC or other shortcuts (like CMD+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal()
      }
      // Open modal on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openModal()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hasFetched, loading])

  // Focus mobile input when modal opens, blur when closed
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        mobileInputRef.current?.focus()
      }, 100)
    } else {
      mobileInputRef.current?.blur()
    }
  }, [isModalOpen])

  // Route change hook to close search dropdown/modal
  useEffect(() => {
    const handleRouteChange = () => {
      closeModal()
      setKeyword('')
    }
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])

  // Handle key navigation
  const handleKeyDown = (e) => {
    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < results.length) {
        const targetPost = results[activeIndex]
        router.push(targetPost.href || `/${targetPost.slug}`)
      } else if (keyword.trim()) {
        router.push(`/search/${encodeURIComponent(keyword)}`)
      }
    }
  }

  const clearSearch = () => {
    setKeyword('')
    setActiveIndex(-1)
  }

  // Render a single post preview item
  const renderItem = (post, index, isCurrentActive) => {
    const coverSrc = post.pageCoverThumbnail || post.pageCover
    const href = post.href || `/${post.slug}`
    
    return (
      <SmartLink
        key={post.id}
        href={href}
        className={`group flex gap-3 p-2.5 rounded-lg text-left transition-all duration-200 border border-transparent ${
          isCurrentActive
            ? 'bg-[var(--fuwari-bg-soft)] border-[var(--fuwari-primary)]'
            : 'hover:bg-[var(--fuwari-bg-soft)]'
        }`}
        onMouseEnter={() => setActiveIndex(index)}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={post.title}
            className='w-12 h-12 object-cover rounded-lg shrink-0 bg-[var(--fuwari-bg-soft)] border border-[var(--fuwari-border)]'
          />
        ) : (
          <div className='w-12 h-12 rounded-lg bg-[var(--fuwari-bg-soft)] border border-[var(--fuwari-border)] flex items-center justify-center text-[var(--fuwari-muted)] shrink-0'>
            <i className='far fa-file-alt text-base group-hover:text-[var(--fuwari-primary)] transition-colors' />
          </div>
        )}
        <div className='min-w-0 flex-1 flex flex-col justify-center'>
          <h3 className={`font-semibold text-xs leading-snug truncate ${
            isCurrentActive ? 'text-[var(--fuwari-primary)]' : 'text-[var(--fuwari-text)]'
          }`}>
            {post.title}
          </h3>
          {post.summary && (
            <p className='text-[10px] text-[var(--fuwari-muted)] line-clamp-1 mt-0.5 leading-relaxed'>
              {post.summary}
            </p>
          )}
          <div className='flex items-center gap-2 mt-1 flex-wrap text-[9px] text-[var(--fuwari-muted)]'>
            {post.category && (
              <span className='px-1.5 py-0.5 rounded bg-[var(--fuwari-bg-soft)] font-medium text-[var(--fuwari-muted)] uppercase tracking-wider shrink-0'>
                {post.category}
              </span>
            )}
            {post.publishDay && (
              <span className='shrink-0'>{post.publishDay}</span>
            )}
          </div>
        </div>
      </SmartLink>
    )
  }

  return (
    <>
      {isMobile ? (
        /* Mobile Search Button */
        <button
          type='button'
          onClick={handleFocus}
          className='fuwari-tool-btn'
          title={locale?.NAV?.SEARCH}
        >
          <i className='fas fa-search' />
        </button>
      ) : (
        /* Desktop Search Input Box Trigger */
        <div className='relative z-50 select-none' ref={searchRef}>
          <div 
            onClick={handleFocus}
            className='relative flex items-center bg-[var(--fuwari-bg-soft)] rounded-lg transition-all duration-300 border border-transparent hover:border-[var(--fuwari-primary)] w-44 hover:w-64 cursor-pointer overflow-hidden'
          >
            <i className='fas fa-search text-[var(--fuwari-muted)] ml-3 text-xs shrink-0' />
            <input
              ref={desktopInputRef}
              type='text'
              placeholder={locale?.SEARCH?.ARTICLES || '搜索文章...'}
              value=''
              readOnly
              className='bg-transparent text-xs text-[var(--fuwari-text)] pl-2 pr-8 py-1.5 w-full outline-none cursor-pointer'
            />
            <div className='absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
              <span className='text-[9px] px-1 py-0.2 bg-[var(--fuwari-bg-soft)] border border-[var(--fuwari-border)] text-[var(--fuwari-muted)] rounded opacity-60 font-mono'>
                ⌘K
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal Overlay (Portaled to document.body) */}
      {isRendered && typeof window !== 'undefined' && createPortal(
        <div
          className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex justify-center items-start pt-[10vh] px-4 transition-all duration-300 ${
            isModalOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeModal}
        >
          <div
            className={`search-modal-card bg-[var(--fuwari-surface)] w-full max-w-lg rounded-2xl border border-[var(--fuwari-border)] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
              isModalOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Search Input Header */}
            <div className='relative flex items-center border-b border-[var(--fuwari-border)] p-3 bg-[var(--fuwari-bg-soft)]'>
              <i className='fas fa-search text-[var(--fuwari-muted)] ml-2 text-sm shrink-0' />
              <input
                ref={mobileInputRef}
                type='text'
                placeholder={locale?.SEARCH?.ARTICLES || '搜索文章...'}
                value={keyword}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className='bg-transparent text-sm text-[var(--fuwari-text)] pl-3 pr-8 py-1.5 w-full outline-none'
              />
              <div className='absolute right-12 top-1/2 -translate-y-1/2 flex items-center'>
                {loading && (
                  <i className='fas fa-spinner animate-spin text-[var(--fuwari-muted)] text-xs' />
                )}
                {keyword && !loading && (
                  <button onClick={clearSearch} className='text-[var(--fuwari-muted)] hover:text-[var(--fuwari-text)]'>
                    <i className='fas fa-times text-xs' />
                  </button>
                )}
              </div>
              <button
                onClick={closeModal}
                className='ml-2 text-xs font-medium text-[var(--fuwari-muted)] hover:text-[var(--fuwari-text)] px-2 py-1.5 rounded-lg hover:bg-[var(--fuwari-bg-soft)]'
              >
                取消
              </button>
            </div>

            {/* Modal Results List */}
            <div className='p-2 max-h-[60vh] overflow-y-auto flex flex-col gap-1'>
              {loading ? (
                <div className='flex items-center justify-center py-10 text-[var(--fuwari-muted)] text-xs gap-2'>
                  <i className='fas fa-spinner animate-spin text-sm' />
                  <span>{locale?.COMMON?.LOADING || '加载中...'}</span>
                </div>
              ) : keyword.trim() === '' ? (
                <div className='text-center py-12 text-[var(--fuwari-muted)] text-xs'>
                  输入关键词搜索文章
                </div>
              ) : results.length > 0 ? (
                <>
                  <div className='px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--fuwari-muted)] mb-1'>
                    {locale?.SEARCH?.RESULT_OF_SEARCH || '搜索结果'} ({filteredPosts.length})
                  </div>
                  {results.map((post, idx) => renderItem(post, idx, activeIndex === idx))}
                  {filteredPosts.length > 6 && (
                    <SmartLink
                      href={`/search/${encodeURIComponent(keyword)}`}
                      className='text-center text-xs text-[var(--fuwari-primary)] hover:underline pt-3 pb-2 border-t border-[var(--fuwari-border)] font-medium mt-2 block'
                    >
                      查看全部 {filteredPosts.length} 个结果 &raquo;
                    </SmartLink>
                  )}
                </>
              ) : (
                <div className='text-center py-12 text-[var(--fuwari-muted)] text-xs'>
                  没有找到相关文章
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default HeaderSearch
