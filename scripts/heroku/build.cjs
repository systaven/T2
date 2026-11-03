const { spawnSync } = require('node:child_process')
// Static page generation must never mutate the production business database.
// Runtime/release processes retain their configured credentials.
const env = { ...process.env, DATABASE_PROVIDER: 'postgres' }
delete env.DATABASE_URL
const build = spawnSync('yarn', ['build'], { env, stdio: 'inherit' })
if (build.error) throw build.error
if (build.status !== 0) process.exit(build.status || 1)
require('./package.cjs')
