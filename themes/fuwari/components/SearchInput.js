import { useRouter } from 'next/router'
import { useImperativeHandle, useRef, useState } from 'react'
import { useGlobal } from '@/lib/global'

/**
 * 搜索输入框 - Fuwari 风格
 */
const SearchInput = props => {
  const { currentSearch, cRef, className } = props
  const [onLoading, setLoadingState] = useState(false)
  const router = useRouter()
  const searchInputRef = useRef()
  const { locale } = useGlobal()

  useImperativeHandle(cRef, () => {
    return {
      focus: () => {
        searchInputRef?.current?.focus()
      }
    }
  })

  const handleSearch = () => {
    const key = searchInputRef.current.value
    if (key && key !== '') {
      setLoadingState(true)
      router.push({ pathname: '/search/' + key }).then(r => {
        setLoadingState(false)
      })
    } else {
      router.push({ pathname: '/search' })
    }
  }

  const handleKeyUp = e => {
    if (e.keyCode === 13) {
      handleSearch()
    }
  }

  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      <div className='relative flex-1'>
        <input
          ref={searchInputRef}
          type='text'
          defaultValue={currentSearch || ''}
          className='w-full bg-[var(--fuwari-bg-soft)] text-[var(--fuwari-text)] px-4 py-3 rounded-xl outline-none border border-transparent focus:border-[var(--fuwari-primary)] transition-all'
          placeholder={locale?.NAV?.SEARCH || 'Search articles...'}
          onKeyUp={handleKeyUp}
        />
        <div className='absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2'>
            {onLoading ? (
                <i className='fas fa-spinner animate-spin text-[var(--fuwari-muted)]' />
            ) : (
                <button onClick={handleSearch} className='hover:text-[var(--fuwari-primary)] transition-colors'>
                    <i className='fas fa-search text-[var(--fuwari-muted)]' />
                </button>
            )}
        </div>
      </div>
    </div>
  )
}

export default SearchInput
