import {
  DEFAULT_COMMENT_SETTINGS,
  normalizeCommentSettings,
  publicCommentSettings
} from '@/lib/comments/constants'

describe('native comment settings', () => {
  test('merges partial settings without exposing secrets publicly', () => {
    const settings = normalizeCommentSettings({
      pageSize: 12,
      turnstile: { enabled: true, siteKey: 'site', secretKey: 'secret' },
      imageUpload: { enabled: true, token: 'private-token' }
    })
    const publicSettings = publicCommentSettings(settings)

    expect(publicSettings.pageSize).toBe(12)
    expect(publicSettings.turnstile).toEqual({ enabled: true, siteKey: 'site' })
    expect(publicSettings.imageUpload.token).toBeUndefined()
    expect(JSON.stringify(publicSettings)).not.toContain('secret')
    expect(JSON.stringify(publicSettings)).not.toContain('private-token')
  })

  test('defaults to direct guest publishing without a rate-limit read', () => {
    expect(DEFAULT_COMMENT_SETTINGS.moderationMode).toBe('direct')
    expect(DEFAULT_COMMENT_SETTINGS.rateLimitSeconds).toBe(0)
    expect(DEFAULT_COMMENT_SETTINGS.turnstile.enabled).toBe(false)
  })
})
