import { useEffect, useRef } from 'react'

export default function usePageMotion(element, router) {
  const animation = useRef(null)
  useEffect(() => {
    const node = element.current
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const animate = (frames, duration) => {
      animation.current?.cancel()
      if (!reduced?.matches && node?.animate)
        animation.current = node.animate(frames, {
          duration,
          easing: 'cubic-bezier(.22,1,.36,1)'
        })
    }
    const enter = () =>
      animate(
        [
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        280
      )
    const leave = (_url, options = {}) => {
      if (!options.shallow) animate([{ opacity: 1 }, { opacity: 0.55 }], 160)
    }
    const stop = () => animation.current?.cancel()
    enter()
    router.events?.on('routeChangeStart', leave)
    router.events?.on('routeChangeComplete', enter)
    router.events?.on('routeChangeError', stop)
    reduced?.addEventListener?.('change', stop)
    return () => {
      stop()
      router.events?.off('routeChangeStart', leave)
      router.events?.off('routeChangeComplete', enter)
      router.events?.off('routeChangeError', stop)
      reduced?.removeEventListener?.('change', stop)
    }
  }, [element, router.events])
}
