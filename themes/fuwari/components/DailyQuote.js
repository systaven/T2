import { useEffect, useState } from 'react'

const DAILY_QUOTES = [
  { text: '把今天过好，明天会在路上相见。', from: '本站寄语' },
  { text: '慢一点也没关系，持续前进就很好。', from: '本站寄语' },
  { text: '愿每一次阅读，都带来一点新的发现。', from: '本站寄语' },
  { text: '心有所向，日子便有光。', from: '本站寄语' },
  { text: '记录生活，也收藏每一个认真生活的瞬间。', from: '本站寄语' }
]

/**
 * 一言组件 - 适配 Fuwari 主题
 * @returns
 */
const DailyQuote = () => {
  const [quote, setQuote] = useState('加载中...')
  const [meta, setMeta] = useState('')

  useEffect(() => {
    const day = Math.floor(Date.now() / 86_400_000)
    const current = DAILY_QUOTES[day % DAILY_QUOTES.length]
    setQuote(current.text)
    setMeta(`— ${current.from}`)
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
