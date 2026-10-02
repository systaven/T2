import { render, screen, waitFor } from '@testing-library/react'
import {
  buildThemeColorStyle,
  contrastRatio,
  normalizeThemeColor
} from '@/themes/vhastro/color'
import { LayoutBase } from '@/themes/vhastro'
import SearchDialog from '@/themes/vhastro/components/SearchDialog'

jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback) =>
    key === 'VHASTRO_THEME_COLOR' ? '#a855f7' : fallback
}))
jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ isDarkMode: false, toggleDarkMode: jest.fn() })
}))
jest.mock('next/router', () => ({
  useRouter: () => ({ pathname: '/search', asPath: '/search', query: {} })
}))

test('defaults to Fuwari blue with readable accents and safely falls back on invalid values', () => {
  const original = buildThemeColorStyle('#3aa8df')
  expect(original['--vh-custom-bright']).toBe('#3aa8df')
  expect(original['--vh-custom-accent-dark']).toBe('#5abff2')
  expect(
    contrastRatio(original['--vh-custom-accent-light'], '#ffffff')
  ).toBeGreaterThanOrEqual(4.5)
  expect(
    contrastRatio(original['--vh-custom-accent-dark'], '#222c36')
  ).toBeGreaterThanOrEqual(4.5)
  for (const value of [
    '',
    null,
    'red',
    '#12',
    'red; background:url(https://example.com)'
  ])
    expect(buildThemeColorStyle(value)).toEqual(original)
  expect(normalizeThemeColor(' #AbC ')).toBe('#aabbcc')
})

test.each(['#a855f7', '#ffffff', '#000000', '#ffff00', '#ff0000'])(
  'derives readable light and dark accents from %s',
  color => {
    const palette = buildThemeColorStyle(color)
    expect(palette['--vh-custom-bright']).toBe(color)
    expect(
      contrastRatio(palette['--vh-custom-accent-light'], '#ffffff')
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(palette['--vh-custom-accent-dark'], '#222c36')
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(
        palette['--vh-custom-accent-dark'],
        palette['--vh-custom-on-accent-dark']
      )
    ).toBeGreaterThanOrEqual(4.5)
    expect(palette['--vh-custom-soft-light']).toBe(`${color}1a`)
  }
)

test('applies the same configured palette to theme root and portalled search dialog', async () => {
  const { container } = render(
    <LayoutBase siteInfo={{ title: '站点' }}>正文</LayoutBase>
  )
  const expected = buildThemeColorStyle('#a855f7')
  const root = container.querySelector('#theme-vhastro')
  expect(root.style.getPropertyValue('--vh-custom-bright')).toBe('#a855f7')
  render(<SearchDialog open onClose={() => {}} />)
  const dialog = screen.getByRole('dialog')
  for (const [key, value] of Object.entries(expected)) {
    expect(root.style.getPropertyValue(key)).toBe(value)
    expect(dialog.style.getPropertyValue(key)).toBe(value)
  }
  await waitFor(() => expect(screen.getByRole('searchbox')).toHaveFocus())
})

test('reads the public environment variable from theme configuration', () => {
  const original = process.env.NEXT_PUBLIC_VHASTRO_THEME_COLOR
  try {
    process.env.NEXT_PUBLIC_VHASTRO_THEME_COLOR = '#ff8800'
    jest.isolateModules(() => {
      expect(
        require('@/themes/vhastro/config').default.VHASTRO_THEME_COLOR
      ).toBe('#ff8800')
    })
  } finally {
    if (original === undefined)
      delete process.env.NEXT_PUBLIC_VHASTRO_THEME_COLOR
    else process.env.NEXT_PUBLIC_VHASTRO_THEME_COLOR = original
  }
})
