import Link from 'next/link'
import Masonry from 'react-masonry-css'
import { PhotoSlider } from 'react-photo-view'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  ExternalLink,
  RotateCw,
  Search,
  RefreshCw
} from 'react-feather'
import { WALLPAPER_SOURCES } from '@/lib/wallpapers/constants'
import styles from './WallpaperWall.module.css'

function WallpaperCard({ item, index, open, failed, download, downloading }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <article className={styles.card}>
      <button
        type='button'
        className={`${styles.imageButton} ${loaded ? styles.loaded : ''}`}
        onClick={() => open(index)}
        aria-label={`预览 ${item.title}`}
        style={{ aspectRatio: `${item.width} / ${item.height}` }}
      >
        {/* The artwork proxy already provides thumbnails; avoid double image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.preview}
          alt={item.title}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding='async'
          onLoad={() => setLoaded(true)}
          onError={() => failed(item.id)}
        />
        <span className={styles.imageHint}>查看大图</span>
        {item.rank && <span className={styles.rank}>#{item.rank}</span>}
      </button>
      <div className={styles.caption}>
        <a
          href={item.artworkUrl}
          target='_blank'
          rel='noopener noreferrer'
          className={styles.title}
          title={item.title}
        >
          {item.title}
        </a>
        <div className={styles.byline}>
          <a href={item.authorUrl} target='_blank' rel='noopener noreferrer'>
            {item.author}
          </a>
          <button
            type='button'
            onClick={() => void download(item)}
            disabled={Boolean(downloading)}
            className={styles.iconButton}
            aria-label={`下载 ${item.title}`}
            title='下载原图'
          >
            {downloading === item.id ? '…' : <Download size={15} />}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function WallpaperWall() {
  const [items, setItems] = useState([])
  const [failedIds, setFailedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [meta, setMeta] = useState(null)
  const [orientation, setOrientation] = useState('all')
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)
  const [downloading, setDownloading] = useState('')
  const [downloadMessage, setDownloadMessage] = useState('')
  const page = useRef(0)
  const busy = useRef(false)
  const sentinel = useRef(null)

  const load = useCallback(async (reset = false) => {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setError('')
    const nextPage = reset ? 1 : page.current + 1
    try {
      const response = await fetch(`/api/wallpapers?page=${nextPage}`, {
        signal: AbortSignal.timeout(30000)
      })
      const body = await response.json()
      if (!response.ok)
        throw new Error(body.error || '图片暂时无法加载，请重试。')
      const batch = (body.items || []).map(item => ({
        ...item,
        batch: nextPage
      }))
      setItems(current => [
        ...new Map(
          (reset ? batch : [...current, ...batch]).map(item => [item.id, item])
        ).values()
      ])
      if (reset) setFailedIds(new Set())
      setEnabled(body.enabled !== false)
      setHasMore(Boolean(body.hasMore))
      setMeta(body)
      page.current = nextPage
    } catch (err) {
      setError(
        err.name === 'TimeoutError' || err.name === 'AbortError'
          ? '图片加载超时，请稍后重试。'
          : err.message
      )
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])
  useEffect(() => {
    if (!sentinel.current || loading || error || !hasMore || items.length === 0)
      return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) void load()
      },
      { rootMargin: '450px' }
    )
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [loading, error, hasMore, items.length, load])

  const filtered = useMemo(
    () =>
      items.filter(item => {
        if (failedIds.has(item.id)) return false
        if (orientation === 'landscape' && item.width <= item.height)
          return false
        if (orientation === 'portrait' && item.width > item.height) return false
        const keyword = search.trim().toLowerCase()
        return (
          !keyword ||
          `${item.title} ${item.author} ${item.tags.join(' ')}`
            .toLowerCase()
            .includes(keyword)
        )
      }),
    [items, failedIds, orientation, search]
  )
  const failed = useCallback(
    id => setFailedIds(current => new Set([...current, id])),
    []
  )
  const open = useCallback(value => {
    setIndex(value)
    setVisible(true)
  }, [])
  const selected = filtered[index]
  const download = async item => {
    if (downloading) return
    setDownloading(item.id)
    setDownloadMessage('正在准备原图…')
    try {
      const response = await fetch(
        `/api/wallpapers/download?page=${item.batch}&id=${encodeURIComponent(item.id)}`,
        { signal: AbortSignal.timeout(45000) }
      )
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || '下载失败，请稍后重试或查看原作。')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const extension =
        {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif'
        }[blob.type.split(';')[0]] || 'jpg'
      link.download = `pixiv-${item.id}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 10000)
      setDownloadMessage('原图已准备好，请查看浏览器下载列表。')
    } catch (err) {
      setDownloadMessage(err.message || '下载失败，请重试。')
    } finally {
      setDownloading('')
    }
  }

  return (
    <div className={styles.wall}>
      <header className={styles.header}>
        <div>
          <h1>
            壁纸墙<span aria-hidden='true'>✦</span>
          </h1>
          <p>把喜欢的画面，留在日常里。</p>
        </div>
        <Link href='/' className={styles.back}>
          返回博客
        </Link>
      </header>
      {!enabled ? (
        <div className={styles.message}>
          壁纸墙暂未开放。<Link href='/'>返回博客</Link>
        </div>
      ) : (
        <>
          {downloadMessage && (
            <p className={styles.notice} role='status'>
              {downloadMessage}
            </p>
          )}
          <div className={styles.toolbar}>
            <div className={styles.filters} role='group' aria-label='图片方向'>
              {[
                ['all', '全部'],
                ['landscape', '电脑壁纸'],
                ['portrait', '手机壁纸']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  aria-pressed={orientation === value}
                  onClick={() => {
                    setOrientation(value)
                    setVisible(false)
                  }}
                  className={orientation === value ? styles.active : ''}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className={styles.search}>
              <Search size={17} aria-hidden='true' />
              <input
                aria-label='搜索已加载的作品'
                placeholder='搜索标题、作者、标签'
                value={search}
                onChange={event => {
                  setSearch(event.target.value)
                  setVisible(false)
                }}
              />
              <span>{filtered.length}</span>
            </label>
          </div>
          <div className={styles.context}>
            <span>
              {meta ? WALLPAPER_SOURCES[meta.source] || '精选作品' : '精选作品'}
              {meta?.updatedAt &&
                ` · 更新于 ${new Date(meta.updatedAt).toLocaleDateString('zh-CN')}`}
            </span>
            <button
              type='button'
              disabled={loading}
              onClick={() => void load(true)}
            >
              <RefreshCw size={13} />
              重新加载
            </button>
          </div>
          {(meta?.stale || meta?.fallback) && (
            <p role='status' className={styles.notice}>
              {meta.stale
                ? '图片源暂时无法连接，正在展示上次保存的作品。'
                : '当前图片源暂不可用，已切换到备用精选。'}
            </p>
          )}
          <Masonry
            breakpointCols={{ default: 4, 1100: 3, 700: 2 }}
            className={styles.grid}
            columnClassName={styles.column}
          >
            {filtered.map((item, position) => (
              <WallpaperCard
                key={item.id}
                item={item}
                index={position}
                open={open}
                failed={failed}
                download={download}
                downloading={downloading}
              />
            ))}
          </Masonry>
          {loading && (
            <div
              className={styles.skeletons}
              aria-label='正在加载壁纸'
              role='status'
            >
              {Array.from({ length: items.length ? 4 : 8 }, (_, i) => (
                <div key={i} style={{ aspectRatio: i % 2 ? '3/4' : '4/5' }} />
              ))}
            </div>
          )}
          {error && (
            <div className={styles.message} role='alert'>
              <p>{error}</p>
              <button
                type='button'
                onClick={() => void load(page.current === 0)}
              >
                重试加载
              </button>
            </div>
          )}
          {!loading && !error && !filtered.length && (
            <div className={styles.message}>
              <p>
                {items.length
                  ? '没有匹配的作品，可以清空搜索或继续加载。'
                  : '暂时没有符合筛选条件的作品。'}
              </p>
              {(search || orientation !== 'all') && (
                <button
                  type='button'
                  onClick={() => {
                    setSearch('')
                    setOrientation('all')
                  }}
                >
                  清空筛选
                </button>
              )}
            </div>
          )}
          <div ref={sentinel} className={styles.loadMore}>
            {!loading &&
              !error &&
              (hasMore ? (
                <button type='button' onClick={() => void load()}>
                  加载更多作品
                </button>
              ) : (
                <span>今天的精选就到这里了</span>
              ))}
          </div>
          <footer className={styles.footer}>
            作品版权归原作者所有。点击作品标题可查看原作与作者信息。
          </footer>
        </>
      )}
      <PhotoSlider
        images={filtered.map(item => ({ src: item.original, key: item.id }))}
        visible={visible}
        index={Math.min(index, Math.max(0, filtered.length - 1))}
        onIndexChange={setIndex}
        onClose={() => setVisible(false)}
        maskOpacity={0.92}
        toolbarRender={({ rotate, onRotate }) => (
          <>
            <button
              type='button'
              className={styles.lightboxButton}
              onClick={() => onRotate(rotate + 90)}
              aria-label='旋转图片'
            >
              <RotateCw size={20} />
            </button>
            {selected && (
              <>
                <button
                  type='button'
                  disabled={Boolean(downloading)}
                  onClick={() => void download(selected)}
                  className={styles.lightboxButton}
                  aria-label='下载原图'
                >
                  {downloading ? '…' : <Download size={20} />}
                </button>
                <a
                  className={styles.lightboxButton}
                  href={selected.artworkUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='查看 Pixiv 原作'
                >
                  <ExternalLink size={20} />
                </a>
              </>
            )}
          </>
        )}
        overlayRender={() =>
          selected && (
            <div className={styles.lightboxCaption}>
              <a
                href={selected.artworkUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                {selected.title}
              </a>
              <span>{selected.author}</span>
              {downloadMessage && <span role='status'>{downloadMessage}</span>}
            </div>
          )
        }
      />
    </div>
  )
}
