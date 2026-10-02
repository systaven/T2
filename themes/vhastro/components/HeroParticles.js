import { useEffect, useRef, useState } from 'react'
import styles from '../Theme.module.css'

// Stable placement keeps the server and browser markup identical.
const particles = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: `${4 + ((i * 7) % 15)}px`,
  duration: `${14 + (i % 11)}s`,
  delay: `${-((i * 13) % 25)}s`,
  drift: `${((i * 19) % 100) - 50}px`
}))

export default function HeroParticles() {
  const element = useRef(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    let visible = true
    const update = () => setActive(visible && !document.hidden)
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            update()
          })
        : null
    if (element.current) observer?.observe(element.current)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return (
    <div
      ref={element}
      className={styles.particles}
      aria-hidden='true'
      data-paused={!active}
    >
      {particles.map((particle, i) => (
        <span
          key={i}
          style={{
            left: particle.left,
            '--particle-size': particle.size,
            '--particle-duration': particle.duration,
            '--particle-delay': particle.delay,
            '--particle-drift': particle.drift
          }}
        />
      ))}
    </div>
  )
}
