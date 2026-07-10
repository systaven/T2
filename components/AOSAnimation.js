import { loadExternalResource } from '@/lib/utils'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
// import AOS from 'aos'

const refreshAOS = () => {
  if (!window.AOS) return

  if (window.AOS.refreshHard) {
    window.AOS.refreshHard()
  } else if (window.AOS.refresh) {
    window.AOS.refresh()
  }
}

/**
 * 加载滚动动画
 * 改从外部CDN读取
 * https://michalsnik.github.io/aos/
 */
export default function AOSAnimation() {
  const router = useRouter()
  const initAOS = () => {
    Promise.all([
      loadExternalResource('/js/aos.js', 'js'),
      loadExternalResource('/css/aos.css', 'css')
    ]).then(() => {
      if (window.AOS) {
        window.AOS.init()
      }
    })
  }

  useEffect(() => {
    const handleRouteChangeComplete = () => {
      window.requestAnimationFrame(refreshAOS)
    }

    router.events.on('routeChangeComplete', handleRouteChangeComplete)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
    }
  }, [router.events])

  return null
}
