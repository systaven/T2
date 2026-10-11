import {
  decodeExternalUrl,
  validateExternalRedirectTarget
} from '@/lib/utils/externalLink'
import { siteConfig } from '@/lib/config'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { findShortLinkTarget } from '@/lib/shortLink/server'

const REDIRECT_DELAY_SECONDS = 2

const applyNoIndexHeaders = res => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
}

const getHostname = target => {
  try {
    return new URL(target).hostname
  } catch {
    return target
  }
}

export default function RedirectPage({ target, lookupFailed = false }) {
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_DELAY_SECONDS)

  useEffect(() => {
    if (lookupFailed) return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)
      const remaining = Math.max(0, REDIRECT_DELAY_SECONDS - elapsedSeconds)
      setSecondsLeft(remaining)

      if (remaining === 0) {
        window.clearInterval(timer)
        window.location.replace(target)
      }
    }, 200)

    return () => window.clearInterval(timer)
  }, [target, lookupFailed])

  if (lookupFailed) {
    return (
      <main className='flex min-h-screen items-center justify-center px-5'>
        <section role='alert' className='text-center'>
          <h1 className='text-xl font-semibold'>链接暂时无法加载</h1>
          <p className='mt-3'>请稍后重试。</p>
          <button type='button' className='mt-5 rounded-lg border px-4 py-2' onClick={() => window.location.reload()}>重试</button>
        </section>
      </main>
    )
  }

  const hostname = getHostname(target)

  return (
    <>
      <Head>
        <title>即将离开本站</title>
        <meta name='robots' content='noindex,nofollow,noarchive,nosnippet' />
      </Head>
      <main className='flex min-h-screen items-center justify-center bg-slate-50 px-5 text-slate-800 dark:bg-slate-950 dark:text-slate-100'>
        <section className='w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20'>
          <p className='mb-3 text-sm font-medium text-amber-600'>外部链接提醒</p>
          <h1 className='text-2xl font-semibold'>即将前往站外页面</h1>
          <p className='mt-4 break-all rounded-lg bg-slate-100 px-4 py-3 font-mono text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
            {hostname}
          </p>
          <p className='mt-5 leading-7 text-slate-600 dark:text-slate-300'>
            请注意财产安全，不要向陌生网站透露密码、验证码、身份证件或支付信息。
          </p>
          <div className='mt-7 flex flex-wrap items-center gap-3'>
            <a
              className='rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white'
              href={target}
              rel='noopener noreferrer nofollow external'
            >
              立即前往
            </a>
            <span className='text-sm text-slate-500 dark:text-slate-400'>
              {secondsLeft > 0 ? `${secondsLeft} 秒后自动跳转` : '正在跳转…'}
            </span>
          </div>
        </section>
      </main>
    </>
  )
}

// Do not wrap this safety notice in the blog theme's navigation or sidebars.
RedirectPage.isStandalonePage = true

export async function getServerSideProps(context) {
  const { params, res } = context
  applyNoIndexHeaders(res)

  const siteOrigin = siteConfig('LINK') || undefined
  const token = typeof params?.token === 'string' ? params.token : ''
  let target = null
  let lookupFailed = false

  try {
    target = await findShortLinkTarget(token)
  } catch (error) {
    // A temporary database issue must not break links published before this
    // feature. Those tokens can still be decoded below.
    console.warn('[short-link] Database lookup failed:', error?.message)
    lookupFailed = true
  }

  if (!target) {
    const legacyTarget = decodeExternalUrl(token)
    target = validateExternalRedirectTarget(legacyTarget, siteOrigin)
  }

  if (!target && lookupFailed) {
    res.statusCode = 503
    return { props: { target: null, lookupFailed: true } }
  }

  if (!target) {
    return { notFound: true }
  }

  return {
    props: { target }
  }
}
