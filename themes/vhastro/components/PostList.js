/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/router'
import { siteConfig } from '@/lib/config'
import { pageNumbers, postHref } from '../utils'
import ThemeLink from './ThemeLink'
import CoverImage from './CoverImage'
import styles from '../Theme.module.css'

export function Pagination({ page = 1, postCount = 0 }) {
  const router = useRouter()
  const current = Number(page) || 1
  const total = Math.ceil(
    postCount / Math.max(1, Number(siteConfig('POSTS_PER_PAGE', 12)) || 12)
  )
  if (total <= 1) return null
  const prefix = router.asPath
    .split(/[?#]/)[0]
    .replace(/\/page\/\d+\/?$/, '')
    .replace(/\/$/, '')
  const href = n => (n === 1 ? `${prefix}/` : `${prefix}/page/${n}`)
  return (
    <nav className={styles.pagination} aria-label='文章分页'>
      {current > 1 && (
        <ThemeLink href={href(current - 1)} aria-label='上一页'>
          ‹
        </ThemeLink>
      )}
      {pageNumbers(current, total).map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`}>…</span>
        ) : (
          <ThemeLink
            key={n}
            href={href(n)}
            aria-current={n === current ? 'page' : undefined}
          >
            {n}
          </ThemeLink>
        )
      )}
      {current < total && (
        <ThemeLink href={href(current + 1)} aria-label='下一页'>
          ›
        </ThemeLink>
      )}
    </nav>
  )
}

export default function PostList({ posts = [] }) {
  if (!posts.length)
    return (
      <div className={styles.card}>
        <h2>暂无文章</h2>
        <p className={styles.muted}>试试其他关键词，或返回首页浏览。</p>
        <ThemeLink href='/'>返回首页</ThemeLink>
      </div>
    )
  return (
    <div className={styles.postGrid} id='post-list-container'>
      {posts.map(post => {
        const category = Array.isArray(post.category)
          ? post.category[0]
          : post.category
        const cover = post.pageCoverThumbnail || post.pageCover
        return (
          <article className={styles.postCard} key={post.id}>
            <ThemeLink
              href={postHref(post)}
              className={styles.cover}
              aria-label={`阅读 ${post.title}`}
            >
              <CoverImage
                src={cover}
                alt=''
                loading='lazy'
                decoding='async'
                fallback={
                  <div className={styles.coverFallback}>
                    <span>{category || '文章'}</span>
                  </div>
                }
              />
              {post.isTop && <span className={styles.pin}>置顶</span>}
            </ThemeLink>
            <div className={styles.postBody}>
              <div className={styles.postMeta}>
                {category ? (
                  <ThemeLink href={`/category/${encodeURIComponent(category)}`}>
                    {category}
                  </ThemeLink>
                ) : (
                  <span>文章</span>
                )}
                <time>{post.publishDay}</time>
              </div>
              <h2>
                <ThemeLink href={postHref(post)}>{post.title}</ThemeLink>
              </h2>
              <p className={styles.excerpt}>
                {post.summary || '打开文章，阅读完整内容。'}
              </p>
              <div className={styles.tags}>
                {(post.tags || []).map(tag => (
                  <ThemeLink key={tag} href={`/tag/${encodeURIComponent(tag)}`}>
                    #{tag}
                  </ThemeLink>
                ))}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
