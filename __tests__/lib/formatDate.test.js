import formatDate, { formatDateFmt } from '@/lib/utils/formatDate'

describe('formatDate', () => {
  it('returns an empty string for invalid date input', () => {
    expect(formatDate('not-a-date')).toBe('')
    expect(formatDate(null)).toBe('')
  })

  it('falls back to the default locale when the locale is invalid', () => {
    expect(() => formatDate('2026-06-06', 'yyyy-MM')).not.toThrow()
    expect(formatDate('2026-06-06', 'yyyy-MM')).toBeTruthy()
  })
})

describe('formatDateFmt', () => {
  it('returns an empty string for invalid timestamps', () => {
    expect(formatDateFmt('not-a-date', 'yyyy-MM-dd')).toBe('')
  })
})
