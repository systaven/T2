/* eslint-disable @next/next/no-img-element */
import { siteConfig } from '@/lib/config'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { enabled } from '../utils'
import CONFIG from '../config'
import ThemeLink from './ThemeLink'
import Icon from './Icon'
import styles from '../Theme.module.css'

const Toc = dynamic(() => import('./Toc'), { ssr: false })

// Reuse the repaired audio engine, not Fuwari's layout or global stylesheet.
const MusicPlayer = dynamic(
  () => import('@/themes/fuwari/components/MusicPlayer'),
  { ssr: false }
)

function LazyMusic() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!window.IntersectionObserver) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className={styles.music}>
      {visible ? <MusicPlayer /> : <p className={styles.muted}>音乐播放器</p>}
    </div>
  )
}

export default function Sidebar({
  categoryOptions = [],
  tagOptions = [],
  postCount = 0,
  siteInfo,
  post,
  lock
}) {
  const avatar = siteInfo?.icon || siteConfig('AVATAR') || '/avatar.svg'
  const author = siteConfig('AUTHOR') || siteInfo?.title || siteConfig('TITLE')
  return (
    <aside className={styles.sidebar} aria-label='站点侧栏'>
      {post && !lock && <Toc postId={post.id} />}
      <section className={`${styles.card} ${styles.profile}`}>
        <img
          className={styles.profileAvatar}
          src={avatar}
          alt={author || '站点头像'}
          loading='lazy'
        />
        <h2>{author}</h2>
        <p className={styles.muted}>
          {siteInfo?.description || siteConfig('DESCRIPTION')}
        </p>
        <div className={styles.stats}>
          <ThemeLink href='/archive'>
            <strong>{postCount}</strong>
            <span>文章</span>
          </ThemeLink>
          <ThemeLink href='/category'>
            <strong>{categoryOptions.length}</strong>
            <span>分类</span>
          </ThemeLink>
          <ThemeLink href='/tag'>
            <strong>{tagOptions.length}</strong>
            <span>标签</span>
          </ThemeLink>
        </div>
      </section>
      {categoryOptions.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.sectionHeading}>
            <Icon name='archive' />
            文章分类
          </h2>
          <div className={styles.categoryList}>
            {categoryOptions.map(item => (
              <ThemeLink
                key={item.name}
                href={`/category/${encodeURIComponent(item.name)}`}
              >
                <span>{item.name}</span>
                <span className={styles.count}>{item.count}</span>
              </ThemeLink>
            ))}
          </div>
        </section>
      )}
      {tagOptions.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.sectionHeading}>
            <Icon name='tags' />
            文章标签
          </h2>
          <div className={styles.tagCloud}>
            {tagOptions.map(item => (
              <ThemeLink
                key={item.name}
                href={`/tag/${encodeURIComponent(item.name)}`}
              >
                {item.name}
              </ThemeLink>
            ))}
          </div>
        </section>
      )}
      {enabled(siteConfig('VHASTRO_MUSIC', true, CONFIG)) &&
        enabled(siteConfig('MUSIC_PLAYER', false)) && <LazyMusic />}
    </aside>
  )
}
