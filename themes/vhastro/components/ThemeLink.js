import Link from 'next/link'
import { useRouter } from 'next/router'
import SmartLink from '@/components/SmartLink'
import { previewHref } from '../utils'

export default function ThemeLink({ href, children, ...props }) {
  const router = useRouter()
  if (
    typeof href !== 'string' ||
    !href.startsWith('/') ||
    href.startsWith('//')
  )
    return (
      <SmartLink href={href} {...props}>
        {children}
      </SmartLink>
    )
  return (
    <Link href={previewHref(href, router.asPath)} {...props}>
      {children}
    </Link>
  )
}
