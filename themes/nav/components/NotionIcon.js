import LazyImage from '@/components/LazyImage'

/**
 * notion的图标icon
 * 可能是emoji 可能是 svg 也可能是 图片
 * @returns
 */
const NotionIcon = ({ icon }) => {
  let imgSize = 8
  let fontSize = ''
  if (!icon || typeof icon !== 'string') {
    return null
  }

  const normalizedIcon = icon.trim()
  fontSize = (Math.round(imgSize / 2) - 1) > 0 ? (Math.round(imgSize / 2) - 1) : ''

  if (normalizedIcon.startsWith('http') || normalizedIcon.startsWith('data:')) {
    return <LazyImage src={normalizedIcon} width={40} height={40} className={`w-10 h-10 inline`}/>
  }

  const isFontAwesomeIcon =
    /(^|\s)fa[srldb]?\s/.test(normalizedIcon) ||
    /(^|\s)fa-[\w-]+/.test(normalizedIcon)

  const isMscIcon =
    /(^|\s)msc\s/.test(normalizedIcon) ||
    /(^|\s)msc-[\w-]+/.test(normalizedIcon)

  if (isFontAwesomeIcon || isMscIcon) {
    return <i className={`${normalizedIcon} mr-1 text-4xl`} aria-hidden='true' />
  }

  return <span className={`mr-1 text-4xl`}>{normalizedIcon}</span>
}

export default NotionIcon
