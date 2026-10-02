/* eslint-disable @next/next/no-img-element */
import dynamic from 'next/dynamic'
import { useState } from 'react'
import NotionPage from '@/components/NotionPage'
import { siteConfig } from '@/lib/config'
import { commentsVisible, postHref } from '../utils'
import CONFIG from '../config'
import ThemeLink from './ThemeLink'
import Icon from './Icon'
import styles from '../Theme.module.css'
import ArticleLinks from './ArticleLinks'
import CoverImage from './CoverImage'

const Comment = dynamic(() => import('@/components/Comment'), { ssr: false })
const SignInGate = dynamic(() => import('./SignInGate'), { ssr: false })
const LinkPreview = dynamic(() => import('@/components/ArticleLinkPreview'), {
  ssr: false
})

function ArticleLock({ validPassword }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      if (!(await validPassword?.(password))) setError('密码不正确，请重试。')
    } catch {
      setError('验证失败，请重试。')
    }
  }
  return (
    <section className={styles.card}>
      <h1 className={styles.sectionHeading}>
        <Icon name='lock' />
        这篇文章已加密
      </h1>
      <form
        className={styles.searchForm}
        onSubmit={event => {
          void submit(event)
        }}
      >
        <label htmlFor='vhastro-password'>请输入访问密码</label>
        <div className={styles.searchRow}>
          <input
            id='vhastro-password'
            type='password'
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
            autoComplete='current-password'
          />
          <button type='submit'>解锁文章</button>
        </div>
        {error && <p role='alert'>{error}</p>}
      </form>
    </section>
  )
}

export default function Article({ post, lock, validPassword, prev, next }) {
  if (!post) return null
  if (lock) {
    return (
      <>
        {post.isPartialLock && (
          <section className={`${styles.card} ${styles.prose}`}>
            <NotionPage post={post} />
          </section>
        )}
        {post.lock_by_login || post.lockType === 'signin' ? (
          <section className={styles.card}>
            <h1>登录后继续阅读</h1>
            <SignInGate />
          </section>
        ) : (
          <ArticleLock validPassword={validPassword} />
        )}
      </>
    )
  }
  const cover = post.pageCover || post.pageCoverThumbnail
  return (
    <article className={`${styles.card} ${styles.article}`}>
      {cover && (
        <CoverImage
          className={styles.articleCover}
          src={cover}
          alt=''
          decoding='async'
        />
      )}
      <header className={styles.articleHeader}>
        <h1>{post.title}</h1>
        <div className={styles.articleMeta}>
          <Icon name='calendar' />
          <time>{post.publishDay}</time>
          {post.lastEditedDay && <span>更新于 {post.lastEditedDay}</span>}
        </div>
        <div className={styles.tags}>
          {(post.tags || []).map(tag => (
            <ThemeLink key={tag} href={`/tag/${encodeURIComponent(tag)}`}>
              #{tag}
            </ThemeLink>
          ))}
        </div>
      </header>
      <div id='article-wrapper' className={styles.prose}>
        <NotionPage post={post} />
      </div>
      <LinkPreview />
      {post.type === 'Post' && <ArticleLinks />}
      {post.type === 'Post' && (
        <div className={styles.articleEnd}>
          <p>作者：{siteConfig('AUTHOR')}</p>
          <p>转载请注明出处，并保留原文链接。</p>
          <div className={styles.adjacent}>
            {prev && (
              <ThemeLink href={postHref(prev)}>
                <small>上一篇</small>
                {prev.title}
              </ThemeLink>
            )}
            {next && (
              <ThemeLink href={postHref(next)}>
                <small>下一篇</small>
                {next.title}
              </ThemeLink>
            )}
          </div>
        </div>
      )}
      {commentsVisible(
        post,
        lock,
        siteConfig('VHASTRO_ARTICLE_COMMENT', true, CONFIG)
      ) && (
        <section aria-label='评论' className={styles.comments}>
          <h2>评论</h2>
          <Comment frontMatter={post} />
        </section>
      )}
    </article>
  )
}
