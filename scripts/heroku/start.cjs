const path = require('node:path')
process.env.HOSTNAME = '0.0.0.0'
process.env.PORT = process.env.PORT || '3000'
require(path.join(__dirname, '../../.next/standalone/server.js'))
