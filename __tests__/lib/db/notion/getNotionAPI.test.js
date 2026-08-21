describe('getNotionAPI', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.API_BASE_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('sets the current Notion API host and User-Agent for notion-client', async () => {
    const NotionAPI = jest.fn().mockImplementation(() => ({
      getPage: jest.fn().mockResolvedValue({})
    }))
    jest.doMock('notion-client', () => ({ NotionAPI }))

    const notionAPI = require('@/lib/db/notion/getNotionAPI').default
    await notionAPI.getPage('page-id')

    expect(NotionAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiBaseUrl: expect.stringMatching(/\/api\/v3$/),
        ofetchOptions: {
          headers: {
            'User-Agent': 'NotionNext (+https://github.com/NotionNext/NotionNext)'
          }
        }
      })
    )
  })

  it('exposes getSignedFileUrls, delegating to the underlying notion-client instance', async () => {
    const getSignedFileUrls = jest.fn().mockResolvedValue({ signedUrls: ['https://example.com/f'] })
    const NotionAPI = jest.fn().mockImplementation(() => ({ getSignedFileUrls }))
    jest.doMock('notion-client', () => ({ NotionAPI }))

    const notionAPI = require('@/lib/db/notion/getNotionAPI').default
    const result = await notionAPI.getSignedFileUrls([{ url: 'attachment:a:b.html' }])

    expect(getSignedFileUrls).toHaveBeenCalledWith([{ url: 'attachment:a:b.html' }])
    expect(result).toEqual({ signedUrls: ['https://example.com/f'] })
  })
})
