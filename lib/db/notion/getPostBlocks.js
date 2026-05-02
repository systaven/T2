import {
  getDataFromCache,
  getOrSetDataWithCache

} from '@/lib/cache/cache_manager'
import { deepClone, delay } from '../../utils'
import { getNotionTextContent } from '@/lib/utils/notion.util'
import notionAPI from '@/lib/db/notion/getNotionAPI'
import pLimit from 'p-limit'

// ⚠️ 全局限流器（非常关键）
const limit = pLimit(15)

// ⚠️ 每个请求之间的间隔（防 burst）
const REQUEST_INTERVAL = 50 // ms


/**
 * 获取文章内容块
 * @param {string} id
 * @param {*} from
 */
export async function fetchNotionPageBlocks(id, from = null) {
  const cacheKey = `page_block_${id}`

  const pageBlock = await getOrSetDataWithCache(
    cacheKey,
    async () => limit(() => getPageWithRetry(id, from))
  )

  if (!pageBlock) {
    console.warn('[getPage] empty pageBlock:', id)
    return null
  }

  return pageBlock
}

/**
 * 调用接口，失败会重试
 * @param {*} id
 * @param {*} retryAttempts
 */
export async function getPageWithRetry(id, from, retryAttempts = 3) {
  if (!retryAttempts || retryAttempts <= 0) {
    console.error('[请求失败]:', `from:${from}`, `id:${id}`)
    return null
  }

  console.log(
    '[API-->>请求]',
    `from:${from}`,
    `id:${id}`,
    retryAttempts < 3 ? `剩余重试次数:${retryAttempts}` : ''
  )

  try {
    const start = Date.now()
    const pageData = await notionAPI.getPage(id)
    const end = Date.now()
    console.log('[API<<--响应]', `耗时:${end - start}ms - from:${from}`)
    return pageData
  } catch (e) {
    console.warn('[API<<--异常]:', e)

    // 不再全局延迟 1000ms，而是通过 limit 控制并发
    const cacheKey = 'page_block_' + id
    const pageBlock = await getDataFromCache(cacheKey)
    if (pageBlock) {
      return pageBlock
    }

    return getPageWithRetry(id, from, retryAttempts - 1)
  }
}

/**
 * Notion页面BLOCK格式化处理
 * 1.删除冗余字段
 * 2.比如文件、视频、音频、url格式化
 * 3.代码块等元素兼容
 * @param {*} id 页面ID
 * @param {*} blockMap 页面元素
 * @param {*} slice 截取数量
 * @returns
 */
export function formatNotionBlock(block) {
  const clonedBlock = deepClone(block)
  const blocksToProcess = Object.keys(clonedBlock || {})

  for (let i = 0; i < blocksToProcess.length;) {
    const blockId = blocksToProcess[i]
    let b = clonedBlock[blockId]

    // ✅ 【新增】统一结构：兼容新版双层嵌套格式
    // 新格式: { spaceId, value: { value: { id, type }, role } }
    // 次格式: { value: { id, type }, role }
    // 旧格式: { value: { id, type } }
    if (b?.value?.value?.id) {
      // 新格式，剥掉外层，只保留真实 block value
      clonedBlock[blockId] = { value: b.value.value }
      b = clonedBlock[blockId]
    } else if (!b?.value?.id && b?.value?.role !== undefined) {
      // role:none 等无权限 block，直接跳过
      i++
      continue
    }

    // ✅ 【新增】清理 crdt 字段，react-notion-x 不认识会报 Unsupported block type
    if (b?.value) {
      delete b.value.crdt_data
      delete b.value.crdt_format_version
    }

    // 原有逻辑不变 ↓↓↓

    sanitizeBlockUrls(b?.value)

    if (b?.value?.type === 'sync_block' && b?.value?.children) {
      const childBlocks = b.value.children
      const childBlockIds = []
      delete clonedBlock[blockId]
      childBlocks.forEach((childBlock, index) => {
        const newBlockId = `${blockId}_child_${index}`
        clonedBlock[newBlockId] = childBlock
        childBlockIds.push(newBlockId)
      })
      blocksToProcess.splice(i, 1, ...childBlockIds)
      continue
    }

    if (b?.value?.type === 'code') {
      if (b?.value?.properties?.language?.[0][0] === 'C++') {
        b.value.properties.language[0][0] = 'cpp'
      }
      if (b?.value?.properties?.language?.[0][0] === 'C#') {
        b.value.properties.language[0][0] = 'csharp'
      }
      if (b?.value?.properties?.language?.[0][0] === 'Assembly') {
        b.value.properties.language[0][0] = 'asm6502'
      }
    }

    if (
      ['file', 'pdf', 'video', 'audio'].includes(b?.value?.type) &&
      b?.value?.properties?.source?.[0][0] &&
      (b?.value?.properties?.source?.[0][0]?.startsWith('attachment') ||
        b?.value?.properties?.source?.[0][0].indexOf('amazonaws.com') > 0)
    ) {
      const oldUrl = b?.value?.properties?.source?.[0][0]
      const newUrl = `https://notion.so/signed/${encodeURIComponent(oldUrl)}?table=block&id=${b?.value?.id}`
      b.value.properties.source[0][0] = newUrl
    }

    i++
  }

  return applyHtmlEmbedBlocks(clonedBlock)
}

/**
 * 根据[]ids，批量抓取blocks
 * 在获取数据库文章列表时，超过一定数量的block会被丢弃，因此根据pageId批量抓取block
 * @param {*} ids
 * @param {*} batchSize
 * @returns
 */
export const fetchInBatches = async (pageIds, batchSize = 100) => {
  // 如果 pageIds 不是数组，则将其转换为数组
  const ids = Array.isArray(pageIds) ? pageIds : (pageIds ? [pageIds] : [])
  if (ids.length === 0) {
    return {}
  }

  let fetchedBlocks = {}

  if(ids.length === 0) {
    return fetchedBlocks
  }
  
  console.log('[Batch] START total ids:', ids.length)

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    console.log('[API-->>请求] Fetching missing blocks', ids.length)
    const start = new Date().getTime()
    const pageChunk = await notionAPI.getBlocks(batch)
    const end = new Date().getTime()
    console.log(
      `[API<<--响应] 耗时:${end - start}ms Fetching missing blocks count:${ids.length} `
    )

    fetchedBlocks = Object.assign(
      {},
      fetchedBlocks,
      pageChunk?.recordMap?.block
    )
  }
  return fetchedBlocks
}

/**
 * 强制修复 block 中所有可能的非法 URL 字段
 * @param {Object} blockValue - block.value
 */
function sanitizeBlockUrls(blockValue) {
  if (!blockValue || typeof blockValue !== 'object') return

  const fixUrl = (url) => {
    if (typeof url !== 'string') return url

    if (url.startsWith('/')) {
      return url
    }

    // 修复 http:xxx → http://xxx
    if (url.startsWith('http:') && !url.startsWith('http://')) {
      url = 'http://' + url.slice(5)
    } else if (url.startsWith('https:') && !url.startsWith('https://')) {
      url = 'https://' + url.slice(6)
    }

    // 再次验证是否合法，否则替换为占位图
    try {
      new URL(url)
      return url
    } catch {
      console.warn('[Sanitize URL] Invalid URL replaced:', url)
      return 'https://via.placeholder.com/1x1?text=Invalid+Image'
    }
  }

  // 1. 处理 properties.source（用于 image, embed, bookmark, file, pdf 等）
  if (
    blockValue.properties?.source?.[0]?.[0] &&
    typeof blockValue.properties.source[0][0] === 'string'
  ) {
    blockValue.properties.source[0][0] = fixUrl(blockValue.properties.source[0][0])
  }

  // 2. 处理 file.url（用于 file block）
  if (blockValue.file?.url && typeof blockValue.file.url === 'string') {
    blockValue.file.url = fixUrl(blockValue.file.url)
  }

  // 3. 处理 format.page_cover（页面封面）
  if (blockValue.format?.page_cover && typeof blockValue.format.page_cover === 'string') {
    blockValue.format.page_cover = fixUrl(blockValue.format.page_cover)
  }

  // 4. 处理其他可能的 URL 字段（可选扩展）
  // 例如：video、audio 的 source 可能也走 properties.source，已覆盖
}

const HTML_EMBED_START = '===htmlstart==='
const HTML_EMBED_END = '===htmlend==='

function applyHtmlEmbedBlocks(blockMap) {
  if (!blockMap) return blockMap

  const getBlockText = blockValue => {
    if (!blockValue?.properties) return ''
    const textArray =
      blockValue.properties?.title || blockValue.properties?.caption
    return getNotionTextContent(textArray)
  }

  const createHtmlEmbedBlock = (html, sourceId, templateBlock, parentId) => {
    if (!html || !html.trim()) return null
    const baseId = sourceId || templateBlock?.id || parentId || 'html_embed'
    let htmlBlockId = `${baseId}_html_embed`
    let suffix = 1
    while (blockMap[htmlBlockId]) {
      htmlBlockId = `${baseId}_html_embed_${suffix}`
      suffix += 1
    }

    // synthetic code block for react-notion-x rendering; format.html_embed is
    // consumed by NotionCode to switch from code highlighting to HTML render.
    blockMap[htmlBlockId] = {
      value: {
        id: htmlBlockId,
        type: 'code',
        properties: {
          title: [[html]],
          language: [['html']]
        },
        format: {
          html_embed: true
        },
        parent_id: parentId,
        parent_table: 'block',
        created_time: templateBlock?.created_time,
        last_edited_time: templateBlock?.last_edited_time
      }
    }

    return htmlBlockId
  }

  Object.entries(blockMap).forEach(([blockId, block]) => {
    const blockValue = block?.value
    if (!Array.isArray(blockValue?.content)) return

    const contentIds = blockValue.content
    const nextContent = []

    for (let i = 0; i < contentIds.length; i += 1) {
      const currentId = contentIds[i]
      const currentBlock = blockMap[currentId]?.value
      const currentText = getBlockText(currentBlock)

      if (currentText && currentText.includes(HTML_EMBED_START)) {
        const afterStart = currentText.split(HTML_EMBED_START)[1] || ''
        const endInSame = afterStart.indexOf(HTML_EMBED_END)
        if (endInSame >= 0) {
          const htmlContent = afterStart.slice(0, endInSame)
          const htmlBlockId = createHtmlEmbedBlock(
            htmlContent,
            currentId,
            currentBlock,
            blockId
          )
          if (htmlBlockId) {
            nextContent.push(htmlBlockId)
          }
          continue
        }

        const htmlParts = []
        if (afterStart.trim()) {
          htmlParts.push(afterStart)
        }

        let endIndex = i + 1
        let endFound = false
        for (; endIndex < contentIds.length; endIndex += 1) {
          const nextId = contentIds[endIndex]
          const nextBlock = blockMap[nextId]?.value
          const nextText = getBlockText(nextBlock)

          if (nextText && nextText.includes(HTML_EMBED_END)) {
            const beforeEnd = nextText.split(HTML_EMBED_END)[0]
            if (beforeEnd.trim()) {
              htmlParts.push(beforeEnd)
            }
            endFound = true
            break
          }

          if (nextText) {
            htmlParts.push(nextText)
          }
        }

        if (endFound) {
          const htmlContent = htmlParts.join('\n')
          const htmlBlockId = createHtmlEmbedBlock(
            htmlContent,
            currentId,
            currentBlock,
            blockId
          )
          if (htmlBlockId) {
            nextContent.push(htmlBlockId)
          }
          i = endIndex
          continue
        }
      }

      nextContent.push(currentId)
    }

    blockValue.content = nextContent
  })

  return blockMap
}
