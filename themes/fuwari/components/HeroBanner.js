import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useRouter } from 'next/router'
import { useEffect, useState, useMemo } from 'react'
import CONFIG from '../config'
import WavesArea from './WavesArea'

const HeroBanner = (props) => {
  const { siteInfo, allNavPages, post } = props
  const router = useRouter()
  const isPostPage = !!post

  // 获取打字机相关配置
  const speed = Number(siteConfig('FUWARI_HERO_TYPEWRITER_SPEED', 100, CONFIG))
  const deleteSpeed = Number(siteConfig('FUWARI_HERO_TYPEWRITER_DELETE_SPEED', 50, CONFIG))
  const pauseTime = Number(siteConfig('FUWARI_HERO_TYPEWRITER_PAUSE_TIME', 2000, CONFIG))

  // 整理所有待循环打印的字符串
  const strings = useMemo(() => {
    const title2 = siteConfig('HEO_HERO_TITLE_2', null, CONFIG)
    const title3 = siteConfig('HEO_HERO_TITLE_3', null, CONFIG)
    const greetings = siteConfig('GREETING_WORDS', '', CONFIG)
      ?.split(',')
      ?.map(s => s.trim())
      ?.filter(Boolean) || []

    let rawStrings = (title2 || title3)
      ? [`${title2 || ''} ${title3 || ''}`.trim()]
      : greetings

    return rawStrings
  }, [])

  // 纯 React 状态机实现的打字机动画（移除了外部 typed.js 脚本依赖，完全与 Astro Mizuki 对齐）
  const [displayText, setDisplayText] = useState('')

  useEffect(() => {
    if (isPostPage) {
      setDisplayText('')
      return
    }
    if (strings.length === 0) return

    let textIndex = 0
    let charIndex = 0
    let isDeleting = false
    let timeoutId = null

    const type = () => {
      const currentText = strings[textIndex] || ''

      if (isDeleting) {
        // 删除字符
        if (charIndex > 0) {
          charIndex--
          setDisplayText(currentText.substring(0, charIndex))
          timeoutId = setTimeout(type, deleteSpeed)
        } else {
          // 删除完成，切换到下一条文本
          isDeleting = false
          textIndex = (textIndex + 1) % strings.length
          timeoutId = setTimeout(type, speed)
        }
      } else {
        // 打印字符
        if (charIndex < currentText.length) {
          charIndex++
          setDisplayText(currentText.substring(0, charIndex))
          timeoutId = setTimeout(type, speed)
        } else {
          // 打印完成，暂停一段时间后开始删除（仅在有多条文本时触发）
          if (strings.length > 1) {
            isDeleting = true
            timeoutId = setTimeout(type, pauseTime)
          }
        }
      }
    }

    type()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [strings, isPostPage, speed, deleteSpeed, pauseTime])

  if (!siteConfig('FUWARI_HERO_ENABLE', true, CONFIG)) return null

  // 整理当前页面所需的背景图片
  const cover = isPostPage
    ? (post.pageCover || post.pageCoverThumbnail || siteConfig('FUWARI_HERO_BG_IMAGE', '', CONFIG) || siteConfig('HOME_BANNER_IMAGE'))
    : (siteInfo?.pageCover || siteConfig('FUWARI_HERO_BG_IMAGE', '', CONFIG) || siteConfig('HOME_BANNER_IMAGE'))

  // 背景图片平滑淡入淡出（实现类似 Astro Mizuki 路由切换时的横幅渐变过渡效果，双层交替以彻底解决二次切换无动画或闪现的 bug）
  const [bgImage1, setBgImage1] = useState(cover)
  const [bgImage2, setBgImage2] = useState('')
  const [showImage2, setShowImage2] = useState(false)

  useEffect(() => {
    if (showImage2) {
      if (cover !== bgImage2) {
        setBgImage1(cover)
        setShowImage2(false)
      }
    } else {
      if (cover !== bgImage1) {
        setBgImage2(cover)
        setShowImage2(true)
      }
    }
  }, [cover])

  const displayTitle1 = isPostPage
    ? (post.category || '文章详情')
    : siteConfig('HEO_HERO_TITLE_1', null, CONFIG)

  const title2 = siteConfig('HEO_HERO_TITLE_2', null, CONFIG)
  const title3 = siteConfig('HEO_HERO_TITLE_3', null, CONFIG)
  const title4 = siteConfig('HEO_HERO_TITLE_4', null, CONFIG)
  const title5 = siteConfig('HEO_HERO_TITLE_5', null, CONFIG)
  const heroStyle = siteConfig('FUWARI_HERO_STYLE', 'banner', CONFIG)

  return (
    <section className={`fuwari-hero mb-4 overflow-hidden hero-${heroStyle}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .fuwari-typewriter-cursor {
          animation: fuwari-blink 0.9s infinite;
          margin-left: 4px;
          font-weight: 300;
          opacity: 0.9;
        }
        @keyframes fuwari-blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}} />

      {/* 背景图片容器 - 双层交替以支持渐变切换 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {bgImage1 && (
          <div
            className='fuwari-hero-bg transition-opacity duration-1000 ease-in-out absolute inset-0'
            style={{ 
              backgroundImage: `url(${bgImage1})`,
              opacity: showImage2 ? 0 : 1
            }}
          />
        )}
        {bgImage2 && (
          <div
            className='fuwari-hero-bg transition-opacity duration-1000 ease-in-out absolute inset-0'
            style={{ 
              backgroundImage: `url(${bgImage2})`,
              opacity: showImage2 ? 1 : 0
            }}
          />
        )}
      </div>

      <div className='max-w-6xl mx-auto px-6 h-full flex flex-col justify-center items-center text-center relative z-10 text-white'>
        <div className='space-y-2 animate-fuwari-enter flex flex-col items-center justify-center w-full pt-10 md:pt-16'>
          {displayTitle1 && <div className='text-sm font-bold opacity-90 text-center'>{displayTitle1}</div>}
          {isPostPage ? (
            <h1 className='text-3xl md:text-4xl font-extrabold tracking-tight text-center'>
              {post.title}
            </h1>
          ) : (
            (title2 || title3 || strings.length > 0) && (
              <h1 className='text-4xl md:text-5xl font-extrabold tracking-tight min-h-[1.2em] flex items-center justify-center flex-wrap text-center'>
                <span className='sr-only'>{title2} {title3}</span>
                <span>{displayText}</span>
                <span className='fuwari-typewriter-cursor'>|</span>
              </h1>
            )
          )}
        </div>
      </div>

      {!isPostPage && siteConfig('FUWARI_HERO_CREDIT_TEXT', '', CONFIG) && (
        <div className='max-w-6xl mx-auto px-4 relative z-[3]'>
          <SmartLink
            href={siteConfig('FUWARI_HERO_CREDIT_LINK', '#', CONFIG)}
            className='fuwari-hero-credit'
            target='_blank'
            rel='noopener noreferrer'>
            © {siteConfig('FUWARI_HERO_CREDIT_TEXT', '', CONFIG)}
          </SmartLink>
        </div>
      )}

      {siteConfig('FUWARI_HERO_WAVES', true, CONFIG) && <WavesArea />}
    </section>
  )
}

export default HeroBanner
