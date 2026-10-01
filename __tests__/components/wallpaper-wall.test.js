import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import WallpaperWall from '@/components/wallpapers/WallpaperWall'

jest.mock('react-photo-view', () => ({
  PhotoSlider: ({ visible, index, images, onClose }) =>
    visible ? (
      <div role='dialog' aria-label='图片预览'>
        <span>{images[index]?.key}</span>
        <button onClick={onClose}>关闭预览</button>
      </div>
    ) : null
}))
const artwork = {
  id: '123-0',
  pid: '123',
  title: '山间清晨',
  author: '画师',
  width: 1920,
  height: 1080,
  tags: ['风景'],
  preview: 'https://i.pixiv.re/image.jpg',
  original: 'https://i.pixiv.re/original.jpg',
  artworkUrl: 'https://www.pixiv.net/artworks/123',
  authorUrl: 'https://www.pixiv.net/users/456'
}
beforeEach(() => {
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          enabled: true,
          items: [artwork],
          hasMore: false,
          source: 'daily'
        })
    })
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  AbortSignal.timeout = jest.fn(() => new AbortController().signal)
})

test('wall renders in StrictMode, filters loaded works, and opens preview', async () => {
  render(
    <StrictMode>
      <WallpaperWall />
    </StrictMode>
  )
  await screen.findByRole('button', { name: '预览 山间清晨' })
  expect(global.fetch).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('link', { name: '返回博客' })).toHaveAttribute(
    'href',
    '/'
  )
  fireEvent.click(screen.getByRole('button', { name: '预览 山间清晨' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('123-0')
  fireEvent.click(screen.getByRole('button', { name: '关闭预览' }))
  fireEvent.click(screen.getByRole('button', { name: '手机壁纸' }))
  expect(
    screen.queryByRole('button', { name: '预览 山间清晨' })
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '清空筛选' }))
  fireEvent.change(screen.getByLabelText('搜索已加载的作品'), {
    target: { value: '不存在' }
  })
  expect(
    screen.queryByRole('button', { name: '预览 山间清晨' })
  ).not.toBeInTheDocument()
})

test('download failure stays on the wall and shows the API error', async () => {
  render(<WallpaperWall />)
  await screen.findByRole('button', { name: '下载 山间清晨' })
  global.fetch.mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: '原图源响应超时' })
  })
  fireEvent.click(screen.getByRole('button', { name: '下载 山间清晨' }))
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('原图源响应超时')
  )
  expect(
    screen.getByRole('button', { name: '预览 山间清晨' })
  ).toBeInTheDocument()
})
