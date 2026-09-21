export const COMMENT_TABLES = {
  comments: 'native_comments',
  likes: 'native_comment_likes',
  reactions: 'native_article_reactions',
  settings: 'native_comment_settings'
}

export const REACTIONS = [
  { id: 'love', label: '喜欢', emoji: '🥰' },
  { id: 'useful', label: '有用', emoji: '💡' },
  { id: 'thinking', label: '思考', emoji: '🤔' },
  { id: 'surprised', label: '惊讶', emoji: '😮' },
  { id: 'confused', label: '疑惑', emoji: '🫠' }
]

export const DEFAULT_COMMENT_SETTINGS = {
  enabled: true,
  pageSize: 30,
  maxCommentLength: 5000,
  guestEditMinutes: 30,
  rateLimitSeconds: 0,
  moderationMode: 'direct',
  emojiDataUrl: '',
  turnstile: {
    enabled: false,
    siteKey: '',
    secretKey: ''
  },
  imageUpload: {
    enabled: false,
    endpoint: '',
    token: '',
    strategyId: '',
    albumId: '',
    maxSizeMb: 5
  },
  notifications: {
    adminEmail: '',
    notifyAdmin: true,
    notifyReplies: true,
    smtp: {
      enabled: false,
      host: '',
      port: 465,
      secure: true,
      user: '',
      password: '',
      fromName: '',
      fromEmail: ''
    },
    resend: {
      enabled: false,
      apiKey: '',
      from: ''
    },
    serverchan: { enabled: false, token: '' },
    pushplus: { enabled: false, token: '' },
    telegram: { enabled: false, botToken: '', chatId: '' },
    bark: { enabled: false, endpoint: '' },
    feishu: { enabled: false, webhook: '' },
    dingtalk: { enabled: false, webhook: '' },
    wecom: { enabled: false, webhook: '' },
    webhook: { enabled: false, url: '', bearerToken: '' }
  }
}

const mergeObject = (base, value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base
  return Object.fromEntries(
    Object.entries(base).map(([key, fallback]) => [
      key,
      fallback && typeof fallback === 'object' && !Array.isArray(fallback)
        ? mergeObject(fallback, value[key])
        : (value[key] ?? fallback)
    ])
  )
}

export const normalizeCommentSettings = value =>
  mergeObject(DEFAULT_COMMENT_SETTINGS, value)

export const publicCommentSettings = settings => ({
  enabled: settings.enabled,
  pageSize: settings.pageSize,
  maxCommentLength: settings.maxCommentLength,
  guestEditMinutes: settings.guestEditMinutes,
  moderationMode: settings.moderationMode,
  emojiDataUrl: settings.emojiDataUrl,
  turnstile: {
    enabled: settings.turnstile.enabled,
    siteKey: settings.turnstile.siteKey
  },
  imageUpload: {
    enabled: settings.imageUpload.enabled,
    maxSizeMb: settings.imageUpload.maxSizeMb
  },
  reactions: REACTIONS
})

export const maskSecret = value => {
  if (!value) return ''
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`
}
