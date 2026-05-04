import LazyImage from '@/components/LazyImage'

/**
 * Fuwari 主题专属图标组件
 * 支持：Emoji, 图片 URL, 以及 FontAwesome 类名 (如 'fas fa-home')
 */
const NotionIcon = ({ icon, className = 'w-5 h-5 inline-block mr-1.5' }) => {
  if (!icon || typeof icon !== 'string') {
    return null
  }

  const normalizedIcon = icon.trim()

  // 1. 处理图片 URL
  if (normalizedIcon.startsWith('http') || normalizedIcon.startsWith('data:')) {
    return <LazyImage src={normalizedIcon} className={className} />
  }

  // 2. 处理 FontAwesome 类名 (格式如: 'fas fa-xxx' 或 'fa-xxx')
  const isFontAwesomeIcon =
    /(^|\s)fa[srldb]?\s/.test(normalizedIcon) ||
    /(^|\s)fa-[\w-]+/.test(normalizedIcon)
  
  if (isFontAwesomeIcon) {
    return <i className={`${normalizedIcon} ${className}`} aria-hidden='true' />
  }

  // 3. 处理 Emoji 或普通文本
  return <span className={`inline-block ${className}`}>{normalizedIcon}</span>
}

export default NotionIcon
