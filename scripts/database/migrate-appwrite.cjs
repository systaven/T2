#!/usr/bin/env node
// Compatibility entry point for the verified, schema-aware batch migration tool.
// See appwrite_to_supabase.py --help. Backups retain raw source metadata.
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const result = spawnSync('python3', [path.join(__dirname, 'appwrite_to_supabase.py'), ...process.argv.slice(2)], { stdio: 'inherit', env: process.env })
if (result.error) { console.error(result.error.message); process.exitCode = 1 }
else process.exitCode = result.status === null ? 1 : result.status
