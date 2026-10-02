/* eslint-disable @next/next/no-img-element */
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { siteConfig } from '@/lib/config'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import PostList, { Pagination } from './components/PostList'
import SearchForm from './components/SearchForm'
import ThemeLink from './components/ThemeLink'
import Icon from './components/Icon'
import CoverImage from './components/CoverImage'
import CONFIG from './config'
import styles from './Theme.module.css'
import { themeColorStyle } from './color'

const Article = dynamic(() => import('./components/Article'))

function LayoutBase(props) {
  const router = useRouter()
  const home = router.pathname === '/' || router.pathname === '/page/[page]'
  const cover =
    siteConfig('VHASTRO_HOME_BANNER', '', CONFIG) ||
    props.siteInfo?.pageCover ||
    siteConfig('HOME_BANNER_IMAGE') ||
    '/bg_image.jpg'
  const title = props.siteInfo?.title || siteConfig('TITLE')
  return (
    <div id='theme-vhastro' className={styles.root} style={themeColorStyle()}>
      <Header customNav={props.customNav} customMenu={props.customMenu} />
      {home && (
        <section className={styles.hero} aria-label='站点介绍'>
          <CoverImage
            className={styles.heroImage}
            src={cover}
            alt=''
            fetchpriority='high'
          />
          <div className={styles.heroContent}>
            <img
              className={styles.heroAvatar}
              src={
                props.siteInfo?.icon || siteConfig('AVATAR') || '/avatar.svg'
              }
              alt=''
            />
            <h1>{title}</h1>
            <p>{props.siteInfo?.description || siteConfig('DESCRIPTION')}</p>
          </div>
        </section>
      )}
      <main className={`${styles.main} ${home ? styles.homeMain : ''}`}>
        <div className={styles.content}>{props.children}</div>
        <Sidebar {...props} />
      </main>
      <footer className={styles.footer}>
        <ThemeLink href='/'>{title}</ThemeLink>
        <p>Powered by NotionNext · vhAstro</p>
      </footer>
      <button
        type='button'
        className={styles.backTop}
        aria-label='返回顶部'
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches
              ? 'auto'
              : 'smooth'
          })
        }
      >
        <Icon name='up' />
      </button>
    </div>
  )
}

function LayoutPostList(props) {
  return (
    <>
      {(props.category || props.tag) && (
        <div className={styles.card}>
          <h1>{props.category || `#${props.tag}`}</h1>
        </div>
      )}
      <PostList posts={props.posts} />
      <Pagination page={props.page} postCount={props.postCount} />
    </>
  )
}
const LayoutIndex = LayoutPostList
const LayoutSlug = props => <Article key={props.post?.id} {...props} />

function LayoutSearch(props) {
  const router = useRouter()
  const keyword = props.keyword || router.query.s || ''
  return (
    <>
      <section className={styles.card}>
        <h1>{keyword ? `搜索：${keyword}` : '搜索文章'}</h1>
        <SearchForm keyword={keyword} />
        <p className={styles.muted}>
          {keyword
            ? `找到 ${props.postCount ?? props.posts?.length ?? 0} 篇文章`
            : '输入关键词，搜索站内文章。'}
        </p>
      </section>
      {keyword && <LayoutPostList {...props} />}
    </>
  )
}
function LayoutArchive({ archivePosts = {} }) {
  return (
    <section className={styles.card}>
      <h1>文章归档</h1>
      {Object.entries(archivePosts).map(([month, posts]) => (
        <section className={styles.archiveGroup} key={month}>
          <h2>{month}</h2>
          {posts.map(post => (
            <ThemeLink key={post.id} href={post.href || `/${post.slug}`}>
              <time>{post.publishDay}</time>
              <span>{post.title}</span>
            </ThemeLink>
          ))}
        </section>
      ))}
    </section>
  )
}
function Taxonomy({ options = [], title, prefix }) {
  return (
    <section className={styles.card}>
      <h1>{title}</h1>
      <div className={styles.tagCloud}>
        {options.map(item => (
          <ThemeLink
            key={item.name}
            href={`/${prefix}/${encodeURIComponent(item.name)}`}
          >
            {item.name} <span className={styles.count}>{item.count}</span>
          </ThemeLink>
        ))}
      </div>
      {!options.length && <p className={styles.muted}>暂无{title}</p>}
    </section>
  )
}
const LayoutCategoryIndex = props => (
  <Taxonomy
    options={props.categoryOptions}
    title='文章分类'
    prefix='category'
  />
)
const LayoutTagIndex = props => (
  <Taxonomy options={props.tagOptions} title='文章标签' prefix='tag' />
)
const Layout404 = () => (
  <section className={styles.card}>
    <h1>页面不存在</h1>
    <p>链接可能已更改，返回首页寻找文章。</p>
    <ThemeLink href='/'>返回首页</ThemeLink>
  </section>
)
const THEME_CONFIG = CONFIG
export {
  LayoutBase,
  LayoutIndex,
  LayoutPostList,
  LayoutSlug,
  LayoutSearch,
  LayoutArchive,
  LayoutCategoryIndex,
  LayoutTagIndex,
  Layout404,
  THEME_CONFIG
}
