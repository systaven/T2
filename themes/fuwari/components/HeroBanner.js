import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { loadExternalResource } from '@/lib/utils'
import { useEffect } from 'react'
import CONFIG from '../config'

const HeroBanner = ({ siteInfo }) => {
  useEffect(() => {
    const title2 = siteConfig('HEO_HERO_TITLE_2', null, CONFIG)
    const title3 = siteConfig('HEO_HERO_TITLE_3', null, CONFIG)
    const greetings = siteConfig('GREETING_WORDS', '', CONFIG)?.split(',') || []
    
    // 优先使用 HEO 标题组合，如果没有则使用全局欢迎语
    const strings = (title2 || title3) 
      ? [`${title2 || ''} ${title3 || ''}`.trim()]
      : greetings

    if (strings.length > 0 && window && document.getElementById('fuwari-typed')) {
      loadExternalResource('/js/typed.min.js', 'js').then(() => {
        if (window.Typed) {
          // eslint-disable-next-line no-new
          new window.Typed('#fuwari-typed', {
            strings: strings,
            typeSpeed: 100,
            backSpeed: 50,
            backDelay: 2000,
            showCursor: true,
            smartBackspace: true,
            loop: true
          })
        }
      })
    }
  }, [])

  if (!siteConfig('FUWARI_HERO_ENABLE', true, CONFIG)) return null

  const cover =
    siteInfo?.pageCover ||
    siteConfig('FUWARI_HERO_BG_IMAGE', '', CONFIG) ||
    siteConfig('HOME_BANNER_IMAGE')

  const title1 = siteConfig('HEO_HERO_TITLE_1', null, CONFIG)
  const title2 = siteConfig('HEO_HERO_TITLE_2', null, CONFIG)
  const title3 = siteConfig('HEO_HERO_TITLE_3', null, CONFIG)
  const title4 = siteConfig('HEO_HERO_TITLE_4', null, CONFIG)
  const title5 = siteConfig('HEO_HERO_TITLE_5', null, CONFIG)

  return (
    <section className='fuwari-hero mb-4 overflow-hidden'>
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
              <span id='fuwari-typed'>{title2} {title3}</span>
            </h1>
          )}
          {title4 && title5 && (
             <SmartLink href={siteConfig('HEO_HERO_TITLE_LINK', '/', CONFIG)} className='inline-flex items-center gap-2 mt-4 fuwari-hero-btn transition-transform hover:scale-105'>
               <span>{title4}</span>
               <span className='opacity-70'>{title5}</span>
               <i className='fas fa-arrow-right text-xs' />
             </SmartLink>
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
    </section>
  )
}

export default HeroBanner

