import { COMMENT_TABLES } from '@/lib/comments/constants'
import {
  getAdminConfig,
  getAdminDb,
  requireAdmin,
  sendAdminError
} from '@/lib/admin/server'

const definitions = [
  {
    tableId: COMMENT_TABLES.comments,
    name: 'Native comments',
    columns: [
      { key: 'postId', type: 'varchar', size: 128, required: true },
      { key: 'postTitle', type: 'varchar', size: 255, required: false },
      { key: 'href', type: 'text', required: false },
      { key: 'parentId', type: 'varchar', size: 36, required: false },
      { key: 'rootId', type: 'varchar', size: 36, required: false },
      { key: 'authorType', type: 'varchar', size: 16, required: true },
      { key: 'authorId', type: 'varchar', size: 128, required: false },
      { key: 'authorName', type: 'varchar', size: 100, required: true },
      { key: 'authorEmail', type: 'varchar', size: 320, required: false },
      { key: 'authorAvatar', type: 'text', required: false },
      { key: 'actorHash', type: 'varchar', size: 64, required: true },
      { key: 'guestTokenHash', type: 'varchar', size: 64, required: false },
      { key: 'ipHash', type: 'varchar', size: 64, required: false },
      { key: 'content', type: 'mediumtext', required: true },
      { key: 'status', type: 'varchar', size: 16, required: true },
      { key: 'likes', type: 'integer', required: true, default: 0 },
      { key: 'edited', type: 'boolean', required: true, default: false }
    ],
    indexes: [
      {
        key: 'native_comments_post_status',
        type: 'key',
        attributes: ['postId', 'status']
      },
      {
        key: 'native_comments_post_hot',
        type: 'key',
        attributes: ['postId', 'status', 'likes']
      },
      { key: 'native_comments_actor', type: 'key', attributes: ['actorHash'] },
      { key: 'native_comments_parent', type: 'key', attributes: ['parentId'] }
    ]
  },
  {
    tableId: COMMENT_TABLES.likes,
    name: 'Native comment likes',
    columns: [
      { key: 'commentId', type: 'varchar', size: 36, required: true },
      { key: 'actorHash', type: 'varchar', size: 64, required: true }
    ],
    indexes: [
      {
        key: 'native_comment_like_unique',
        type: 'unique',
        attributes: ['commentId', 'actorHash']
      }
    ]
  },
  {
    tableId: COMMENT_TABLES.reactions,
    name: 'Native article reactions',
    columns: [
      { key: 'postId', type: 'varchar', size: 128, required: true },
      { key: 'votes', type: 'mediumtext', required: true }
    ],
    indexes: [
      {
        key: 'native_article_reaction_post',
        type: 'unique',
        attributes: ['postId']
      }
    ]
  },
  {
    tableId: COMMENT_TABLES.settings,
    name: 'Native comment settings',
    columns: [
      { key: 'payload', type: 'mediumtext', required: true, encrypt: true },
      { key: 'updatedBy', type: 'varchar', size: 128, required: false }
    ],
    indexes: []
  }
]

const tableExists = async (db, databaseId, tableId) => {
  try {
    await db.getTable({ databaseId, tableId })
    return true
  } catch (error) {
    if (error?.code === 404) return false
    throw error
  }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end()
  try {
    await requireAdmin(req)
    const db = getAdminDb()
    const { databaseId } = getAdminConfig()
    const status = {}
    for (const definition of definitions) {
      status[definition.tableId] = await tableExists(
        db,
        databaseId,
        definition.tableId
      )
    }
    if (req.method === 'GET') {
      return res
        .status(200)
        .json({ ready: Object.values(status).every(Boolean), tables: status })
    }
    for (const definition of definitions) {
      if (status[definition.tableId]) continue
      await db.createTable({
        databaseId,
        tableId: definition.tableId,
        name: definition.name,
        rowSecurity: false,
        enabled: true,
        columns: definition.columns,
        indexes: definition.indexes
      })
      status[definition.tableId] = true
    }
    return res.status(201).json({ ready: true, tables: status })
  } catch (error) {
    return sendAdminError(res, error)
  }
}
