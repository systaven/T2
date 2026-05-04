import { useEffect, useState } from 'react'

/**
 * 阅读进度条 - 适配 Fuwari 主题
 */
const ReadingProgress = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const article = document.getElementById('article-wrapper')
      if (!article) return

      // 获取文章相对于视口的位置
      const rect = article.getBoundingClientRect()
      const windowHeight = window.innerHeight
      
      // 计算进度
      // 0%: 文章顶部刚进入视口或在视口上方一点
      // 100%: 文章底部进入视口
      const total = rect.height
      const current = windowHeight - rect.top
      
      let percentage = Math.round((current / total) * 100)
      percentage = Math.max(0, Math.min(100, percentage))
      
      setProgress(percentage)
    }

    window.addEventListener('scroll', updateProgress)
    // 初始计算一次
    updateProgress()
    
    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div className='px-3 mb-3'>
      <div className='flex justify-between items-center mb-1.5 px-1'>
        <span className='text-[10px] uppercase tracking-widest text-[var(--fuwari-muted)] font-bold opacity-80'>
          Reading Progress
        </span>
        <span className='text-[11px] font-mono font-bold text-[var(--fuwari-primary)]'>
          {progress}%
        </span>
      </div>
      <div className='h-1.5 w-full bg-[var(--fuwari-bg-soft)] rounded-full overflow-hidden border border-[var(--fuwari-border)]'>
        <div 
          className='h-full bg-gradient-to-r from-[var(--fuwari-primary)] to-[#ff708d] transition-all duration-200 ease-out'
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default ReadingProgress
