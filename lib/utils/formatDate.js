import BLOG from '@/blog.config'

/**
 * 格式化日期
 * @param date
 * @param local
 * @returns {string}
 */
export default function formatDate(date, local = BLOG.LANG) {
  if (!date) return ''

  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''

  const safeLocale = resolveLocale(local)
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  const res = d.toLocaleDateString(safeLocale, options)
  // 如果格式是中文日期，则转为横杆
  const format =
    safeLocale.slice(0, 2).toLowerCase() === 'zh'
      ? res.replace('年', '-').replace('月', '-').replace('日', '')
      : res
  return format
}

/**
 * 时间戳格式化
 * @param {*} timestamp
 * @param {*} fmt
 * @returns
 */
export function formatDateFmt(timestamp, fmt) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const o = {
    'M+': date.getMonth() + 1, // 月份
    'd+': date.getDate(), // 日
    'h+': date.getHours(), // 小时
    'm+': date.getMinutes(), // 分
    's+': date.getSeconds(), // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    S: date.getMilliseconds() // 毫秒
  }
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      (date.getFullYear() + '').substr(4 - RegExp.$1.length)
    )
  }
  for (const k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      )
    }
  }
  return fmt.trim()
}

function resolveLocale(local) {
  if (typeof local !== 'string' || !local.trim()) {
    return BLOG.LANG || 'en-US'
  }

  try {
    Intl.DateTimeFormat(local)
    return local
  } catch {
    return BLOG.LANG || 'en-US'
  }
}
