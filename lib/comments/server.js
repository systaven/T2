import { clerkClient, getAuth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import {
  COMMENT_TABLES,
  DEFAULT_COMMENT_SETTINGS,
  normalizeCommentSettings,
  publicCommentSettings,
  REACTIONS
} from './constants'
import { getAdminConfig, getAdminDb, getClerkEmail } from '@/lib/admin/server'

const SETTINGS_ROW_ID = 'comment-settings'
const settingsCache = { value: null, expiresAt: 0 }
const SETTINGS_CACHE_TTL = 60 * 1000

export const hashValue = value =>
  crypto
    .createHash('sha256')
    .update(String(value || ''))
    .digest('hex')

export const getClientIp = req =>
  String(
    req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      String(req.headers['x-forwarded-for'] || '').split(',')[0] ||
      req.socket?.remoteAddress ||
      ''
  ).trim()

export const safePublicUrl = value => {
  try {
    const url = new URL(
      String(value || ''),
      process.env.NEXT_PUBLIC_LINK || 'http://localhost'
    )
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

export const getOptionalClerkUser = async req => {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null
  try {
    const { userId } = getAuth(req)
    return userId ? await clerkClient.users.getUser(userId) : null
  } catch {
    return null
  }
}

export const getActor = async (req, guestToken) => {
  const user = await getOptionalClerkUser(req)
  if (user) {
    return {
      type: 'clerk',
      id: user.id,
      hash: hashValue(`clerk:${user.id}`),
      name:
        user.fullName || user.username || getClerkEmail(user) || '已登录用户',
      email: getClerkEmail(user),
      avatar: user.imageUrl || '',
      user
    }
  }
  if (!guestToken || String(guestToken).length < 24) return null
  return {
    type: 'guest',
    id: '',
    hash: hashValue(`guest:${guestToken}`),
    guestTokenHash: hashValue(guestToken),
    name: '',
    email: '',
    avatar: '',
    user: null
  }
}

export const readCommentSettings = async ({ fresh = false } = {}) => {
  if (!fresh && settingsCache.value && settingsCache.expiresAt > Date.now()) {
    return settingsCache.value
  }
  try {
    const db = getAdminDb()
    const service = getAdminConfig()
    const row = await db.getRow({
      databaseId: service.databaseId,
      tableId: COMMENT_TABLES.settings,
      rowId: SETTINGS_ROW_ID
    })
    const settings = normalizeCommentSettings(JSON.parse(row.payload || '{}'))
    settingsCache.value = settings
    settingsCache.expiresAt = Date.now() + SETTINGS_CACHE_TTL
    return settings
  } catch (error) {
    if (error?.code !== 404)
      console.warn('[comments] settings fallback:', error.message)
    return normalizeCommentSettings(DEFAULT_COMMENT_SETTINGS)
  }
}

export const writeCommentSettings = async (settings, userId) => {
  const db = getAdminDb()
  const service = getAdminConfig()
  const normalized = normalizeCommentSettings(settings)
  const data = { payload: JSON.stringify(normalized), updatedBy: userId || '' }
  try {
    await db.updateRow({
      databaseId: service.databaseId,
      tableId: COMMENT_TABLES.settings,
      rowId: SETTINGS_ROW_ID,
      data
    })
  } catch (error) {
    if (error?.code !== 404) throw error
    await db.createRow({
      databaseId: service.databaseId,
      tableId: COMMENT_TABLES.settings,
      rowId: SETTINGS_ROW_ID,
      data
    })
  }
  settingsCache.value = normalized
  settingsCache.expiresAt = Date.now() + SETTINGS_CACHE_TTL
  return normalized
}

export const getPublicCommentConfig = async () =>
  publicCommentSettings(await readCommentSettings())

const allowedTags = {
  p: [],
  br: [],
  strong: [],
  em: [],
  del: [],
  blockquote: [],
  ul: [],
  ol: [],
  li: [],
  code: ['class'],
  pre: [],
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title']
}

export const renderComment = content => {
  const source = String(content || '').trim()
  const raw = marked.parse(source, { breaks: true, gfm: true })
  return sanitizeHtml(raw, {
    allowedTags: Object.keys(allowedTags),
    allowedAttributes: allowedTags,
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (_tag, attrs) => ({
        tagName: 'a',
        attribs: {
          ...attrs,
          target: '_blank',
          rel: 'nofollow noreferrer noopener'
        }
      }),
      img: (_tag, attrs) => ({
        tagName: 'img',
        attribs: { ...attrs, loading: 'lazy' }
      })
    }
  })
}

export const mapCommentRow = (row, actorHash = '') => ({
  id: row.$id,
  postId: row.postId,
  parentId: row.parentId || '',
  rootId: row.rootId || '',
  authorType: row.authorType,
  authorName: row.authorName,
  authorAvatar: row.authorAvatar || '',
  content: row.status === 'deleted' ? '' : row.content,
  html: row.status === 'deleted' ? '' : renderComment(row.content),
  status: row.status,
  likes: row.likes || 0,
  liked: Boolean(row.viewerLiked),
  edited: Boolean(row.edited),
  canManage: Boolean(actorHash && row.actorHash === actorHash),
  createdAt: row.$createdAt,
  updatedAt: row.$updatedAt
})

export const verifyTurnstile = async ({ token, secret, ip }) => {
  if (!token || !secret) return false
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip })
    }
  )
  if (!response.ok) return false
  const result = await response.json()
  return (
    result.success === true && (!result.action || result.action === 'comment')
  )
}

const getNotificationTitle = comment =>
  `${comment.authorName || '访客'} 在《${comment.postTitle || '文章'}》留下了评论`

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json().catch(() => ({}))
}

const sendEmail = async ({ settings, to, subject, html }) => {
  const jobs = []
  const { smtp, resend } = settings.notifications
  if (smtp.enabled && smtp.host && smtp.user && smtp.password && to) {
    jobs.push(
      (() => {
        const nodemailer = require('nodemailer')
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: Number(smtp.port) || 465,
          secure: Boolean(smtp.secure),
          auth: { user: smtp.user, pass: smtp.password }
        })
        return transporter.sendMail({
          from: `${smtp.fromName || '评论通知'} <${smtp.fromEmail || smtp.user}>`,
          to,
          subject,
          html
        })
      })()
    )
  }
  if (resend.enabled && resend.apiKey && resend.from && to) {
    jobs.push(
      fetchJson('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resend.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from: resend.from, to: [to], subject, html })
      })
    )
  }
  return Promise.allSettled(jobs)
}

const sendPush = async ({ settings, title, content, url }) => {
  const n = settings.notifications
  const jobs = []
  if (n.serverchan.enabled && n.serverchan.token) {
    jobs.push(
      fetchJson(`https://sctapi.ftqq.com/${n.serverchan.token}.send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          desp: `${content}\n\n[查看评论](${url})`
        })
      })
    )
  }
  if (n.pushplus.enabled && n.pushplus.token) {
    jobs.push(
      fetchJson('https://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: n.pushplus.token,
          title,
          content: `${content}\n${url}`,
          template: 'markdown'
        })
      })
    )
  }
  if (n.telegram.enabled && n.telegram.botToken && n.telegram.chatId) {
    jobs.push(
      fetchJson(
        `https://api.telegram.org/bot${n.telegram.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: n.telegram.chatId,
            text: `${title}\n\n${content}\n\n${url}`
          })
        }
      )
    )
  }
  if (n.bark.enabled && n.bark.endpoint) {
    jobs.push(
      fetchJson(n.bark.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body: content, url })
      })
    )
  }
  for (const key of ['feishu', 'dingtalk', 'wecom']) {
    const channel = n[key]
    if (!channel?.enabled || !channel.webhook) continue
    const body =
      key === 'feishu'
        ? {
            msg_type: 'text',
            content: { text: `${title}\n${content}\n${url}` }
          }
        : { msgtype: 'text', text: { content: `${title}\n${content}\n${url}` } }
    jobs.push(
      fetchJson(channel.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    )
  }
  if (n.webhook.enabled && n.webhook.url) {
    jobs.push(
      fetchJson(n.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(n.webhook.bearerToken
            ? { Authorization: `Bearer ${n.webhook.bearerToken}` }
            : {})
        },
        body: JSON.stringify({ event: 'comment.created', title, content, url })
      })
    )
  }
  return Promise.allSettled(jobs)
}

export const testCommentNotifications = async settings => {
  const title = '评论通知测试'
  const content = '如果你收到了这条消息，说明该通知渠道配置正确。'
  const url = String(process.env.NEXT_PUBLIC_LINK || 'https://example.com')
  const jobs = [sendPush({ settings, title, content, url })]
  if (settings.notifications.adminEmail) {
    jobs.push(
      sendEmail({
        settings,
        to: settings.notifications.adminEmail,
        subject: title,
        html: `<p>${content}</p>`
      })
    )
  }
  const groups = await Promise.all(jobs)
  const results = groups.flat()
  const failed = results.filter(result => result.status === 'rejected')
  if (results.length === 0) throw new Error('请至少启用并填写一个通知渠道。')
  if (failed.length === results.length) {
    throw new Error(failed[0]?.reason?.message || '所有通知渠道都发送失败。')
  }
  return { sent: results.length - failed.length, failed: failed.length }
}

export const sendCommentNotifications = async ({ comment, parent }) => {
  const settings = await readCommentSettings()
  const title = getNotificationTitle(comment)
  const content = String(comment.content || '').slice(0, 500)
  const baseUrl = String(process.env.NEXT_PUBLIC_LINK || '').replace(/\/$/, '')
  const url = `${safePublicUrl(comment.href) || baseUrl}#comment-${comment.id || ''}`
  const jobs = []
  if (settings.notifications.notifyAdmin) {
    jobs.push(sendPush({ settings, title, content, url }))
    if (settings.notifications.adminEmail) {
      jobs.push(
        sendEmail({
          settings,
          to: settings.notifications.adminEmail,
          subject: title,
          html: `<p>${sanitizeHtml(content)}</p><p><a href="${url}">查看评论</a></p>`
        })
      )
    }
  }
  if (
    parent?.authorEmail &&
    settings.notifications.notifyReplies &&
    parent.authorEmail !== comment.authorEmail
  ) {
    jobs.push(
      sendEmail({
        settings,
        to: parent.authorEmail,
        subject: `${parent.authorName}，你的评论收到了回复`,
        html: `<p>${sanitizeHtml(content)}</p><p><a href="${url}">查看回复</a></p>`
      })
    )
  }
  await Promise.allSettled(jobs)
}

export const buildEmptyReactionState = () => ({
  counts: Object.fromEntries(REACTIONS.map(item => [item.id, 0])),
  voters: {}
})

export const safeReactionState = value => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    const state = buildEmptyReactionState()
    state.voters =
      parsed?.voters && typeof parsed.voters === 'object' ? parsed.voters : {}
    for (const reaction of REACTIONS) {
      state.counts[reaction.id] = Number(parsed?.counts?.[reaction.id]) || 0
    }
    return state
  } catch {
    return buildEmptyReactionState()
  }
}

export const commentApiError = (res, error) => {
  const rawMessage = String(error?.message || '')
  const missingTable =
    error?.code === 404 &&
    /native_(comments|comment_likes|article_reactions|comment_settings)/i.test(
      rawMessage
    )
  const missingScopes = /missing scopes/i.test(rawMessage)
  const status = missingTable || missingScopes
    ? 503
    : error?.statusCode || error?.code || 500
  if (status >= 500) console.error('[comments]', error)
  const message = missingTable
    ? '评论数据表尚未初始化，请管理员进入 /admin → 评论设置，点击“一键初始化”。'
    : missingScopes
      ? '评论服务的 Appwrite API Key 权限不足，请管理员补齐 Databases 读写权限。'
      : error?.message || '评论服务暂时不可用'
  return res
    .status(status)
    .json({ error: message })
}
