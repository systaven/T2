import SmartLink from '@/components/SmartLink'
import { useState } from 'react'
import { getFuwariMenuLinks } from './menu'
import NotionIcon from './NotionIcon'

const MenuList = ({ locale, customNav, customMenu, mobile = false }) => {
  const [hoverSubId, setHoverSubId] = useState(null)
  const links = getFuwariMenuLinks({ locale, customNav, customMenu })
  if (!links.length) return null

  const displayLinks = mobile ? links.slice(0, 4) : links

  const isDesktopSubOpen = linkId => linkId != null && hoverSubId === linkId

  if (mobile) {
    return (
      <nav className='flex items-center justify-between text-sm text-[var(--fuwari-muted)]'>
        {displayLinks.map((link, index) => (
          <SmartLink
            key={link.id || `${link.href}-${index}`}
            href={link.href || '/'}
            className='px-3 py-1.5 rounded-lg font-semibold hover:bg-[var(--fuwari-bg-soft)] transition-colors'>
            <NotionIcon icon={link.icon} className='w-4 h-4' />
            {link.name || link.title}
          </SmartLink>
        ))}
      </nav>
    )
  }

  return (
    <nav className='hidden md:flex items-center justify-center gap-0.5 text-[14px] text-[var(--fuwari-muted)]'>
      {displayLinks.map((link, index) => (
        <div
          key={link.id || `${link.href}-${index}`}
          className='relative group'
          onMouseEnter={() => setHoverSubId(link.id)}
          onMouseLeave={() => setHoverSubId(null)}>
          {!link.subMenus?.length && link.href ? (
            <SmartLink
              href={link.href}
              className='px-4 py-2 rounded-xl font-bold hover:bg-[var(--fuwari-bg-soft)] hover:text-[var(--fuwari-primary)] transition-all active:scale-95 flex items-center'>
              <NotionIcon icon={link.icon} className='w-4 h-4' />
              {link.name || link.title}
            </SmartLink>
          ) : (
            <div
              className={`px-4 py-2 rounded-xl font-bold hover:bg-[var(--fuwari-bg-soft)] hover:text-[var(--fuwari-primary)] select-none transition-all active:scale-95 ${
                link.subMenus?.length ? 'cursor-pointer' : 'cursor-default'
              }`}
              role={link.subMenus?.length ? 'button' : undefined}
              tabIndex={link.subMenus?.length ? 0 : undefined}
              aria-expanded={
                link.subMenus?.length ? isDesktopSubOpen(link.id) : undefined
              }>
              <div className='flex items-center'>
                <NotionIcon icon={link.icon} className='w-4 h-4' />
                {link.name || link.title}
                {!!link.subMenus?.length && (
                  <i className={`fas fa-chevron-down ml-1.5 text-[10px] transition-transform duration-300 ${isDesktopSubOpen(link.id) ? 'rotate-180' : ''}`} aria-hidden />
                )}
              </div>
            </div>
          )}

          {!!link.subMenus?.length && (
            <div
              className={`${isDesktopSubOpen(link.id) ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 -translate-y-2'} absolute left-0 top-full pt-2 min-w-[12rem] transition-all duration-300 ease-out z-50`}>
              {/* Bridge to prevent closing when moving mouse to menu */}
              <div className='absolute -top-4 left-0 w-full h-4' />
              
              <ul className='fuwari-card !rounded-2xl p-1.5 shadow-2xl border-black/5 dark:border-white/10 bg-[var(--fuwari-surface)]'>
                {link.subMenus.map(sub => (
                  <li key={sub.id || sub.href}>
                    <SmartLink
                      href={sub.href}
                      target={sub.target}
                      className='flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-[var(--fuwari-bg-soft)] hover:text-[var(--fuwari-primary)] text-[13px] text-[var(--fuwari-text)] font-medium transition-colors'>
                      <div className='flex items-center'>
                        <NotionIcon icon={sub.icon} className='w-3.5 h-3.5 mr-2' />
                        <span>{sub.name}</span>
                      </div>
                      {sub.target === '_blank' && (
                        <i className='fas fa-external-link-alt text-[10px] opacity-30' />
                      )}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

export default MenuList
