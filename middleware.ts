import { NextFetchEvent, NextRequest, NextResponse } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'
import {
  isAnonymousRootRequest,
  rootCacheHeaders
} from './lib/server/edgeCachePolicy.cjs'

/**
 * 中间件配置
 */
export const config = {
  // 这里设置白名单，防止静态资源被拦截
  matcher: ['/((?!.*\..*|_next|/sign-in|/auth).*)', '/', '/(api|trpc)(.*)']
}

/**
 * 默认中间件逻辑（处理 Notion ID 重定向等）
 * @param req
 * @param ev
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/require-await
const noAuthMiddleware = async (req: NextRequest, _ev: NextFetchEvent) => {
  // 处理 UUID 重定向
  if (BLOG['UUID_REDIRECT']) {
    let redirectJson: Record<string, string> = {}
    try {
      const response = await fetch(`${req.nextUrl.origin}/redirect.json`)
      if (response.ok) {
        redirectJson = (await response.json()) as Record<string, string>
      }
    } catch (err) {
      console.error('Error fetching static file:', err)
    }
    let lastPart = getLastPartOfUrl(req.nextUrl.pathname) as string
    if (checkStrIsNotionId(lastPart)) {
      lastPart = idToUuid(lastPart)
    }
    if (lastPart && redirectJson[lastPart]) {
      const redirectToUrl = req.nextUrl.clone()
      redirectToUrl.pathname = '/' + redirectJson[lastPart]
      console.log(
        `redirect from ${req.nextUrl.pathname} to ${redirectToUrl.pathname}`
      )
      return NextResponse.redirect(redirectToUrl, 308)
    }
  }
  return NextResponse.next()
}

// Clerk must wrap the existing middleware so it can attach authentication
// state to page and API requests. Routes remain public here; authorization is
// enforced by the admin page/API handlers themselves. Keep Clerk optional for
// installations of NotionNext that do not configure it.
const authenticatedMiddleware =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
    ? clerkMiddleware((_auth, req, ev) => noAuthMiddleware(req, ev))
    : noAuthMiddleware

// Uptime requests are anonymous HTTP reads. Avoid issuing authentication cookies
// on this public cache entry; session-bearing requests still run Clerk normally.
export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const publicRoot =
    process.env.CLOUDFLARE_ROOT_CACHE === 'true' &&
    isAnonymousRootRequest({
      method: req.method,
      pathname: req.nextUrl.pathname,
      search: req.nextUrl.search,
      cookie: req.headers.get('cookie') || '',
      authorization: req.headers.get('authorization') || ''
    })
  const response = await (publicRoot
    ? noAuthMiddleware(req, ev)
    : authenticatedMiddleware(req, ev))
  if (
    publicRoot &&
    response &&
    response.status === 200 &&
    !response.headers.has('set-cookie')
  ) {
    for (const [name, value] of Object.entries(
      rootCacheHeaders(process.env.CLOUDFLARE_ROOT_CACHE_TTL)
    )) {
      response.headers.set(name, String(value))
    }
  }
  return response
}
