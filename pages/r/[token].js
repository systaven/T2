import {
  decodeExternalUrl,
  validateExternalRedirectTarget
} from '@/lib/utils/externalLink'
import { siteConfig } from '@/lib/config'

const applyNoIndexHeaders = res => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
}

export default function RedirectPage() {
  return null
}

export function getServerSideProps(context) {
  const { params, res } = context
  applyNoIndexHeaders(res)

  const siteOrigin = siteConfig('LINK') || undefined
  const rawTarget = decodeExternalUrl(params?.token)
  const target = validateExternalRedirectTarget(rawTarget, siteOrigin)

  if (!target) {
    return { notFound: true }
  }

  return {
    redirect: {
      destination: target,
      permanent: false
    }
  }
}
