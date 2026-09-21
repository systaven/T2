import { waitUntil } from '@vercel/functions'
import { COMMENT_TABLES } from '@/lib/comments/constants'
import {
  commentApiError,
  getActor,
  getClientIp,
  mapCommentRow,
  readCommentSettings,
  sendCommentNotifications,
  safePublicUrl,
  verifyTurnstile,
  hashValue
} from '@/lib/comments/server'
import { getAdminConfig, getAdminDb } from '@/lib/admin/server'

const clean = (value, max) =>
  String(value || '')
    .trim()
    .slice(0, max)
const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export default async function handler(req, res) {
  try {
    const db = getAdminDb()
    const service = getAdminConfig()
    const settings = await readCommentSettings()
    if (req.method === 'GET') {
      const postId = clean(req.query.postId, 128)
      if (!postId) return res.status(400).json({ error: '缺少文章标识。' })
      const guestToken = req.headers['x-guest-token'] || ''
      const actor = await getActor(req, guestToken)
      const { Query } = require('node-appwrite')
      const limit = Math.min(
        Math.max(Number(req.query.limit) || settings.pageSize, 1),
        100
      )
      const sort = ['latest', 'oldest', 'hottest'].includes(req.query.sort)
        ? req.query.sort
        : 'latest'
      const queries = [
        Query.equal('postId', postId),
        Query.equal('status', ['visible', 'deleted']),
        Query.limit(limit)
      ]
      if (req.query.cursor)
        queries.push(Query.cursorAfter(clean(req.query.cursor, 36)))
      if (sort === 'oldest') queries.push(Query.orderAsc('$createdAt'))
      else if (sort === 'hottest') queries.push(Query.orderDesc('likes'))
      else queries.push(Query.orderDesc('$createdAt'))

      const result = await db.listRows({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.comments,
        queries,
        total: true
      })
      let likedIds = new Set()
      if (actor && result.rows.length) {
        const likes = await db.listRows({
          databaseId: service.databaseId,
          tableId: COMMENT_TABLES.likes,
          queries: [Query.equal('actorHash', actor.hash), Query.limit(100)],
          total: false
        })
        likedIds = new Set(likes.rows.map(row => row.commentId))
      }
      const data = result.rows.map(row =>
        mapCommentRow(
          { ...row, viewerLiked: likedIds.has(row.$id) },
          actor?.hash
        )
      )
      return res.status(200).json({
        data,
        total: result.total,
        nextCursor:
          result.rows.length === limit ? result.rows.at(-1)?.$id : null
      })
    }

    if (req.method === 'POST') {
      if (!settings.enabled)
        return res.status(403).json({ error: '评论区当前已关闭。' })
      const body = req.body || {}
      const postId = clean(body.postId, 128)
      const content = clean(body.content, settings.maxCommentLength)
      const guestToken = clean(body.guestToken, 256)
      const actor = await getActor(req, guestToken)
      if (!actor)
        return res
          .status(400)
          .json({ error: '游客身份凭证无效，请刷新后重试。' })
      if (!postId || !content)
        return res.status(400).json({ error: '评论内容不能为空。' })

      const authorName =
        actor.type === 'clerk' ? actor.name : clean(body.authorName, 100)
      const authorEmail =
        actor.type === 'clerk'
          ? actor.email
          : clean(body.authorEmail, 320).toLowerCase()
      if (!authorName) return res.status(400).json({ error: '请填写昵称。' })
      if (actor.type === 'guest' && (!authorEmail || !isEmail(authorEmail))) {
        return res
          .status(400)
          .json({ error: '请填写有效的邮箱地址，邮箱不会公开。' })
      }
      if (actor.type === 'guest' && settings.turnstile.enabled) {
        const verified = await verifyTurnstile({
          token: body.turnstileToken,
          secret: settings.turnstile.secretKey,
          ip: getClientIp(req)
        })
        if (!verified)
          return res
            .status(403)
            .json({ error: '人机验证失败或已过期，请重试。' })
      }

      const { Query } = require('node-appwrite')
      if (settings.rateLimitSeconds > 0) {
        const recent = await db.listRows({
          databaseId: service.databaseId,
          tableId: COMMENT_TABLES.comments,
          queries: [
            Query.equal('actorHash', actor.hash),
            Query.orderDesc('$createdAt'),
            Query.limit(1)
          ],
          total: false
        })
        const latest = recent.rows[0]
        if (
          latest &&
          Date.now() - new Date(latest.$createdAt).getTime() <
            settings.rateLimitSeconds * 1000
        ) {
          return res.status(429).json({
            error: `发布太快了，请等待 ${settings.rateLimitSeconds} 秒。`
          })
        }
      }

      let parent = null
      const parentId = clean(body.parentId, 36)
      if (parentId) {
        parent = await db.getRow({
          databaseId: service.databaseId,
          tableId: COMMENT_TABLES.comments,
          rowId: parentId
        })
        if (parent.postId !== postId || parent.status === 'deleted') {
          return res.status(400).json({ error: '回复目标不存在。' })
        }
      }

      const row = await db.createRow({
        databaseId: service.databaseId,
        tableId: COMMENT_TABLES.comments,
        rowId: 'unique()',
        data: {
          postId,
          postTitle: clean(body.postTitle, 255),
          href: safePublicUrl(clean(body.href, 4000)),
          parentId,
          rootId: parent ? parent.rootId || parent.$id : '',
          authorType: actor.type,
          authorId: actor.id,
          authorName,
          authorEmail,
          authorAvatar: actor.avatar,
          actorHash: actor.hash,
          guestTokenHash: actor.guestTokenHash || '',
          ipHash: hashValue(getClientIp(req)),
          content,
          status: settings.moderationMode === 'review' ? 'pending' : 'visible',
          likes: 0,
          edited: false
        }
      })
      const comment = { id: row.$id, ...row }
      waitUntil(sendCommentNotifications({ comment, parent }))
      return res.status(201).json({
        data: mapCommentRow(row, actor.hash),
        pending: row.status === 'pending'
      })
    }
    return res.status(405).end()
  } catch (error) {
    return commentApiError(res, error)
  }
}
