import { loadExternalResource } from '@/lib/utils'
import { useEffect } from 'react'

/**
 * 加载滚动动画
 * 改从外部CDN读取
 * https://michalsnik.github.io/aos/
 */
export default function AOSAnimation() {
  const initAOS = () => {
    Promise.all([
      loadExternalResource('/js/aos.js', 'js'),
      loadExternalResource('/css/aos.css', 'css')
    ]).then(() => {
      if (window.AOS) {
        window.AOS.init({
          debounceDelay: 100,
          throttleDelay: 120,
          once: true
        })
      }
    })
  }

  return null
}
