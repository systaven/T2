
import { useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Container } from '../components/Container'
import { useConfig } from '../../../lib/config'
import { NotionRenderer } from 'react-notion-x'
import mediumZoom from 'medium-zoom'
import 'react-notion-x/src/styles.css'
import 'prismjs/themes/prism-tomorrow.css'
import 'katex/dist/katex.min.css'
import { Collection } from 'react-notion-x/build/third-party/collection'

// Mizuki Theme Components
import { PostHeader } from '../components/PostHeader'
import { PostFooter } from '../components/PostFooter'
import { TableOfContents } from '../components/TableOfContents'
import { Comments } from '../../../components/Comments'

const Code = dynamic(() => import('@/components/NotionCode'), { ssr: false })

/**
 * 文章详情页布局
 * @param {import('notion-next').ThemeProps} props
 * @returns {JSX.Element}
 */
export const LayoutPost = ({ post, prev, next, blockMap, fullWidth = false }) => {
  const BLOG = useConfig()
  const containerRef = useRef(null)
  const tocRef = useRef(null)

  useEffect(() => {
    // Image zoom functionality
    if (containerRef.current) {
      const zoom = mediumZoom(containerRef.current.querySelectorAll('img'), {
        background: 'rgba(0, 0, 0, 0.7)'
      })
      return () => zoom.detach()
    }
  }, [post])

  return (
    <Container
      title={post.title}
      description={post.summary}
      date={post.date?.start_date ? new Date(post.date.start_date) : new Date()}
      type="article"
      fullWidth={fullWidth}
    >
      <div className="w-full flex justify-center">
        <div className={`w-full max-w-5xl flex-grow`}>
          <PostHeader post={post} />

          <div className="relative flex justify-between">
            <article ref={containerRef} className="w-full md:w-3/4 max-w-full prose dark:prose-dark">
              {blockMap && (
                <NotionRenderer
                  recordMap={blockMap}
                  components={{ Collection, Code }}
                  mapPageUrl={slug => `${BLOG.PATH}/${slug}`}
                />
              )}
              <PostFooter post={post} prev={prev} next={next} />
            </article>

            <aside className="hidden md:block md:w-1/4 sticky top-16 self-start pl-8">
              <div ref={tocRef} className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                <TableOfContents blockMap={blockMap} />
              </div>
            </aside>
          </div>

          <div className="w-full md:w-3/4 mt-8">
            <Comments frontMatter={post} />
          </div>
        </div>
      </div>
    </Container>
  )
}
