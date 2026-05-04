import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'
import AdCard from './AdCard'
import AnalyticsCard from './AnalyticsCard'
import ContactCard from './ContactCard'
import DailyQuote from './DailyQuote'
import PluginCard from './PluginCard'
import Toc from './Toc'
import ReadingProgress from './ReadingProgress'
import Calendar from './Calendar'
import MusicPlayer from './MusicPlayer'
import SmartLink from '@/components/SmartLink'

/**
 * Fuwari 三栏布局之 - 右侧栏
 */
const SidePanelRight = props => {
  const {
    latestPosts = [],
    categoryOptions = [],
    tagOptions = [],
    post,
    rightAreaSlot,
    postCount,
    allNavPages
  } = props
  const { locale } = useGlobal()

  const showToc =
    siteConfig('FUWARI_ARTICLE_TOC', true, CONFIG) &&
    post?.toc &&
    post.toc.length > 1

  return (
    <aside className='h-full space-y-4 pb-4'>
      {/* 最新文章 */}
      {siteConfig('FUWARI_WIDGET_LATEST_POSTS', true, CONFIG) && latestPosts.length > 0 && (
        <section className='fuwari-card p-5'>
          <h3 className='text-sm font-semibold mb-3 tracking-wide uppercase text-[var(--fuwari-muted)]'>
            {locale?.COMMON?.LATEST_POSTS || '最新发布'}
          </h3>
          <div className='space-y-2'>
            {latestPosts.slice(0, 6).map(p => (
              <SmartLink
                key={p.id}
                href={p.href || `/${p.slug}`}
                className='block text-sm leading-6 hover:text-[var(--fuwari-primary)]'>
                {p.title}
              </SmartLink>
            ))}
          </div>
        </section>
      )}

      <ContactCard />
      <AnalyticsCard
        postCount={postCount}
        categoryOptions={categoryOptions}
        tagOptions={tagOptions}
      />
      <AdCard />
      <PluginCard rightAreaSlot={rightAreaSlot} />

      {/* 粘性固定区域：目录 + 一言 + 日历 + 播放器 */}
      <div className='sticky top-24 space-y-4'>
        {showToc && (
          <section className='fuwari-card p-4'>
            <h3 className='text-sm font-semibold mb-3 px-3 tracking-wide uppercase text-[var(--fuwari-muted)]'>
              {locale?.ARTICLE?.TABLE_OF_CONTENT || '目录'}
            </h3>
            <ReadingProgress />
            <Toc toc={post.toc} />
          </section>
        )}
        {/* 一言挂件 */}
        <DailyQuote />
        <Calendar allNavPages={allNavPages} />
        <MusicPlayer />
      </div>
    </aside>
  )
}

export default SidePanelRight
