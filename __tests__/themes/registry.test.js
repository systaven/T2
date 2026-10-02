import fs from 'node:fs'
import path from 'node:path'

test('build-time theme registry preserves every existing theme without runtime config', () => {
  const directory = path.join(process.cwd(), 'themes')
  const expected = fs
    .readdirSync(directory)
    .filter(name => fs.statSync(path.join(directory, name)).isDirectory())
  const previous = process.env.NOTIONNEXT_AVAILABLE_THEMES
  const config = require('../../next.config')
  // Jest does not perform Next's build-time replacement of config.env values.
  process.env.NOTIONNEXT_AVAILABLE_THEMES =
    config.env.NOTIONNEXT_AVAILABLE_THEMES
  try {
    jest.isolateModules(() => {
      const { THEMES } = require('@/themes/theme')
      expect([...THEMES].sort()).toEqual(expected.sort())
      expect(THEMES).toContain('vhastro')
      expect(THEMES).toContain('fuwari')
      expect(config.publicRuntimeConfig).toBeUndefined()
    })
  } finally {
    if (previous === undefined) delete process.env.NOTIONNEXT_AVAILABLE_THEMES
    else process.env.NOTIONNEXT_AVAILABLE_THEMES = previous
  }
})
