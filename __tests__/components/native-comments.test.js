import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import NativeComments from '@/components/NativeComments'
import { REACTIONS } from '@/lib/comments/constants'
let mockUser = null
let mockLoaded = true
const mockGetToken = jest.fn().mockResolvedValue(null)
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ isLoaded: mockLoaded, user: mockUser }),
  useAuth: () => ({ getToken: mockGetToken })
}))
const originalFetch = global.fetch
let commentError = null
let verificationEnabled = false
const originalTurnstile = window.turnstile
beforeEach(() => {
  mockUser = null
  mockLoaded = true
  mockGetToken.mockReset().mockResolvedValue(null)
  commentError = null
  verificationEnabled = false
  window.turnstile = originalTurnstile
  localStorage.clear()
  global.fetch = jest.fn(async (url, options = {}) => {
    if (String(url).includes('/config'))
      return {
        ok: true,
        json: async () => ({
          data: {
            enabled: true,
            maxCommentLength: 5000,
            reactions: REACTIONS,
            turnstile: { enabled: verificationEnabled, siteKey: 'test-site' }
          }
        })
      }
    if (String(url).includes('/reactions'))
      return { ok: true, json: async () => ({ counts: {}, selected: null }) }
    if (options.method === 'POST')
      return { ok: true, json: async () => ({ pending: false }) }
    return {
      ok: !commentError,
      status: commentError ? 503 : 200,
      json: async () =>
        commentError ? { error: commentError } : { data: [], total: 0 }
    }
  })
})

test('public discussion loads while identity is pending without requesting a token', async () => {
  const originalKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-key'
  mockLoaded = false
  mockGetToken.mockImplementation(() => new Promise(() => {}))
  try {
    render(<NativeComments frontMatter={{ id: 'post' }} />)
    await screen.findByRole('textbox', { name: '昵称' })
    expect(mockGetToken).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '发布评论' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '喜欢 0' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '正在确认登录状态'
    )
    expect(
      global.fetch.mock.calls.some(([, options]) => options?.method === 'PUT')
    ).toBe(false)
  } finally {
    if (originalKey === undefined)
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalKey
  }
})
afterAll(() => {
  global.fetch = originalFetch
  window.turnstile = originalTurnstile
})

test('verification failures give an actionable retry without automatic challenge loops', async () => {
  verificationEnabled = true
  let options
  window.turnstile = {
    render: jest.fn((_element, config) => {
      options = config
      return 'widget'
    }),
    remove: jest.fn(),
    reset: jest.fn()
  }
  render(<NativeComments frontMatter={{ id: 'post' }} />)
  await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledTimes(1))
  expect(options.retry).toBe('never')
  act(() => expect(options['error-callback']('110200')).toBe(true))
  expect(await screen.findByRole('alert')).toHaveTextContent('人机验证没有完成')
  fireEvent.click(screen.getByRole('button', { name: '重新验证' }))
  await waitFor(() => expect(window.turnstile.render).toHaveBeenCalledTimes(2))
  expect(window.turnstile.remove).toHaveBeenCalledWith('widget')
  act(() => options.callback('verified-token'))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('guest form has labelled fields, default avatar and image-based yellow faces', async () => {
  const { container } = render(<NativeComments frontMatter={{ id: 'post' }} />)
  await screen.findByRole('textbox', { name: '昵称' })
  expect(screen.getByRole('textbox', { name: '邮箱' })).toHaveAttribute(
    'type',
    'email'
  )
  expect(
    container.querySelector('img[src*="gravatar.com/avatar/"]')
  ).not.toBeNull()
  expect(container.querySelectorAll('img[src*="/bmoji/"]')).toHaveLength(5)
  fireEvent.click(screen.getByRole('button', { name: '选择表情' }))
  fireEvent.click(screen.getByRole('button', { name: '微笑' }))
  expect(screen.getByRole('textbox', { name: '评论内容' }).value).toContain(
    '/bmoji/bmoji_silme.png'
  )
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('public errors do not expose service names or schema details', async () => {
  commentError = 'Clerk Appwrite Invalid query: Attribute userId not found'
  render(<NativeComments frontMatter={{ id: 'post' }} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('请稍后重试')
  expect(document.body.textContent).not.toMatch(/Clerk|Appwrite|Attribute/)
})

test('successful publication retains its feedback after refreshing comments', async () => {
  render(<NativeComments frontMatter={{ id: 'post' }} />)
  fireEvent.change(await screen.findByRole('textbox', { name: '昵称' }), {
    target: { value: '访客' }
  })
  fireEvent.change(screen.getByRole('textbox', { name: '邮箱' }), {
    target: { value: 'visitor@example.com' }
  })
  fireEvent.change(screen.getByRole('textbox', { name: '评论内容' }), {
    target: { value: '测试留言' }
  })
  fireEvent.click(screen.getByRole('button', { name: '发布评论' }))
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('评论已发布')
  )
  expect(screen.getByRole('textbox', { name: '评论内容' })).toHaveValue('')
})
