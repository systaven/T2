const CACHE_KEY = 'vhastro_hitokoto_daily'
let pending = null

function normalize(value) {
  if (!value || typeof value.hitokoto !== 'string' || !value.hitokoto.trim())
    throw new Error('一言内容为空')
  return {
    text: value.hitokoto.slice(0, 2000),
    source: [value.from, value.from_who]
      .filter(value => typeof value === 'string' && value.trim())
      .map(value => value.slice(0, 200))
      .join(' · ')
  }
}

// Shared in-flight request and daily local cache survive internal page navigation.
export function loadDailyQuote() {
  const day = new Date().toISOString().slice(0, 10)
  let storage
  try {
    storage = window.localStorage
    const cached = JSON.parse(storage.getItem(CACHE_KEY) || 'null')
    if (cached?.day === day) return Promise.resolve(normalize(cached.data))
  } catch {
    // Storage may be blocked or contain an old malformed entry.
  }
  if (pending?.day === day) return pending.promise
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  const promise = (async () => {
    try {
      const response = await fetch('https://v1.hitokoto.cn/?encode=json', {
        signal: controller.signal
      })
      if (!response.ok) throw new Error('一言服务暂时不可用')
      const data = await response.json()
      const quote = normalize(data)
      try {
        storage?.setItem(CACHE_KEY, JSON.stringify({ day, data }))
      } catch {
        // A valid response can still be displayed without persistent storage.
      }
      return quote
    } finally {
      clearTimeout(timeout)
      if (pending?.promise === promise) pending = null
    }
  })()
  pending = { day, promise }
  return promise
}
