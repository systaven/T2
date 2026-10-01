import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import WallpaperSettingsPanel from '@/components/admin/WallpaperSettingsPanel'
import { DEFAULT_WALLPAPER_SETTINGS } from '@/lib/wallpapers/constants'

test('admin can change source, save settings, and receives confirmation', async () => {
  const api = jest.fn().mockResolvedValue({ data: DEFAULT_WALLPAPER_SETTINGS })
  const notify = jest.fn()
  render(<WallpaperSettingsPanel api={api} notify={notify} />)
  fireEvent.change(await screen.findByLabelText('默认数据源'), {
    target: { value: 'weekly' }
  })
  expect(screen.getByText('有尚未保存的修改')).toBeInTheDocument()
  api.mockResolvedValue({
    data: { ...DEFAULT_WALLPAPER_SETTINGS, source: 'weekly' }
  })
  fireEvent.click(screen.getByRole('button', { name: '保存设置' }))
  await waitFor(() => expect(notify).toHaveBeenCalledWith('壁纸墙设置已保存。'))
  expect(api).toHaveBeenLastCalledWith(
    '/api/admin/wallpapers',
    expect.objectContaining({ method: 'PUT' })
  )
  expect(JSON.parse(api.mock.calls.at(-1)[1].body).settings.source).toBe(
    'weekly'
  )
  expect(screen.getByText('设置已同步')).toBeInTheDocument()
})

test('failed save keeps edits and exposes the error through existing notifications', async () => {
  const api = jest.fn().mockResolvedValue({ data: DEFAULT_WALLPAPER_SETTINGS })
  const notify = jest.fn()
  render(<WallpaperSettingsPanel api={api} notify={notify} />)
  fireEvent.change(await screen.findByLabelText('图片代理域名'), {
    target: { value: 'proxy.example.com' }
  })
  api.mockRejectedValue(new Error('服务暂时不可用'))
  fireEvent.click(screen.getByRole('button', { name: '保存设置' }))
  await waitFor(() =>
    expect(notify).toHaveBeenCalledWith('服务暂时不可用', 'error')
  )
  expect(screen.getByText('有尚未保存的修改')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '保存设置' })).not.toBeDisabled()
})
