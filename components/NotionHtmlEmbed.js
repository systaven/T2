import { getNotionTextContent } from '@/lib/utils/notion.util'
import { Sanitizer } from '@/lib/utils/validation'

const NotionHtmlEmbed = ({ block }) => {
  const html = getNotionTextContent(block?.properties?.title)
  if (!html) return null

  // Sanitizer.sanitizeXss strips scripts, iframes, event handlers, and unsafe URLs.
  const sanitizedHtml = Sanitizer.sanitizeXss(html)
  if (!sanitizedHtml) return null // skip if sanitizer strips everything

  return (
    <div
      className='notion-html-embed'
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

export default NotionHtmlEmbed
