import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Article from '@/themes/vhastro/components/Article'
import Sidebar from '@/themes/vhastro/components/Sidebar'

jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback) => (key === 'AUTHOR' ? '作者' : fallback)
}))
jest.mock('@/components/NotionPage', () => ({
  __esModule: true,
  default: () => (
    <div data-testid='notion-content' id='notion-article'>
      正文
    </div>
  )
}))
jest.mock('next/dynamic', () => loader => {
  if (loader.toString().includes('components/Comment'))
    return () => <div data-testid='comments'>评论</div>
  return () => null
})

const post = {
  id: 'a',
  type: 'Post',
  title: '测试文章',
  slug: 'test',
  tags: []
}

test('locked articles expose neither content nor comments', async () => {
  const validPassword = jest.fn().mockReturnValue(false)
  render(<Article post={post} lock validPassword={validPassword} />)
  expect(screen.queryByTestId('notion-content')).not.toBeInTheDocument()
  expect(screen.queryByTestId('comments')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('请输入访问密码'), {
    target: { value: 'wrong' }
  })
  fireEvent.click(screen.getByRole('button', { name: '解锁文章' }))
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('密码不正确')
  )
  expect(validPassword).toHaveBeenCalledWith('wrong')
})

test('Notion Hide prevents mounting the entire comment component', () => {
  render(<Article post={{ ...post, comment: 'Hide' }} />)
  expect(screen.getByTestId('notion-content')).toBeInTheDocument()
  expect(screen.queryByTestId('comments')).not.toBeInTheDocument()
})

test('login-protected pages do not ask for an unrelated password', () => {
  render(<Article post={{ ...post, lock_by_login: true }} lock />)
  expect(
    screen.getByRole('heading', { name: '登录后继续阅读' })
  ).toBeInTheDocument()
  expect(screen.queryByLabelText('请输入访问密码')).not.toBeInTheDocument()
  expect(screen.queryByTestId('notion-content')).not.toBeInTheDocument()
  expect(screen.queryByTestId('comments')).not.toBeInTheDocument()
})

test('normal articles mount native comment entry point', () => {
  render(<Article post={post} />)
  expect(screen.getByTestId('comments')).toBeInTheDocument()
})

test('sidebar never repeats the page children slot', () => {
  render(
    <Sidebar>
      <div>这段正文不应出现在侧栏</div>
    </Sidebar>
  )
  expect(screen.queryByText('这段正文不应出现在侧栏')).not.toBeInTheDocument()
})
