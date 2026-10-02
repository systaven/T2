import { webcrypto, createHash } from 'node:crypto'
import { TextEncoder } from 'node:util'
import {
  guestAvatarUrl,
  publicCommentError,
  DEFAULT_EMOJI
} from '@/lib/comments/presentation'
import { mapCommentRow, commentApiError } from '@/lib/comments/server'
jest.mock('@clerk/nextjs/server', () => ({
  clerkClient: {},
  getAuth: jest.fn()
}))
jest.mock('@/lib/admin/server', () => ({
  getAdminConfig: jest.fn(),
  getAdminDb: jest.fn(),
  getClerkEmail: jest.fn()
}))
jest.mock('marked', () => ({ marked: { parse: value => value } }))
// These tests cover avatar serialization and error boundaries, not HTML parsing.
jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: value => value
}))

test('guest avatar hashes trimmed lowercase email with SHA-256 without publishing the email', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const encoder = globalThis.TextEncoder
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto
  })
  globalThis.TextEncoder = TextEncoder
  try {
    const url = await guestAvatarUrl(' Visitor@Example.com ')
    expect(url).toContain(
      createHash('sha256').update('visitor@example.com').digest('hex')
    )
    expect(url).not.toContain('visitor@example.com')
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor)
    globalThis.TextEncoder = encoder
  }
})

test('old guest comments get avatars on read without exposing private data', () => {
  const row = mapCommentRow({
    authorType: 'guest',
    authorEmail: 'Visitor@example.com',
    content: 'hello'
  })
  expect(row.authorAvatar).toContain(
    createHash('sha256').update('visitor@example.com').digest('hex')
  )
  expect(row.authorEmail).toBeUndefined()
  expect(
    mapCommentRow({
      authorType: 'clerk',
      authorAvatar: 'https://example.com/avatar.png'
    }).authorAvatar
  ).toBe('https://example.com/avatar.png')
})

test('only user-actionable errors pass through to the public response', () => {
  expect(publicCommentError('请填写昵称。', 400)).toBe('请填写昵称。')
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    commentApiError(res, {
      code: 500,
      message: 'Appwrite missing scopes: databases.read'
    })
    expect(res.json).toHaveBeenCalledWith({
      error: '评论暂时无法加载，请稍后重试。'
    })
  } finally {
    spy.mockRestore()
  }
})

test('default picker uses curated community images instead of system emojis', () => {
  expect(DEFAULT_EMOJI.小黄脸).toHaveLength(24)
  expect(
    DEFAULT_EMOJI.小黄脸.every(item =>
      item.includes('@waline/emojis@1.4.0/bmoji/')
    )
  ).toBe(true)
})
