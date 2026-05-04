import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { loadExternalResource } from '@/lib/utils'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import CONFIG from '../config'
import WavesArea from './WavesArea'

const HeroBanner = (props) => {
  const { siteInfo, allNavPages } = props
  const router = useRouter()
  const typedInstance = useRef(null)

  useEffect(() => {
    const title2 = siteConfig('HEO_HERO_TITLE_2', null, CONFIG)
    const title3 = siteConfig('HEO_HERO_TITLE_3', null, CONFIG)
    const greetings = siteConfig('GREETING_WORDS', '', CONFIG)?.split(',') || []
    
    // 优先使用 HEO 标题组合，如果没有则使用全局欢迎语
    // 注意：打字机至少需要两个不同的字符串才能体现循环打出的过程
    let rawStrings = (title2 || title3) 
      ? [`${title2 || ''} ${title3 || ''}`.trim()]
      : greetings
    
    // 如果只有一个字符串，我们添加一个微小的差异字符串以产生循环效果
    const strings = rawStrings.length === 1 
      ? [rawStrings[0], rawStrings[0] + ' '] 
      : rawStrings

    if (strings.length > 0 && window && document.getElementById('fuwari-typed')) {
      loadExternalResource('/js/typed.min.js', 'js').then(() => {
        if (window.Typed) {
          if (typedInstance.current) {
            typedInstance.current.destroy()
          }
          typedInstance.current = new window.Typed('#fuwari-typed', {
            strings: strings,
            typeSpeed: 70,   // 更自然的打字速度
            backSpeed: 40,   // 更自然的删除速度
            backDelay: 5000, // 打完后停顿较长时间，方便阅读
            startDelay: 500, // 初始停顿
            showCursor: true,
            smartBackspace: true,
            loop: true
          })
        }
      })
    }

    return () => {
      if (typedInstance.current) {
        typedInstance.current.destroy()
      }
    }
  }, [])

  if (!siteConfig('FUWARI_HERO_ENABLE', true, CONFIG)) return null

  /**
   * 随机跳转文章
   */
  function handleClickBanner() {
    if (!allNavPages || allNavPages.length === 0) return
    const randomIndex = Math.floor(Math.random() * allNavPages.length)
    const randomPost = allNavPages[randomIndex]
    router.push(`${siteConfig('SUB_PATH', '')}/${randomPost?.slug}`)
  }

  const cover =
    siteInfo?.pageCover ||
    siteConfig('FUWARI_HERO_BG_IMAGE', '', CONFIG) ||
    siteConfig('HOME_BANNER_IMAGE')

  const title1 = siteConfig('HEO_HERO_TITLE_1', null, CONFIG)
  const title2 = siteConfig('HEO_HERO_TITLE_2', null, CONFIG)
  const title3 = siteConfig('HEO_HERO_TITLE_3', null, CONFIG)
  const title4 = siteConfig('HEO_HERO_TITLE_4', null, CONFIG)
  const title5 = siteConfig('HEO_HERO_TITLE_5', null, CONFIG)
  const heroStyle = siteConfig('FUWARI_HERO_STYLE', 'banner', CONFIG)

  return (
    <section className={`fuwari-hero mb-4 overflow-hidden hero-${heroStyle}`}>
      {cover && (
        <div
          className='fuwari-hero-bg'
          style={{ backgroundImage: `url(${cover})` }}
        />
      )}
      <div className='fuwari-hero-mask' />

      <div className='max-w-6xl mx-auto px-6 h-full flex flex-col justify-center relative z-10 text-white'>
        <div className='space-y-2 animate-fuwari-enter'>
          {title1 && <div className='text-sm font-medium opacity-80'>{title1}</div>}
          {(title2 || title3) && (
            <h1 className='text-4xl md:text-5xl font-bold tracking-tight min-h-[1.2em]'>
              {/* SEO 备选文字，对用户不可见 */}
              <span className='sr-only'>{title2} {title3}</span>
              {/* 动态打字区域，初始为空以确保从“打出”开始 */}
              <span id='fuwari-typed'></span>
            </h1>
          )}
          {title4 && title5 && (
             <div onClick={handleClickBanner} className='cursor-pointer inline-flex items-center gap-2 mt-4 fuwari-hero-btn transition-transform hover:scale-105'>
               <span>{title4}</span>
               <span className='opacity-70'>{title5}</span>
               <i className='fas fa-arrow-right text-xs' />
             </div>
          )}
        </div>
      </div>

      {siteConfig('FUWARI_HERO_CREDIT_TEXT', '', CONFIG) && (
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

