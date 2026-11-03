const fs = require('node:fs')
const path = require('node:path')
const root = path.join(__dirname, '../..')
const standalone = path.join(root, '.next/standalone')
if (!fs.existsSync(path.join(standalone, 'server.js')))
  throw new Error('Build the standalone Next.js server first')
for (const [source, target] of [
  ['public', 'public'],
  ['.next/static', '.next/static']
]) {
  fs.cpSync(path.join(root, source), path.join(standalone, target), {
    recursive: true
  })
}
// Webpack caches are reproducible and should not inflate the Heroku slug.
fs.rmSync(path.join(root, '.next/cache'), { recursive: true, force: true })
console.log('Standalone server packaged with public files and Next.js assets.')
