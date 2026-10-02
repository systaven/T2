import { useEffect, useState } from 'react'
import { loadDailyQuote } from '../quote'
import styles from '../Theme.module.css'

export default function DailyQuote() {
  const [quote, setQuote] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setFailed(false)
    loadDailyQuote().then(
      value => {
        if (!cancelled) setQuote(value)
      },
      () => {
        if (!cancelled) setFailed(true)
      }
    )
    return () => {
      cancelled = true
    }
  }, [attempt])
  return (
    <section className={styles.card} aria-label='一言'>
      <h2 className={styles.sectionHeading}>一言</h2>
      {quote ? (
        <>
          <p className={styles.quoteText}>{quote.text}</p>
          {quote.source && (
            <p className={styles.quoteSource}>— {quote.source}</p>
          )}
        </>
      ) : (
        <p className={styles.muted} role='status'>
          {failed ? '一言暂时无法加载。' : '正在加载一言…'}
        </p>
      )}
      {failed && (
        <button
          type='button'
          className={styles.quoteRetry}
          onClick={() => setAttempt(value => value + 1)}
        >
          重试
        </button>
      )}
    </section>
  )
}
