import { Code as DefaultCode } from 'react-notion-x/build/third-party/code'
import NotionHtmlEmbed from '@/components/NotionHtmlEmbed'

const NotionCode = props => {
  const block = props?.block
  if (block?.format?.html_embed) {
    return <NotionHtmlEmbed block={block} />
  }

  return <DefaultCode {...props} />
}

export default NotionCode
