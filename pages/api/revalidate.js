import {
  clearDerivedContentCache,
  getAllPathsForRevalidation,
  getAuthorizedToken,
  getRevalidationToken,
  normalizePath,
  revalidatePaths
} from '@/lib/revalidation'

/**
 * On-Demand Revalidation API
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      message: 'Method Not Allowed. Use POST.'
    })
  }

  const token = getRevalidationToken()
  if (!token) {
    return res.status(503).json({
      ok: false,
      message: 'Revalidation is disabled: REVALIDATION_TOKEN not set'
    })
  }

  if (getAuthorizedToken(req) !== token) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' })
  }

  const { path, paths, all } = req.body || {}

  try {
    if (all) {
      clearDerivedContentCache()
      const results = await revalidatePaths(res, await getAllPathsForRevalidation())
      return res.status(200).json({
        ok: true,
        message: `Full site cache cleared. Revalidated ${results.filter(r => r.revalidated).length}/${results.length} paths.`,
        results
      })
    }

    const targetPaths = paths || (path ? [path] : ['/'])
    const results = await revalidatePaths(
      res,
      targetPaths.map(normalizePath)
    )

    return res.status(200).json({
      ok: true,
      message: `Revalidated ${results.filter(r => r.revalidated).length}/${results.length} paths`,
      results
    })
  } catch (error) {
    console.error('[revalidate] Error:', error)
    return res.status(500).json({
      ok: false,
      message: 'Revalidation failed',
      error: error.message
    })
  }
}
