import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server.node'
import Footer from '@/themes/fuwari/components/Footer'

jest.mock('@/lib/config', () => ({
  siteConfig: key => ({ SINCE: '2021', AUTHOR: '测试博客', VERSION: '1' })[key]
}))
jest.mock(
  '@/components/BeiAnSite',
  () =>
    function BeiAnSite() {
      return <span>网站备案</span>
    }
)
jest.mock('@/components/BeiAnGongAn', () => ({
  BeiAnGongAn: () => <div>公安备案</div>
}))

test('footer markup survives HTML parsing and hydration without invalid nesting', async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  container.innerHTML = renderToString(<Footer />)
  const original = container.querySelector('footer')
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {})
  let root
  await act(() => {
    root = hydrateRoot(container, <Footer />)
    return Promise.resolve()
  })
  expect(container.querySelector('footer')).toBe(original)
  expect(container.querySelectorAll('footer')).toHaveLength(1)
  expect(container.querySelector('p div')).toBeNull()
  expect(errors).not.toHaveBeenCalled()
  act(() => root.unmount())
  container.remove()
  errors.mockRestore()
})
