export const EMOJI_BASE = 'https://unpkg.com/@waline/emojis@1.4.0/bmoji'
export const yellowFaceUrl = name => `${EMOJI_BASE}/bmoji_${name}.png`
export const REACTION_FACES = {
  love: 'give_love',
  useful: 'thumb_up',
  thinking: 'hmm',
  surprised: 'wow',
  confused: 'what'
}
export const DEFAULT_EMOJI = {
  小黄脸: [
    ['silme', '微笑'],
    ['grin', '开心'],
    ['haha', '大笑'],
    ['smile_cry', '笑哭'],
    ['blush', '害羞'],
    ['give_love', '喜欢'],
    ['thumb_up', '赞'],
    ['applaud', '鼓掌'],
    ['wow', '惊讶'],
    ['what', '疑惑'],
    ['hmm', '思考'],
    ['doge', '狗头'],
    ['onlooker', '围观'],
    ['comical', '滑稽'],
    ['wail', '哭泣'],
    ['sad', '难过'],
    ['angry', '生气'],
    ['shh', '嘘'],
    ['ok', '好的'],
    ['thanks', '感谢'],
    ['please', '拜托'],
    ['hug_together', '拥抱'],
    ['bye', '再见'],
    ['sleeply', '困了']
  ].map(
    ([name, label]) => `<img src="${yellowFaceUrl(name)}" alt="${label}" />`
  )
}

export const gravatarUrl = hash =>
  `https://www.gravatar.com/avatar/${/^[a-f0-9]{64}$/i.test(hash || '') ? hash : '0'.repeat(64)}?s=80&d=mp&r=g`

export const guestAvatarUrl = async email => {
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  if (!normalized || !globalThis.crypto?.subtle) return gravatarUrl('')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  )
  return gravatarUrl(
    Array.from(new Uint8Array(digest), value =>
      value.toString(16).padStart(2, '0')
    ).join('')
  )
}

export const publicCommentError = (message, status = 500) => {
  const text = String(message || '')
  // Public visitors should never see infrastructure names, paths or SDK errors.
  if (
    status >= 500 ||
    /clerk|appwrite|turnstile|altcha|schema|attribute|database|api[ _-]?key|unauthorized|\/admin|missing scope/i.test(
      text
    )
  )
    return '评论暂时无法加载，请稍后重试。'
  return text || '操作没有完成，请重试。'
}
