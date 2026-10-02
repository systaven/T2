import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useGlobal } from '@/lib/global'
import { siteConfig } from '@/lib/config'
import { menuIcon, normalizeMenus, enabled } from '../utils'
import Icon from './Icon'
import ThemeLink from './ThemeLink'
import styles from '../Theme.module.css'

const AuthControls = dynamic(() => import('./AuthControls'), { ssr: false })
const SearchDialog = dynamic(() => import('./SearchDialog'), { ssr: false })

function MenuItem({ item }) {
  const label = (
    <>
      <Icon name={menuIcon(item.name, item.href)} />
      <span>{item.name}</span>
    </>
  )
  if (item.children.length)
    return (
      <details className={styles.dropdown}>
        <summary>{label}</summary>
        <div className={styles.submenu}>
          {item.href && <ThemeLink href={item.href}>{item.name}</ThemeLink>}
          {item.children.map(child => (
            <MenuItem key={child.id} item={child} />
          ))}
        </div>
      </details>
    )
  return (
    <ThemeLink href={item.href} target={item.target} className={styles.navLink}>
      {label}
    </ThemeLink>
  )
}

export default function Header({ customNav, customMenu }) {
  const router = useRouter()
  const { isDarkMode, toggleDarkMode } = useGlobal()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMounted, setSearchMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileToggle = useRef(null)
  const defaults = [
    { name: '归档', href: '/archive' },
    { name: '分类', href: '/category' },
    { name: '标签', href: '/tag' }
  ]
  const menus = normalizeMenus(
    enabled(siteConfig('CUSTOM_MENU')) && Array.isArray(customMenu)
      ? customMenu
      : [...defaults, ...(customNav || [])]
  )
  useEffect(() => {
    if (searchOpen) setSearchMounted(true)
  }, [searchOpen])
  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
  }, [router.asPath])
  useEffect(() => {
    if (!mobileOpen) return
    const dismiss = event => {
      if (
        !event.target.closest?.('#vhastro-mobile-menu') &&
        !mobileToggle.current?.contains(event.target)
      )
        setMobileOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('focusin', dismiss)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('focusin', dismiss)
    }
  }, [mobileOpen])
  useEffect(() => {
    const shortcut = event => {
      const editing =
        /input|textarea|select/i.test(event.target?.tagName || '') ||
        event.target?.isContentEditable
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !editing
      ) {
        event.preventDefault()
        setSearchOpen(value => !value)
      }
      if (event.key === 'Escape') {
        if (mobileToggle.current?.getAttribute('aria-expanded') === 'true') {
          setMobileOpen(false)
          mobileToggle.current.focus()
        }
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <ThemeLink href='/' className={styles.brand} aria-label='返回首页'>
            <Icon name='home' />
            <span>首页</span>
          </ThemeLink>
          <nav className={styles.desktopNav} aria-label='主导航'>
            {menus.map(item => (
              <MenuItem key={item.id} item={item} />
            ))}
          </nav>
          <div className={styles.tools}>
            <button
              className={styles.tool}
              type='button'
              aria-label='搜索文章'
              onClick={() => {
                setSearchMounted(true)
                setSearchOpen(true)
              }}
            >
              <Icon name='search' />
            </button>
            <button
              className={styles.tool}
              type='button'
              aria-label='切换暗色模式'
              aria-pressed={!!isDarkMode}
              onClick={toggleDarkMode}
            >
              <Icon name={isDarkMode ? 'sun' : 'moon'} />
            </button>
            <button
              className={`${styles.tool} ${styles.mobileToggle}`}
              ref={mobileToggle}
              type='button'
              aria-label='展开导航'
              aria-controls='vhastro-mobile-menu'
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(value => !value)}
            >
              <Icon name={mobileOpen ? 'close' : 'menu'} />
            </button>
            <AuthControls />
          </div>
          {mobileOpen && (
            <nav
              id='vhastro-mobile-menu'
              className={styles.mobileNav}
              aria-label='移动导航'
            >
              {menus.map(item => (
                <MenuItem key={item.id} item={item} />
              ))}
            </nav>
          )}
        </div>
      </header>
      {(searchMounted || searchOpen) && (
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      )}
    </>
  )
}
