import { fireEvent, render, screen } from '@testing-library/react'
import CoverImage from '@/themes/vhastro/components/CoverImage'

test('replaces a broken cover and accepts a subsequent URL', () => {
  const { rerender } = render(
    <CoverImage src='/broken.jpg' alt='封面' fallback={<span>随笔</span>} />
  )
  fireEvent.error(screen.getByRole('img'))
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByText('随笔')).toBeInTheDocument()
  rerender(<CoverImage src='/working.jpg' alt='封面' />)
  expect(screen.getByRole('img')).toHaveAttribute('src', '/working.jpg')
})

test('does not render a broken image when the cover is absent', () => {
  render(<CoverImage fallback={<span>文章</span>} />)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByText('文章')).toBeInTheDocument()
})
