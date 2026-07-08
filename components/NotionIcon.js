import LazyImage from './LazyImage'

/**
 * notion的图标icon
 * 可能是emoji 可能是 svg 也可能是 图片
 * @returns
 */
const NotionIcon = ({ icon, className }) => {
  if (!icon || typeof icon !== 'string') {
    return null
  }

  const normalizedIcon = icon.trim()

  if (normalizedIcon.startsWith('http') || normalizedIcon.startsWith('data:')) {
    return <LazyImage src={normalizedIcon} className={className || 'w-8 h-8 my-auto inline mr-1'} />
  }

  const isFontAwesomeIcon =
    /(^|\s)fa[srldb]?\s/.test(normalizedIcon) ||
    /(^|\s)fa-[\w-]+/.test(normalizedIcon)

  const isMscIcon =
    /(^|\s)msc\s/.test(normalizedIcon) ||
    /(^|\s)msc-[\w-]+/.test(normalizedIcon)

  if (isFontAwesomeIcon || isMscIcon) {
    return <i className={`${normalizedIcon} ${className || 'mr-1'}`} aria-hidden='true' />
  }

  return <span className={className || 'mr-1'}>{normalizedIcon}</span>
}

export default NotionIcon
