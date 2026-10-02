import { act, fireEvent, render, screen } from '@testing-library/react'
import { loadDailyQuote } from '@/themes/vhastro/quote'
import DailyQuote from '@/themes/vhastro/components/DailyQuote'

const data = { hitokoto: '测试一言', from: '测试出处', from_who: '作者' }
const response = () => ({ ok: true, json: async () => data })
const originalFetch = global.fetch
beforeEach(() => {
  localStorage.clear()
  global.fetch = jest.fn()
})
afterAll(() => {
  global.fetch = originalFetch
})

test('daily cache prevents extra requests on article navigation and preserves attribution', async () => {
  fetch.mockResolvedValue(response())
  expect(await loadDailyQuote()).toEqual({
    text: '测试一言',
    source: '测试出处 · 作者'
  })
  await loadDailyQuote()
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('concurrent mounts share one request', async () => {
  let resolve
  fetch.mockReturnValue(
    new Promise(done => {
      resolve = done
    })
  )
  const first = loadDailyQuote()
  const second = loadDailyQuote()
  expect(first).toBe(second)
  resolve(response())
  await first
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('old or malformed cache is refreshed', async () => {
  localStorage.setItem(
    'vhastro_hitokoto_daily',
    JSON.stringify({ day: '2000-01-01', data })
  )
  fetch.mockResolvedValue(response())
  await loadDailyQuote()
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('failure remains visible and retry can recover', async () => {
  fetch.mockResolvedValue({ ok: false })
  render(<DailyQuote />)
  expect(await screen.findByRole('status')).toHaveTextContent('正在加载')
  expect(await screen.findByText('一言暂时无法加载。')).toBeInTheDocument()
  fetch.mockResolvedValue(response())
  fireEvent.click(screen.getByRole('button', { name: '重试' }))
  expect(await screen.findByText('测试一言')).toBeInTheDocument()
  expect(screen.getByText('— 测试出处 · 作者')).toBeInTheDocument()
})

test('request timeout rejects and releases the request for retry', async () => {
  jest.useFakeTimers()
  try {
    fetch.mockImplementation(
      (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('timeout')))
        })
    )
    const result = loadDailyQuote()
    const assertion = expect(result).rejects.toThrow('timeout')
    await act(async () => jest.advanceTimersByTime(8000))
    await assertion
    fetch.mockResolvedValue(response())
    await loadDailyQuote()
    expect(fetch).toHaveBeenCalledTimes(2)
  } finally {
    jest.useRealTimers()
  }
})
