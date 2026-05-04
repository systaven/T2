#!/usr/bin/env node
// scans the repo for files that use React hooks (useState, useEffect, etc.)
// but do not import them from 'react'.

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const exts = ['.js', '.jsx', '.ts', '.tsx']
const hooks = ['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'useImperativeHandle', 'useLayoutEffect']

function walk(dir) {
  const results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const full = path.join(dir, file)
    const stat = fs.statSync(full)
    if (stat && stat.isDirectory()) {
      if (file === 'node_modules' || file === '.next' || file === '.git') continue
      results.push(...walk(full))
    } else {
      if (exts.includes(path.extname(full))) results.push(full)
    }
  }
  return results
}

function fileUsesHook(content, hook) {
  const re = new RegExp(`\\b${hook}\\s*\\(`)
  return re.test(content)
}

function hasReactImport(content) {
  // matches import ... from 'react' or import React from 'react' or import * as React from 'react'
  return /from\s+['"]react['"]/.test(content) || /import\s+React\b/.test(content) || /import\s+\*\s+as\s+React/.test(content)
}

function importsHook(content, hook) {
  // check named import like import { useState, useEffect } from 'react'
  const re = new RegExp("from\\s+['\"]react['\"][\s\S]*\\{[^}]*\\b" + hook + "\\b[^}]*\\}")
  if (re.test(content)) return true
  // check React.useState usage
  if (new RegExp('React\\.' + hook + '\\b').test(content)) return true
  return false
}

const files = walk(root)
const offenders = []
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  for (const hook of hooks) {
    if (fileUsesHook(content, hook)) {
      // if file has any import from react that includes the hook or uses React.hook, it's OK
      if (!importsHook(content, hook)) {
        offenders.push({ file, hook })
        break
      }
    }
  }
}

if (offenders.length === 0) {
  console.log('No missing React hook imports found.')
  process.exit(0)
}

console.log('Files using React hooks without importing them:')
for (const o of offenders) {
  console.log('-', path.relative(root, o.file), '(uses', o.hook + ')')
}

console.log('\nRun `node scripts/find-missing-react-hook-imports.js` to reproduce this check locally.')
process.exit(1)
