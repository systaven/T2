/** @jest-environment node */
const mockGetRow = jest.fn()
jest.mock('sanitize-html', () => jest.fn())
jest.mock('marked', () => ({ marked: { parse: jest.fn() } }))
jest.mock('@/lib/admin/server', () => ({
  getAdminDb: () => ({ getRow: mockGetRow }),
  getAdminConfig: () => ({ databaseId: 'selected' }),
  getClerkEmail: jest.fn()
}))
jest.mock('@clerk/nextjs/server', () => ({ clerkClient: jest.fn(), getAuth: jest.fn() }))
const { readCommentSettings } = require('@/lib/comments/server')
test('a connection failure is surfaced instead of silently using default comment settings', async () => {
  mockGetRow.mockRejectedValue(Object.assign(new Error('offline'), { code: 503 }))
  await expect(readCommentSettings({ fresh: true })).rejects.toThrow('offline')
})
test('a missing table is surfaced for initialization instead of hiding its absence', async () => {
  mockGetRow.mockRejectedValue(Object.assign(new Error('missing table'), { code: 404, type: 'table_not_found' }))
  await expect(readCommentSettings({ fresh: true })).rejects.toThrow('missing table')
})
test('an absent settings row uses the established defaults', async () => {
  mockGetRow.mockRejectedValue(Object.assign(new Error('missing row'), { code: 404, type: 'row_not_found' }))
  await expect(readCommentSettings({ fresh: true })).resolves.toMatchObject({ enabled: true })
})
