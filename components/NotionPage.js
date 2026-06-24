import { siteConfig } from '@/lib/config'
import { compressImage, mapImgUrl } from '@/lib/db/notion/mapImage'
import {
  checkStrIsNotionId,
  checkStrIsUuid,
  isBrowser,
  isHttpLink,
  isMailOrTelLink,
  loadExternalResource
} from '@/lib/utils'
import mediumZoom from '@fisch0920/medium-zoom'
import 'katex/dist/katex.min.css'
import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'
import { NotionRenderer } from 'react-notion-x'
import ArticleLink from '@/components/ArticleLink'
import { getTextContent } from 'notion-utils'

/**
 * 整个站点的核心组件
 * 将Notion数据渲染成网页
 * @param {*} param0
 * @returns
 */
const NotionPage = ({ post, className }) => {
  // 是否关闭数据库和画册的点击跳转
  const POST_DISABLE_GALLERY_CLICK = siteConfig('POST_DISABLE_GALLERY_CLICK')
  const POST_DISABLE_DATABASE_CLICK = siteConfig('POST_DISABLE_DATABASE_CLICK')
  const SPOILER_TEXT_TAG = siteConfig('SPOILER_TEXT_TAG')
  const useShortlinkForArticle = post?.type === 'Post'

  const zoomRef = useRef(null)
  const IMAGE_ZOOM_IN_WIDTH = siteConfig('IMAGE_ZOOM_IN_WIDTH', 1200)
  // 页面首次打开时执行的勾子
  useEffect(() => {
    // 检测当前的url并自动滚动到对应目标
    autoScrollToHash()
  }, [])

  // 页面文章发生变化时会执行的勾子
  useEffect(() => {
    processCollectionViewLinks(post?.blockMap)

    // 相册视图点击禁止跳转，只能放大查看图片
    if (POST_DISABLE_GALLERY_CLICK) {
      if (!zoomRef.current && isBrowser) {
        zoomRef.current = mediumZoom({
          background: 'rgba(0, 0, 0, 0.2)',
          margin: getMediumZoomMargin()
        })
      }
      // 针对页面中的gallery视图，点击后是放大图片还是跳转到gallery的内部页面
      processGalleryImg(zoomRef?.current)
    }

    // 页内数据库点击禁止跳转，只能查看
    if (POST_DISABLE_DATABASE_CLICK) {
      processDisableDatabaseUrl()
    }

    // 文件链接在新标签页打开并强制下载
    processFileUrl()
    processArticleHyperlinks()

    /**
     * 放大查看图片时替换成高清图像
     */
    const articleRoot =
      document.getElementById('notion-article') || document.body

    const observer = new MutationObserver((mutationsList, observer) => {
      mutationsList.forEach(mutation => {
        processCollectionViewLinks(post?.blockMap)
        if (POST_DISABLE_DATABASE_CLICK) {
          processDisableDatabaseUrl()
        }
        processFileUrl()
        processArticleHyperlinks()
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          if (mutation.target.classList.contains('medium-zoom-image--opened')) {
            // 等待动画完成后替换为更高清的图像
            setTimeout(() => {
              // 获取该元素的 src 属性
              const src = mutation?.target?.getAttribute('src')
              //   替换为更高清的图像
              mutation?.target?.setAttribute(
                'src',
                compressImage(src, IMAGE_ZOOM_IN_WIDTH)
              )
            }, 800)
          }
        }
      })
    })

    // 监视正文容器，避免对整个 document.body 做高开销监听
    observer.observe(articleRoot, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class']
    })

    return () => {
      observer.disconnect()
    }
  }, [post])

  useEffect(() => {
    // Spoiler文本功能
    if (SPOILER_TEXT_TAG) {
      import('lodash/escapeRegExp').then(escapeRegExp => {
        Promise.all([
          loadExternalResource('/js/spoilerText.js', 'js'),
          loadExternalResource('/css/spoiler-text.css', 'css')
        ]).then(() => {
          window.textToSpoiler &&
            window.textToSpoiler(escapeRegExp.default(SPOILER_TEXT_TAG))
        })
      })
    }
  }, [post])

  // const cleanBlockMap = cleanBlocksWithWarn(post?.blockMap);
  // console.log('NotionPage render with post:', post);

  return (
    <div
      id='notion-article'
      className={`mx-auto overflow-hidden ${className || ''}`}>
      <NotionRenderer
        recordMap={post?.blockMap}
        mapPageUrl={mapPageUrl}
        mapImageUrl={mapImgUrl}
        isLinkCollectionToUrlProperty
        components={{
          Link: (props) => (
            <ArticleLink
              {...props}
              target='_blank'
              useShortlink={useShortlinkForArticle}
            />
          ),
          Code,
          Collection,
          Equation,
          Modal,
          Pdf,
          Tweet
        }}
      />

      <AdEmbed />
      {hasCodeBlock(post?.blockMap) && <PrismMac />}
    </div>
  )
}

const hasCodeBlock = blockMap => {
  const blocks = blockMap?.block
  if (!blocks) return false
  return Object.values(blocks).some(
    item => item?.value?.type === 'code'
  )
}

const COLLECTION_LINK_ROOT_SELECTORS = [
  '.notion-collection-card',
  '.notion-list-item.notion-page-link'
].join(', ')

const COLLECTION_EXTERNAL_LINK_SELECTORS = [
  'form[action]',
  'a.notion-link[href]',
  'a[href^="http://"]',
  'a[href^="https://"]'
].join(', ')

const COLLECTION_TEXT_LINK_SELECTORS = [
  '.notion-property-text',
  '.notion-property-email',
  '.notion-property-phone_number',
  '.notion-property-url'
].join(', ')

const ARTICLE_LINK_SELECTOR = '#notion-article a[href]'
const FORCE_DOWNLOAD_FILE_PATTERN =
  /amazonaws\.com|notion-static|file\.notion\.so|secure\.notion-static\.com/i
const FORCE_DOWNLOAD_EXT_PATTERN =
  /\.(zip|rar|7z|pdf|docx?|xlsx?|pptx?|txt|csv|json|xml|mp3|mp4|mov|avi|apk|dmg|exe|iso)(?:[?#]|$)/i

/**
 * 将数据库卡片或列表项的默认内部页面链接改写为 URL 属性里的外链
 */
const processCollectionViewLinks = blockMap => {
  if (isBrowser) {
    const collectionLinks = document.querySelectorAll(
      COLLECTION_LINK_ROOT_SELECTORS
    )
    for (const linkElement of collectionLinks) {
      const preferredLink = getCollectionItemPreferredLink(linkElement, blockMap)
      if (preferredLink) {
        applyPreferredLink(linkElement, preferredLink)
      }
    }

    const tableRows = document.querySelectorAll('.notion-table-row')
    for (const rowElement of tableRows) {
      const preferredLink = getCollectionItemPreferredLink(rowElement, blockMap)
      if (!preferredLink) continue

      const titleLink = rowElement.querySelector(
        '.notion-property-title .notion-page-link'
      )
      if (titleLink?.tagName === 'A') {
        applyPreferredLink(titleLink, preferredLink)
      }
    }
  }
}

/**
 * 页面的数据库内部页链接禁止跳转，只保留外链属性本身可点
 */
const processDisableDatabaseUrl = () => {
  if (isBrowser) {
    const links = document.querySelectorAll('.notion-table a')
    for (const e of links) {
      const href = e.getAttribute('href')
      if (isInternalCollectionPageHref(href)) {
        e.removeAttribute('href')
        e.removeAttribute('target')
        e.removeAttribute('rel')
      }
    }
  }
}

/**
 * 使Notion内容中的文件在新标签页打开并强制下载
 */
const processFileUrl = () => {
  if (isBrowser) {
    const links = document.querySelectorAll('.notion-file-link')
    for (const e of links) {
      e.setAttribute('target', '_blank')
      e.setAttribute('rel', 'noopener noreferrer')
      e.setAttribute('download', '')
    }
  }
}

/**
 * 强制正文中的普通超链接新标签页打开，并为文件类链接补充 download 标志
 */
const processArticleHyperlinks = () => {
  if (!isBrowser) return

  const links = document.querySelectorAll(ARTICLE_LINK_SELECTOR)
  for (const link of links) {
    const href = link.getAttribute('href')
    if (!href) continue

    if (
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    ) {
      continue
    }

    if (isHttpLink(href)) {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer nofollow external')
    }

    if (
      FORCE_DOWNLOAD_FILE_PATTERN.test(href) ||
      FORCE_DOWNLOAD_EXT_PATTERN.test(href)
    ) {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
      link.setAttribute('download', '')
    }
  }
}

/**
 * gallery视图，点击后是放大图片还是跳转到gallery的内部页面
 */
const processGalleryImg = zoom => {
  setTimeout(() => {
    if (isBrowser) {
      const imgList = document?.querySelectorAll(
        '.notion-collection-card-cover img'
      )
      if (imgList && zoom) {
        for (let i = 0; i < imgList.length; i++) {
          zoom.attach(imgList[i])
        }
      }

      const cards = document.getElementsByClassName('notion-collection-card')
      for (const e of cards) {
        const href = e.getAttribute('href')
        if (isInternalCollectionPageHref(href)) {
          e.removeAttribute('href')
        }
      }
    }
  }, 800)
}

const getCollectionItemPreferredLink = (element, blockMap) => {
  if (!element) return null

  const block = getCollectionItemBlock(element, blockMap)
  const collection = getCollectionItemCollection(block, blockMap)

  const notionProvidedLink = getNotionProvidedCollectionLink(block)
  if (notionProvidedLink) {
    return notionProvidedLink
  }

  const typedPropertyLink = getSchemaBasedCollectionLink(block, collection)
  if (typedPropertyLink) {
    return typedPropertyLink
  }

  const externalLinkElements = element.querySelectorAll(
    COLLECTION_EXTERNAL_LINK_SELECTORS
  )

  for (const linkElement of externalLinkElements) {
    const candidateUrl =
      linkElement.tagName === 'FORM'
        ? linkElement.getAttribute('action')
        : linkElement.getAttribute('href')

    const normalizedLink = normalizePreferredCollectionLink(candidateUrl)
    if (normalizedLink) {
      return normalizedLink
    }
  }

  const textLinkElements = element.querySelectorAll(
    COLLECTION_TEXT_LINK_SELECTORS
  )

  for (const textElement of textLinkElements) {
    const normalizedLink = normalizePreferredCollectionLink(
      textElement.textContent
    , { allowTextGuess: true })
    if (normalizedLink) {
      return normalizedLink
    }
  }

  return null
}

const applyPreferredLink = (element, link) => {
  if (!element || !link?.href) return

  element.setAttribute('href', link.href)

  if (link.target) {
    element.setAttribute('target', link.target)
  } else {
    element.removeAttribute('target')
  }

  if (link.rel) {
    element.setAttribute('rel', link.rel)
  } else {
    element.removeAttribute('rel')
  }
}

const normalizePreferredCollectionLink = (
  href,
  { allowTextGuess = false, protocol } = {}
) => {
  if (typeof href !== 'string' || !href.trim()) return null

  const rawHref = href.trim()
  if (!rawHref) return null

  const protocolHref = protocol ? `${protocol}:${rawHref}` : rawHref

  if (isMailOrTelLink(protocolHref)) {
    return {
      href: protocolHref,
      target: '_self'
    }
  }

  if (isHttpLink(protocolHref)) {
    return {
      href: protocolHref,
      target: '_blank',
      rel: 'noopener noreferrer'
    }
  }

  if (
    rawHref.startsWith('/') &&
    !isInternalCollectionPageHref(rawHref)
  ) {
    return {
      href: rawHref,
      target: '_self'
    }
  }

  if (!allowTextGuess) {
    return null
  }

  const matchedUrlText = extractUrlLikeText(rawHref)
  const candidateHref = matchedUrlText || rawHref

  if (!candidateHref) return null

  try {
    const url = new URL(candidateHref)
    if (!/^https?:$/i.test(url.protocol)) return null
    return {
      href: url.toString(),
      target: '_blank',
      rel: 'noopener noreferrer'
    }
  } catch {
    try {
      const url = new URL(`https://${candidateHref}`)
      if (!/^https?:$/i.test(url.protocol)) return null
      return {
        href: url.toString(),
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    } catch {
      return null
    }
  }
}

const isInternalCollectionPageHref = href => {
  if (typeof href !== 'string' || !href.startsWith('/')) return false

  const path = href.split('?')[0].split('#')[0]
  const lastSegment = path.split('/').filter(Boolean).pop()
  return checkStrIsNotionId(lastSegment) || checkStrIsUuid(lastSegment)
}

const extractUrlLikeText = text => {
  if (typeof text !== 'string') return null

  const normalizedText = text.trim()
  if (!normalizedText) return null

  const matchedUrl = normalizedText.match(
    /\b((?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<]*)?)/i
  )

  return matchedUrl?.[1] || null
}

const getCollectionItemBlock = (element, blockMap) => {
  const blockId = getCollectionItemBlockId(element)
  if (!blockId || !blockMap?.block) return null
  return getRecordValueById(blockMap.block, blockId)
}

const getCollectionItemCollection = (block, blockMap) => {
  const collectionId = block?.parent_id
  if (!collectionId || !blockMap?.collection) return null
  return getRecordValueById(blockMap.collection, collectionId)
}

const getCollectionItemBlockId = element => {
  const hrefCandidates = [
    element?.getAttribute?.('href'),
    element?.querySelector?.('.notion-property-title .notion-page-link')?.getAttribute?.('href'),
    element?.querySelector?.('.notion-collection-card')?.getAttribute?.('href')
  ].filter(Boolean)

  for (const href of hrefCandidates) {
    const path = href.split('?')[0].split('#')[0]
    const lastSegment = path.split('/').filter(Boolean).pop()
    if (checkStrIsNotionId(lastSegment) || checkStrIsUuid(lastSegment)) {
      return lastSegment
    }
  }

  return null
}

const getRecordValueById = (recordMapSection, id) => {
  if (!recordMapSection || !id) return null

  const idCandidates = new Set([id])
  if (typeof id === 'string') {
    idCandidates.add(id.replace(/-/g, ''))
    if (checkStrIsNotionId(id)) {
      idCandidates.add(
        [
          id.slice(0, 8),
          id.slice(8, 12),
          id.slice(12, 16),
          id.slice(16, 20),
          id.slice(20)
        ].join('-')
      )
    }
  }

  for (const candidateId of idCandidates) {
    const entry = recordMapSection[candidateId]
    if (entry?.value) return entry.value
    if (entry) return entry
  }

  return null
}

const getNotionProvidedCollectionLink = block => {
  const properties = Object.values(block?.properties || {})
  for (const propertyValue of properties) {
    const link = getFirstDecoratedLink(propertyValue)
    if (link) return link
  }

  return null
}

const getFirstDecoratedLink = propertyValue => {
  if (!Array.isArray(propertyValue)) return null

  for (const item of propertyValue) {
    const decorations = item?.[1]
    if (!Array.isArray(decorations)) continue

    for (const decoration of decorations) {
      const type = decoration?.[0]
      const value = decoration?.[1]

      if (type === 'a') {
        const normalizedLink = normalizePreferredCollectionLink(value)
        if (normalizedLink) return normalizedLink
      }

      if (type === 'lm') {
        const normalizedLink = normalizePreferredCollectionLink(value?.href)
        if (normalizedLink) return normalizedLink
      }
    }
  }

  return null
}

const getSchemaBasedCollectionLink = (block, collection) => {
  const schemaEntries = Object.entries(collection?.schema || {})

  for (const [propertyId, propertySchema] of schemaEntries) {
    const propertyValue = block?.properties?.[propertyId]
    if (!propertyValue) continue

    if (propertySchema?.type === 'url') {
      const normalizedLink = normalizePreferredCollectionLink(
        getTextContent(propertyValue)
      )
      if (normalizedLink) return normalizedLink
    }

    if (propertySchema?.type === 'email') {
      const normalizedLink = normalizePreferredCollectionLink(
        getTextContent(propertyValue),
        { protocol: 'mailto' }
      )
      if (normalizedLink) return normalizedLink
    }

    if (propertySchema?.type === 'phone_number') {
      const normalizedLink = normalizePreferredCollectionLink(
        getTextContent(propertyValue),
        { protocol: 'tel' }
      )
      if (normalizedLink) return normalizedLink
    }
  }

  return null
}

/**
 * 根据url参数自动滚动到锚位置
 */
const autoScrollToHash = () => {
  setTimeout(() => {
    // 跳转到指定标题
    const hash = window?.location?.hash
    const needToJumpToTitle = hash && hash.length > 0
    if (needToJumpToTitle) {
      console.log('jump to hash', hash)
      const tocNode = document.getElementById(hash.substring(1))
      if (tocNode && tocNode?.className?.indexOf('notion') > -1) {
        tocNode.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }
  }, 180)
}

/**
 * 将id映射成博文内部链接。
 * @param {*} id
 * @returns
 */
const mapPageUrl = id => {
  // return 'https://www.notion.so/' + id.replace(/-/g, '')
  return '/' + id.replace(/-/g, '')
}

/**
 * 缩放
 * @returns
 */
function getMediumZoomMargin() {
  const width = window.innerWidth

  if (width < 500) {
    return 8
  } else if (width < 800) {
    return 20
  } else if (width < 1280) {
    return 30
  } else if (width < 1600) {
    return 40
  } else if (width < 1920) {
    return 48
  } else {
    return 72
  }
}

// 代码
const Code = dynamic(() => import('@/components/NotionCode'), { ssr: false })

// 公式
const Equation = dynamic(
  () =>
    import('@/components/Equation').then(async m => {
      // 化学方程式
      await import('@/lib/plugins/mhchem')
      return m.Equation
    }),
  { ssr: true }
)

// 原版文档
// const Pdf = dynamic(
//   () => import('react-notion-x/build/third-party/pdf').then(m => m.Pdf),
//   {
//     ssr: false
//   }
// )
const Pdf = dynamic(() => import('@/components/Pdf').then(m => m.Pdf), {
  ssr: false
})

// 美化代码 from: https://github.com/txs
const PrismMac = dynamic(() => import('@/components/PrismMac'), {
  ssr: false
})

/**
 * tweet嵌入
 */
const TweetEmbed = dynamic(() => import('react-tweet-embed'), {
  ssr: false
})

/**
 * 文内google广告
 */
const AdEmbed = dynamic(
  () => import('@/components/GoogleAdsense').then(m => m.AdEmbed),
  { ssr: true }
)

const Collection = dynamic(
  () =>
    import('react-notion-x/build/third-party/collection').then(
      m => m.Collection
    ),
  {
    ssr: true
  }
)

const Modal = dynamic(
  () => import('react-notion-x/build/third-party/modal').then(m => m.Modal),
  { ssr: false }
)

const Tweet = ({ id }) => {
  return <TweetEmbed tweetId={id} />
}

export default NotionPage
