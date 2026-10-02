import { useEffect, useState } from 'react'
import styles from '../Theme.module.css'

export default function Toc({ postId }) {
  const [items, setItems] = useState([])
  const [active, setActive] = useState('')
  useEffect(() => {
    let signature = ''
    let frame = 0
    const root = document.getElementById('theme-vhastro')
    const update = () => {
      const headings = Array.from(
        root?.querySelectorAll('#notion-article .notion-h[data-id]') || []
      )
      const next = headings.map(element => ({
        id: element.dataset.id,
        text: element.textContent.trim(),
        level: element.classList.contains('notion-h3')
          ? 2
          : element.classList.contains('notion-h2')
            ? 1
            : 0
      }))
      const nextSignature = JSON.stringify(next)
      if (signature !== nextSignature) {
        signature = nextSignature
        setItems(next)
      }
      const current =
        headings
          .filter(element => element.getBoundingClientRect().top <= 130)
          .at(-1) || headings[0]
      setActive(current?.dataset.id || '')
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    const observer = new MutationObserver(schedule)
    if (root) observer.observe(root, { childList: true, subtree: true })
    window.addEventListener('scroll', schedule, { passive: true })
    schedule()
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      cancelAnimationFrame(frame)
    }
  }, [postId])
  if (!items.length) return null
  return (
    <section className={`${styles.card} ${styles.toc}`}>
      <h2 className={styles.sectionHeading}>文章目录</h2>
      <nav aria-label='文章目录'>
        {items.map(item => (
          <a
            key={item.id}
            href={`#${item.id}`}
            style={{ paddingLeft: `${item.level * 14}px` }}
            aria-current={active === item.id ? 'location' : undefined}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </section>
  )
}
