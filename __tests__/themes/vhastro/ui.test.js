import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Header from '@/themes/vhastro/components/Header'
import SearchForm from '@/themes/vhastro/components/SearchForm'
import PostList from '@/themes/vhastro/components/PostList'
import SearchDialog from '@/themes/vhastro/components/SearchDialog'

const mockPush = jest.fn()
const mockToggle = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({ asPath: '/?theme=vhastro', push: mockPush })
}))

test('animated search keeps accessible focus and unmounts after closing', async () => {
  const close = jest.fn()
  const { rerender } = render(<SearchDialog open onClose={close} />)
  expect(await screen.findByRole('dialog')).toHaveAccessibleName('搜索文章')
  await waitFor(() => expect(screen.getByRole('searchbox')).toHaveFocus())
  fireEvent.click(screen.getByRole('button', { name: '关闭搜索' }))
  expect(close).toHaveBeenCalled()
  rerender(<SearchDialog open={false} onClose={close} />)
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
})
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ isDarkMode: false, toggleDarkMode: mockToggle })
}))
jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback) => (key === 'CUSTOM_MENU' ? true : fallback)
}))
jest.mock('@/components/SmartLink', () => ({
  __esModule: true,
  default: ({ children, ...props }) => <a {...props}>{children}</a>
}))

test('keeps a single header and renders Notion navigation with working dark switch', () => {
  render(<Header customMenu={[{ name: '关于', href: '/about' }]} />)
  expect(screen.getAllByRole('banner')).toHaveLength(1)
  expect(screen.getByRole('link', { name: '关于' })).toHaveAttribute(
    'href',
    '/about?theme=vhastro'
  )
  fireEvent.click(screen.getByRole('button', { name: '切换暗色模式' }))
  expect(mockToggle).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: '展开导航' }))
  expect(
    screen.getByRole('navigation', { name: '移动导航' })
  ).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.getByRole('button', { name: '展开导航' })).toHaveFocus()
  expect(
    screen.queryByRole('navigation', { name: '移动导航' })
  ).not.toBeInTheDocument()
})

test('mobile navigation closes on outside click or keyboard focus leaving it', () => {
  render(<Header customMenu={[{ name: '关于', href: '/about' }]} />)
  const toggle = screen.getByRole('button', { name: '展开导航' })
  fireEvent.click(toggle)
  fireEvent.pointerDown(document.body)
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(toggle)
  fireEvent.focusIn(screen.getByRole('link', { name: '返回首页' }))
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('search navigates to existing search route and preserves theme', async () => {
  mockPush.mockResolvedValue(true)
  const done = jest.fn()
  render(<SearchForm onComplete={done} />)
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: '中文 & next' }
  })
  fireEvent.submit(screen.getByRole('search'))
  await waitFor(() => expect(done).toHaveBeenCalled())
  expect(mockPush).toHaveBeenCalledWith(
    '/search/%E4%B8%AD%E6%96%87%20%26%20next?theme=vhastro'
  )
})

test('search reports route failures and enables retry', async () => {
  mockPush.mockRejectedValue(new Error('network'))
  render(<SearchForm keyword='测试' />)
  fireEvent.submit(screen.getByRole('search'))
  expect(await screen.findByRole('alert')).toHaveTextContent('请重试')
  expect(screen.getByRole('button', { name: '搜索' })).toBeEnabled()
})

test('article cards support absent covers and array categories', () => {
  render(
    <PostList
      posts={[
        {
          id: 'a',
          slug: 'hello',
          title: '你好',
          category: ['随笔'],
          tags: ['记录']
        }
      ]}
    />
  )
  expect(screen.getByRole('heading', { name: '你好' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '你好' })).toHaveAttribute(
    'href',
    '/hello?theme=vhastro'
  )
  expect(screen.getByRole('link', { name: '#记录' })).toHaveAttribute(
    'href',
    '/tag/%E8%AE%B0%E5%BD%95?theme=vhastro'
  )
})
