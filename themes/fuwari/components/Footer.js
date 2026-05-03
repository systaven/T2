import { siteConfig } from '@/lib/config'
import { BeiAnGongAn } from '@/components/BeiAnGongAn'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const since = parseInt(siteConfig('SINCE') || currentYear, 10)
  const copyrightDate = since < currentYear ? `${since}-${currentYear}` : `${currentYear}`
  const author = siteConfig('AUTHOR') || siteConfig('TITLE') || 'NotionNext'
  const version = siteConfig('VERSION') || ''
  const BEI_AN = siteConfig('BEI_AN')
  const BEI_AN_LINK = siteConfig('BEI_AN_LINK')

  return (
    <footer className='fuwari-footer py-6 text-center text-sm text-[var(--fuwari-muted)]'>
      <div className='max-w-6xl mx-auto px-4'>
        <p>
          <i className='far fa-copyright mr-1' />
          {copyrightDate} {author}. All Rights Reserved.
        </p>
        <p className='mt-1'>
          Powered by{' '}
          <a
            href='https://github.com/tangly1024/NotionNext'
            target='_blank'
            rel='noopener noreferrer'
            className='fuwari-link font-semibold'>
            NotionNext{version ? ` v${version}` : ''}
          </a>{' '}
          / Theme{' '}
          <span className='font-semibold text-[var(--fuwari-primary)]'>
            Fuwari
          </span>
        </p>

        {(BEI_AN || siteConfig('BEI_AN_GONGAN')) && (
          <p className='mt-2 flex flex-wrap justify-center items-center gap-x-2'>
            {BEI_AN && (
              <a href={BEI_AN_LINK} className='hover:text-[var(--fuwari-primary)] transition-colors'>
                <i className='fas fa-shield-alt mr-1' />
                {BEI_AN}
              </a>
            )}
            <BeiAnGongAn />
          </p>
        )}
      </div>
    </footer>
  )
}

export default Footer

