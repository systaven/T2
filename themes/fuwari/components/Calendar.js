import { useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'

/**
 * 日历组件 - 适配 Fuwari 主题
 * 模仿 Mizuki 风格，Next.js 重写
 */
const Calendar = ({ allNavPages = [] }) => {
  const { locale } = useGlobal()
  const router = useRouter()
  const now = new Date()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)

  // 处理文章数据，按日期映射
  const postsByDate = useMemo(() => {
    const map = {}
    allNavPages?.forEach(post => {
      const date = post.publishDate || post.date?.start_date || post.lastEditedDay
      if (date) {
        const d = new Date(date)
        const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
        if (!map[dateKey]) map[dateKey] = []
        map[dateKey].push(post)
      }
    })
    return map
  }, [allNavPages])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 计算日历网格
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const grid = []

    // 填充月初空白 (以周一为起点或周日？Mizuki 是周一为起点)
    // Mizuki 代码中是 (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; 
    // 这意味着周一为 0
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7

    for (let i = 0; i < startOffset; i++) {
      grid.push({ type: 'empty' })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${month + 1}-${day}`
      grid.push({
        type: 'day',
        day,
        dateKey,
        posts: postsByDate[dateKey] || [],
        isToday: year === now.getFullYear() && month === now.getMonth() && day === now.getDate()
      })
    }

    return grid
  }, [year, month, postsByDate])

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const backToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <section className='fuwari-card p-4'>
      <div className='flex justify-between items-center mb-4'>
        <div className='flex items-center gap-2'>
           <div className='w-1 h-4 rounded-full bg-[var(--fuwari-primary)]'></div>
           <h3 className='text-lg font-bold text-[var(--fuwari-text)]'>
             {year}年 {month + 1}月
           </h3>
        </div>
        <div className='flex items-center gap-1'>
          <button onClick={backToToday} className='p-1 text-[var(--fuwari-primary)] hover:bg-[var(--fuwari-bg-soft)] rounded transition-colors' title='回到今天'>
            <i className='fas fa-redo-alt text-xs'></i>
          </button>
          <button onClick={prevMonth} className='p-1 text-[var(--fuwari-muted)] hover:text-[var(--fuwari-primary)] hover:bg-[var(--fuwari-bg-soft)] rounded transition-colors'>
            <i className='fas fa-chevron-left text-xs'></i>
          </button>
          <button onClick={nextMonth} className='p-1 text-[var(--fuwari-muted)] hover:text-[var(--fuwari-primary)] hover:bg-[var(--fuwari-bg-soft)] rounded transition-colors'>
            <i className='fas fa-chevron-right text-xs'></i>
          </button>
        </div>
      </div>

      <div className='grid grid-cols-7 gap-1 mb-2'>
        {weekDays.map(d => (
          <div key={d} className='text-center text-[10px] font-bold text-[var(--fuwari-muted)] uppercase'>
            {d}
          </div>
        ))}
      </div>

      <div className='grid grid-cols-7 gap-1'>
        {calendarGrid.map((cell, i) => {
          if (cell.type === 'empty') return <div key={`empty-${i}`} className='aspect-square'></div>
          
          const hasPost = cell.posts.length > 0
          const isSelected = selectedDate === cell.dateKey
          
          let className = 'aspect-square flex items-center justify-center rounded-lg text-sm cursor-pointer transition-all relative '
          if (isSelected) {
            className += 'bg-[var(--fuwari-primary)] text-white shadow-sm scale-105 z-10'
          } else if (cell.isToday) {
            className += 'text-[var(--fuwari-primary)] font-bold bg-[var(--fuwari-primary-soft)] ring-1 ring-[var(--fuwari-primary)]'
          } else if (hasPost) {
            className += 'text-[var(--fuwari-text)] font-bold hover:bg-[var(--fuwari-bg-soft)]'
          } else {
            className += 'text-[var(--fuwari-muted)] opacity-60 hover:bg-[var(--fuwari-bg-soft)]'
          }

          return (
            <div 
              key={cell.dateKey} 
              className={className}
              onClick={() => setSelectedDate(isSelected ? null : cell.dateKey)}
            >
              {cell.day}
              {hasPost && !isSelected && (
                <span className='absolute bottom-1 w-1 h-1 rounded-full bg-[var(--fuwari-primary)]'></span>
              )}
            </div>
          )
        })}
      </div>

      {/* 选中日期的文章列表 */}
      {selectedDate && postsByDate[selectedDate] && (
        <div className='mt-4 pt-4 border-t border-[var(--fuwari-border)] animate-fuwari-enter'>
          <div className='text-[10px] font-bold text-[var(--fuwari-muted)] uppercase mb-2 px-1'>
            {selectedDate} 的文章
          </div>
          <div className='space-y-2'>
            {postsByDate[selectedDate].map(post => (
              <SmartLink 
                key={post.id} 
                href={`${siteConfig('SUB_PATH', '')}/${post.slug}`}
                className='block text-xs leading-5 p-2 rounded-lg bg-[var(--fuwari-bg-soft)] hover:text-[var(--fuwari-primary)] transition-colors'
              >
                {post.title}
              </SmartLink>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default Calendar
