import {
  buildExternalRedirectPath,
  isExternalHttpLink,
  mergeRelValues
} from '@/lib/utils/externalLink'

export const shouldOpenNotionLinkInNewTab = (href, target, siteOrigin) => {
  if (target === '_blank') {
    return true
  }

  const fallbackOrigin =
    siteOrigin ||
    (typeof window !== 'undefined' && window.location
      ? window.location.origin
      : null)

  return isExternalHttpLink(href, fallbackOrigin)
}

const NotionLink = ({ href, target, rel, ...props }) => {
  const shouldOpenInNewTab = shouldOpenNotionLinkInNewTab(href, target)
  const normalizedTarget = shouldOpenInNewTab ? '_blank' : target
  const normalizedRel = shouldOpenInNewTab
    ? mergeRelValues(rel, 'noopener noreferrer nofollow external')
    : rel
  const normalizedHref = shouldOpenInNewTab
    ? buildExternalRedirectPath(href)
    : href

  return (
    <a
      {...props}
      href={normalizedHref}
      target={normalizedTarget}
      rel={normalizedRel}
    />
  )
}

export default NotionLink
