import busuanzi from '@/lib/plugins/busuanzi'
import { useRouter } from 'next/router'
import { useGlobal } from '@/lib/global'
import { useEffect } from 'react'

let path = ''

const scheduleBusuanziFetch = () => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => busuanzi.fetch(), { timeout: 2000 })
    return
  }
  window.setTimeout(() => busuanzi.fetch(), 800)
}

export default function Busuanzi () {
  const { theme } = useGlobal()
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = url => {
      if (url !== path) {
        path = url
        scheduleBusuanziFetch()
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  // 更换主题时更新
  useEffect(() => {
    if (theme) {
      scheduleBusuanziFetch()
    }
  }, [theme])
  return null
}
