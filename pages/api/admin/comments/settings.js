import { maskSecret, normalizeCommentSettings } from '@/lib/comments/constants'
import {
  readCommentSettings,
  testCommentNotifications,
  writeCommentSettings
} from '@/lib/comments/server'
import { requireAdmin, sendAdminError } from '@/lib/admin/server'

const secretPaths = [
  ['turnstile', 'secretKey'],
  ['imageUpload', 'token'],
  ['notifications', 'smtp', 'password'],
  ['notifications', 'resend', 'apiKey'],
  ['notifications', 'serverchan', 'token'],
  ['notifications', 'pushplus', 'token'],
  ['notifications', 'telegram', 'botToken'],
  ['notifications', 'webhook', 'bearerToken']
]

const clone = value => JSON.parse(JSON.stringify(value))
const getAt = (object, path) =>
  path.reduce((value, key) => value?.[key], object)
const setAt = (object, path, value) => {
  let target = object
  path.slice(0, -1).forEach(key => {
    target = target[key]
  })
  target[path.at(-1)] = value
}

const masked = settings => {
  const output = clone(settings)
  secretPaths.forEach(path =>
    setAt(output, path, maskSecret(getAt(settings, path)))
  )
  return output
}

const restoreMasked = (next, current) => {
  const output = clone(next)
  secretPaths.forEach(path => {
    const value = getAt(output, path)
    if (String(value || '').includes('••'))
      setAt(output, path, getAt(current, path) || '')
  })
  return output
}

export default async function handler(req, res) {
  if (!['GET', 'PUT', 'POST'].includes(req.method)) return res.status(405).end()
  try {
    const user = await requireAdmin(req)
    const current = await readCommentSettings({ fresh: true })
    if (req.method === 'GET')
      return res.status(200).json({ data: masked(current) })
    const next = normalizeCommentSettings(
      restoreMasked(req.body?.settings || req.body || {}, current)
    )
    if (req.method === 'POST') {
      const result = await testCommentNotifications(next)
      return res.status(200).json(result)
    }
    const saved = await writeCommentSettings(next, user.id)
    return res.status(200).json({ data: masked(saved) })
  } catch (error) {
    return sendAdminError(res, error)
  }
}
