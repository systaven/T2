import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import MenuList from './MenuList'
import MobileNav from './MobileNav'
import ThemeColorSwitch from './ThemeColorSwitch'
import WallpaperSwitch from './WallpaperSwitch'
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import CONFIG from '../config'

const Header = ({ locale, customNav, customMenu, searchModal, siteInfo }) => {
  const router = useRouter()
  const { isDarkMode, toggleDarkMode } = useGlobal()
  const [showPalette, setShowPalette] = useState(false)
  const panelRef = useRef(null)
  const algoliaEnabled = Boolean(siteConfig('ALGOLIA_APP_ID'))
  const paletteFixed = siteConfig('FUWARI_THEME_COLOR_FIXED', false)
  const threeColumns = siteConfig('FUWARI_LAYOUT_THREE_COLUMNS', true, CONFIG)

  const handleSearch = () => {
    if (algoliaEnabled) {
      searchModal?.current?.openSearch()
      return
    }
    router.push('/search')
  }

  useEffect(() => {
    const onClickOutside = e => {
      if (!showPalette) return
      if (e.target.closest?.('[data-fuwari-palette-trigger]')) return
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPalette(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showPalette])

  return (
    <header className={`${threeColumns ? 'max-w-7xl' : 'max-w-6xl'} mx-auto px-4 pt-0 pb-3 sticky top-0 z-40`}>
      <div className='fuwari-card fuwari-navbar relative px-4 py-2.5 flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]'>
        <SmartLink href='/' className='text-[1.35rem] md:text-[1.45rem] font-bold fuwari-title-gradient text-left flex items-center shrink-0'>
          {siteInfo?.icon && (
             <img src={siteInfo.icon} className='w-7 h-7 mr-2.5 object-contain rounded-lg' alt='logo' />
          )}
          {siteConfig('TITLE')}
        </SmartLink>
        <MenuList locale={locale} customNav={customNav} customMenu={customMenu} />
        <div className='hidden md:flex items-center justify-end gap-2 relative'>
          {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && (
            <div className='flex items-center'>
              <SignedOut>
                <SignInButton mode='modal'>
                   <button className='fuwari-tool-btn' title='Login'>
                     <i className='fas fa-user' />
                   </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className='w-8 h-8 flex items-center justify-center'>
                   <UserButton afterSignOutUrl='/' />
                </div>
              </SignedIn>
            </div>
          )}
          {algoliaEnabled ? (
            <button type='button' onClick={handleSearch} className='fuwari-tool-btn'>
              <i className='fas fa-search' />
            </button>
          ) : (
            <SmartLink href='/search' className='fuwari-tool-btn' title={locale?.NAV?.SEARCH}>
              <i className='fas fa-search' />
            </SmartLink>
          )}
          {!paletteFixed && (
            <button
              type='button'
              data-fuwari-palette-trigger
              onClick={() => setShowPalette(v => !v)}
              className='fuwari-tool-btn'>
              <i className='fas fa-palette' />
            </button>
          )}
          <WallpaperSwitch />
          <button type='button' onClick={toggleDarkMode} className='fuwari-tool-btn'>
            {isDarkMode ? '☀' : '☾'}
          </button>
        </div>
        <div className='md:hidden flex items-center justify-end gap-2 relative'>
          {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && (
            <div className='flex items-center'>
              <SignedOut>
                <SignInButton mode='modal'>
                   <button className='fuwari-tool-btn' title='Login'>
                     <i className='fas fa-user' />
                   </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className='w-8 h-8 flex items-center justify-center'>
                   <UserButton afterSignOutUrl='/' />
                </div>
              </SignedIn>
            </div>
          )}
          {algoliaEnabled ? (
            <button type='button' onClick={handleSearch} className='fuwari-tool-btn'>
              <i className='fas fa-search' />
            </button>
          ) : (
            <SmartLink href='/search' className='fuwari-tool-btn' title={locale?.NAV?.SEARCH}>
              <i className='fas fa-search' />
            </SmartLink>
          )}
          {!paletteFixed && (
            <button
              type='button'
              data-fuwari-palette-trigger
              onClick={() => setShowPalette(v => !v)}
              className='fuwari-tool-btn'>
              <i className='fas fa-palette' />
            </button>
          )}
          <WallpaperSwitch />
          <button type='button' onClick={toggleDarkMode} className='fuwari-tool-btn'>
            {isDarkMode ? '☀' : '☾'}
          </button>
          <MobileNav locale={locale} customNav={customNav} customMenu={customMenu} />
        </div>
        {showPalette && !paletteFixed && (
          <div
            ref={panelRef}
            className='fuwari-card absolute right-3 md:right-4 top-12 p-0 w-[min(20rem,calc(100vw-2rem))] md:w-80 z-50'>
            <ThemeColorSwitch />
          </div>
        )}
      </div>
    </header>
  )
}

export default Header

