import {
  buildSiteContentSignature,
  clearDerivedContentCache,
  getAllPathsForRevalidation,
  getAuthorizedToken,
  getRevalidationToken,
  revalidatePaths
} from '@/lib/revalidation'
import {
  getDataFromCache,
  setDataToCache
} from '@/lib/cache/cache_manager'

const SIGNATURE_CACHE_KEY = 'notion_sync_signature'
const SIGNATURE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30

function getSyncToken() {
  return (
    process.env.NOTION_SYNC_TOKEN ||
    process.env.REVALIDATION_TOKEN ||
    ''
  )
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    return res.status(405).json({
      ok: false,
      message: 'Method Not Allowed. Use GET or POST.'
    })
  }

  const token = getSyncToken() || getRevalidationToken()
  if (!token) {
    return res.status(503).json({
      ok: false,
      message: 'Sync is disabled: NOTION_SYNC_TOKEN or REVALIDATION_TOKEN not set'
    })
  }

  if (getAuthorizedToken(req) !== token) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' })
  }

  const force = String(req.query.force || req.body?.force || '') === '1'

  try {
    // Always fetch a fresh Notion snapshot for change detection.
    clearDerivedContentCache()
    const nextSignature = await buildSiteContentSignature()
    const previousSignature = await getDataFromCache(SIGNATURE_CACHE_KEY, true)

    if (!previousSignature) {
      await setDataToCache(
        SIGNATURE_CACHE_KEY,
        nextSignature,
        SIGNATURE_CACHE_TTL_SECONDS
      )
      return res.status(200).json({
        ok: true,
        changed: false,
        initialized: true,
        message: 'Initial Notion snapshot stored. No revalidation triggered.'
      })
    }

    const changed = force || previousSignature !== nextSignature
    if (!changed) {
      return res.status(200).json({
        ok: true,
        changed: false,
        initialized: false,
        message: 'No Notion content change detected.'
      })
    }

    clearDerivedContentCache()
    const results = await revalidatePaths(res, await getAllPathsForRevalidation())
    await setDataToCache(
      SIGNATURE_CACHE_KEY,
      nextSignature,
      SIGNATURE_CACHE_TTL_SECONDS
    )

    return res.status(200).json({
      ok: true,
      changed: true,
      initialized: false,
      message: `Notion change detected. Revalidated ${results.filter(r => r.revalidated).length}/${results.length} paths.`,
      results
    })
  } catch (error) {
    console.error('[notion-sync] Error:', error)
    return res.status(500).json({
      ok: false,
      message: 'Notion sync failed',
      error: error.message
    })
  }
}
