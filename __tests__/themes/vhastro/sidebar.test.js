import { render, screen } from '@testing-library/react'
import Sidebar from '@/themes/vhastro/components/Sidebar'
import { LayoutBase } from '@/themes/vhastro'
import CONFIG from '@/themes/vhastro/config'

let mockThemeConfig = {}
let mockOverrides = {}
jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback, extend = {}) =>
    mockOverrides[key] ??
    mockThemeConfig[key] ??
    extend[key] ??
    (key === 'MUSIC_PLAYER' ? false : fallback)
}))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ isDarkMode: false, toggleDarkMode: jest.fn() })
}))
jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/', asPath: '/?theme=vhastro', query: {} })
}))
jest.mock('next/dynamic', () => loader => {
  if (loader.toString().includes('MusicPlayer'))
    return () => <div data-testid='music-engine'>音乐组件</div>
  if (loader.toString().includes('DailyQuote'))
    return () => <div data-testid='daily-quote'>一言</div>
  if (loader.toString().includes('./Toc'))
    return () => <section data-testid='article-toc'>文章目录</section>
  return () => null
})

test('article table of contents follows every sidebar widget and is absent for locked articles', () => {
  mockOverrides = { MUSIC_PLAYER: true }
  const { rerender } = render(<Sidebar post={{ id: 'article' }} />)
  const sidebar = screen.getByRole('complementary')
  expect(sidebar.lastElementChild).toBe(screen.getByTestId('article-toc'))
  expect(screen.getByTestId('music-engine')).toBeInTheDocument()
  rerender(<Sidebar post={{ id: 'article' }} lock />)
  expect(screen.queryByTestId('article-toc')).not.toBeInTheDocument()
})

beforeEach(() => {
  mockThemeConfig = {}
  mockOverrides = {}
})

test('music stays mounted when Fuwari configuration is replaced by vhastro during navigation', () => {
  mockThemeConfig = { MUSIC_PLAYER: true }
  const { rerender } = render(<Sidebar />)
  const engine = screen.getByTestId('music-engine')
  mockThemeConfig = CONFIG
  rerender(<Sidebar post={{ id: 'article-a' }} />)
  expect(screen.getByTestId('music-engine')).toBe(engine)
  rerender(<Sidebar post={{ id: 'article-b' }} />)
  expect(screen.getByTestId('music-engine')).toBe(engine)
})

test('explicit music and quote switches remain respected', () => {
  mockOverrides = { MUSIC_PLAYER: 'false', VHASTRO_HITOKOTO: false }
  const { rerender } = render(<Sidebar />)
  expect(screen.queryByTestId('music-engine')).not.toBeInTheDocument()
  expect(screen.queryByTestId('daily-quote')).not.toBeInTheDocument()
  mockOverrides = { VHASTRO_MUSIC: false }
  rerender(<Sidebar />)
  expect(screen.queryByTestId('music-engine')).not.toBeInTheDocument()
  expect(screen.getByTestId('daily-quote')).toBeInTheDocument()
})

test('sidebar position is configurable and invalid values keep the right layout', () => {
  mockOverrides = { VHASTRO_SIDEBAR_POSITION: 'left' }
  const { rerender } = render(<LayoutBase>正文</LayoutBase>)
  expect(screen.getByRole('main')).toHaveAttribute(
    'data-sidebar-position',
    'left'
  )
  mockOverrides = { VHASTRO_SIDEBAR_POSITION: 'invalid' }
  rerender(<LayoutBase>正文</LayoutBase>)
  expect(screen.getByRole('main')).toHaveAttribute(
    'data-sidebar-position',
    'right'
  )
})
