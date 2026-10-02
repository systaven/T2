import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { previewHref } from '../utils'
import styles from '../Theme.module.css'

export default function SearchForm({ keyword = '', onComplete, inputRef }) {
  const router = useRouter()
  const [value, setValue] = useState(keyword)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setValue(keyword)
  }, [keyword])
  async function submit(event) {
    event.preventDefault()
    if (!value.trim() || pending) return
    setPending(true)
    setError('')
    try {
      const navigated = await router.push(
        previewHref(
          `/search/${encodeURIComponent(value.trim())}`,
          router.asPath
        )
      )
      if (navigated) onComplete?.()
    } catch (e) {
      if (!e.cancelled) setError('搜索页面未能载入，请重试。')
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      onSubmit={event => {
        void submit(event)
      }}
      className={styles.searchForm}
      role='search'
    >
      <label className={styles.srOnly} htmlFor='vhastro-search-input'>
        搜索文章
      </label>
      <div className={styles.searchRow}>
        <input
          id='vhastro-search-input'
          ref={inputRef}
          type='search'
          placeholder='搜索文章，按回车查看结果…'
          value={value}
          onChange={event => setValue(event.target.value)}
          required
          maxLength={200}
        />
        <button type='submit' disabled={pending || !value.trim()}>
          {pending ? '搜索中…' : '搜索'}
        </button>
      </div>
      {error && <p role='alert'>{error}</p>}
    </form>
  )
}
