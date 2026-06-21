import LazyImage from '@/components/LazyImage'

/**
 * notion的图标icon
 * 可能是emoji 可能是 svg 也可能是 图片
 * @returns
 */
const NotionIcon = ({ icon, className = 'w-8 h-8 my-auto inline mr-1' }) => {
  if (!icon || typeof icon !== 'string') {
    return null
  }

  const normalizedIcon = icon.trim()

  if (normalizedIcon.startsWith('http') || normalizedIcon.startsWith('data:')) {
    // 这里优先使用传入的 className
    return <LazyImage src={normalizedIcon} className={className} />
  }

  const isFontAwesomeIcon =
    /(^|\s)fa[srldb]?\s/.test(normalizedIcon) ||
    /(^|\s)fa-[\w-]+/.test(normalizedIcon)

  const isMscIcon =
    /(^|\s)msc\s/.test(normalizedIcon) ||
    /(^|\s)msc-[\w-]+/.test(normalizedIcon)

  if (isFontAwesomeIcon || isMscIcon) {
    return <i className={`${normalizedIcon} ${className}`} aria-hidden='true' />
  }

  // 对于 emoji 或 svg，设置默认 className，也可以传递不同的样式
  return <span className={`inline-block ${className}`}>{normalizedIcon}</span>
}

export default NotionIcon
