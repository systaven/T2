import { useEffect, useState } from 'react'

/**
 * 一言组件 - 适配 Fuwari 主题
 * @returns
 */
const DailyQuote = () => {
  const [quote, setQuote] = useState('加载中...')
  const [meta, setMeta] = useState('')

  useEffect(() => {
    const API = 'https://v1.hitokoto.cn/?encode=json'
    const STORAGE_KEY = 'hitokoto_daily'
    const todayKey = new Date().toISOString().slice(0, 10)

    const render = (obj) => {
      if (!obj) {
        setQuote('获取一言失败。')
        setMeta('')
        return
      }
      const text = obj.hitokoto || obj.text || JSON.stringify(obj)
      const frm = obj.from ? (obj.from_who ? `${obj.from} — ${obj.from_who}` : obj.from) : (obj.creator || '')
      setQuote(text)
      setMeta(frm ? `— ${frm}` : '')
    }

    const saveToStorage = (data) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey, data }))
      } catch (e) {
        console.error('Failed to save to localStorage', e)
      }
    }

    const loadFromStorage = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (parsed && parsed.date === todayKey && parsed.data) return parsed.data
      } catch (e) {
        console.error('Failed to load from localStorage', e)
      }
      return null
    }

    const cached = loadFromStorage()
    if (cached) {
      render(cached)
      return
    }

    fetch(API)
      .then(resp => resp.json())
      .then(json => {
        render(json)
        saveToStorage(json)
      })
      .catch(err => {
        console.error(err)
        setQuote('无法加载今日一言，请稍后重试。')
        setMeta('')
      })
  }, [])

  return (
    <section className='fuwari-card p-5'>
      <div className='flex items-start gap-2 mb-2'>
        <i className='fas fa-quote-left text-[var(--fuwari-primary)] opacity-40 text-sm' />
        <p className='text-sm leading-6 text-[var(--fuwari-text)] font-medium'>
          {quote}
        </p>
      </div>
      {meta && (
        <p className='text-xs text-right text-[var(--fuwari-muted)] italic'>
          {meta}
        </p>
      )}
    </section>
  )
}

export default DailyQuote
