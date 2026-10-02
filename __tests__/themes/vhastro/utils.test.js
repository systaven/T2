import {
  commentsVisible,
  menuIcon,
  normalizeMenus,
  pageNumbers,
  previewHref
} from '@/themes/vhastro/utils'

describe('vhastro integrations', () => {
  test('maps existing Notion menus without requiring icon properties', () => {
    expect(menuIcon('友链', '/links')).toBe('friends')
    expect(menuIcon('关于我', '/about')).toBe('about')
    expect(menuIcon('订阅', '/feed')).toBe('rss')
    expect(menuIcon('我的项目', '/projects')).toBe('link')
  })
  test('accepts both menu formats, preserves submenus and removes hidden entries', () => {
    const menus = normalizeMenus([
      null,
      { title: '关于', url: '/about' },
      { name: '更多', children: [{ label: '友链', href: '/links' }] },
      { name: '隐藏', href: '/hide', show: false }
    ])
    expect(menus).toHaveLength(2)
    expect(menus[0].href).toBe('/about')
    expect(menus[1].children[0].name).toBe('友链')
  })
  test('preview links remain identical between server and browser and preserve anchors', () => {
    expect(previewHref('/post#heading', '/?theme=vhastro')).toBe(
      '/post?theme=vhastro#heading'
    )
    expect(previewHref('/post?lang=en', '/?theme=vhastro')).toBe(
      '/post?lang=en&theme=vhastro'
    )
    expect(previewHref('/post?theme=fuwari', '/?theme=vhastro')).toBe(
      '/post?theme=fuwari'
    )
    expect(previewHref('/post', '/')).toBe('/post')
    for (const href of [
      '/admin',
      '/admin/account',
      '/r/abc',
      'https://example.com',
      '//example.com',
      '#heading'
    ])
      expect(previewHref(href, '/?theme=vhastro')).toBe(href)
  })
  test('never mounts comments on locked or Notion-hidden pages', () => {
    expect(commentsVisible({ id: 'a' }, false)).toBe(true)
    expect(commentsVisible({ comment: 'Hide' }, false)).toBe(false)
    expect(commentsVisible({ comment: 'hide' }, false)).toBe(false)
    expect(commentsVisible({ id: 'a' }, true)).toBe(false)
    expect(commentsVisible({ id: 'a' }, false, 'false')).toBe(false)
    expect(commentsVisible(null, false)).toBe(false)
  })
  test('large pagination is compact and includes current and endpoint pages', () => {
    expect(pageNumbers(10, 20)).toEqual([1, '…', 8, 9, 10, 11, 12, '…', 20])
    expect(pageNumbers(1, 2)).toEqual([1, 2])
  })
})
