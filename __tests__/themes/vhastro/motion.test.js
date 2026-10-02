import { act, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import usePageMotion from '@/themes/vhastro/usePageMotion'
import HeroParticles from '@/themes/vhastro/components/HeroParticles'

const originalMatchMedia = window.matchMedia
const originalAnimate = HTMLElement.prototype.animate
const originalObserver = global.IntersectionObserver
afterEach(() => {
  window.matchMedia = originalMatchMedia
  HTMLElement.prototype.animate = originalAnimate
  global.IntersectionObserver = originalObserver
})

function Page({ router, children }) {
  const ref = useRef(null)
  usePageMotion(ref, router)
  return <main ref={ref}>{children}</main>
}

test('route motion keeps the page node alive and restores it after failed navigation', () => {
  const handlers = {}
  const cancel = jest.fn()
  HTMLElement.prototype.animate = jest.fn(() => ({ cancel }))
  const events = {
    on: jest.fn((name, callback) => {
      handlers[name] = callback
    }),
    off: jest.fn()
  }
  const { rerender, unmount } = render(<Page router={{ events }}>首页</Page>)
  const node = screen.getByRole('main')
  expect(node.animate).toHaveBeenCalledTimes(1)
  act(() => handlers.routeChangeStart('/article', { shallow: false }))
  expect(node.animate).toHaveBeenCalledTimes(2)
  act(() => handlers.routeChangeError())
  expect(cancel).toHaveBeenCalled()
  rerender(<Page router={{ events }}>文章</Page>)
  expect(screen.getByRole('main')).toBe(node)
  act(() => handlers.routeChangeComplete())
  expect(node.animate).toHaveBeenCalledTimes(3)
  unmount()
  expect(events.off).toHaveBeenCalledTimes(3)
})

test('reduced motion skips page animations', () => {
  window.matchMedia = () => ({ matches: true })
  HTMLElement.prototype.animate = jest.fn()
  render(<Page router={{}}>文章</Page>)
  expect(HTMLElement.prototype.animate).not.toHaveBeenCalled()
})

test('decorative particles pause outside the viewport and disconnect on unmount', () => {
  let callback
  const disconnect = jest.fn()
  global.IntersectionObserver = jest.fn(function (handler) {
    callback = handler
    this.observe = jest.fn()
    this.disconnect = disconnect
  })
  const { container, unmount } = render(<HeroParticles />)
  const layer = container.firstElementChild
  expect(layer).toHaveAttribute('aria-hidden', 'true')
  expect(layer.children).toHaveLength(28)
  act(() => callback([{ isIntersecting: false }]))
  expect(layer).toHaveAttribute('data-paused', 'true')
  act(() => callback([{ isIntersecting: true }]))
  expect(layer).toHaveAttribute('data-paused', 'false')
  unmount()
  expect(disconnect).toHaveBeenCalledTimes(1)
})
