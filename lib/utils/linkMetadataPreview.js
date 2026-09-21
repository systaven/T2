const MAX_CONCURRENT_REQUESTS = 2
const MAX_RETRY_DELAY_MS = 30_000
const previewCache = new Map()
const pendingRequests = new Map()
const requestQueue = []
let activeRequestCount = 0

const wait = duration =>
  new Promise(resolve => {
    setTimeout(resolve, duration)
  })

const getRetryDelay = (response, attempt) => {
  const retryAfter = Number(response?.headers?.get('retry-after'))
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS)
  }

  return Math.min(1000 * 2 ** Math.min(attempt, 5), MAX_RETRY_DELAY_MS)
}

const requestMetadata = async (url, attempt = 0) => {
  try {
    const response = await fetch(
      `https://api.linkmetadata.com/v1/metadata?url=${encodeURIComponent(url)}`
    )

    if (!response.ok) {
      // Rate limits and transient upstream failures are retried in the background.
      if (response.status === 429 || response.status >= 500) {
        await wait(getRetryDelay(response, attempt))
        return requestMetadata(url, attempt + 1)
      }
      throw new Error(`link metadata request failed: ${response.status}`)
    }

    const metadata = await response.json()
    return {
      title: metadata.title || null,
      description: metadata.description || null,
      image: metadata.image?.url || null,
      siteName: new URL(metadata.url || url).hostname,
      url: metadata.url || url
    }
  } catch (error) {
    // A network failure is normally temporary; keep retrying with bounded backoff.
    if (error instanceof TypeError) {
      await wait(getRetryDelay(null, attempt))
      return requestMetadata(url, attempt + 1)
    }
    throw error
  }
}

const drainQueue = () => {
  while (activeRequestCount < MAX_CONCURRENT_REQUESTS && requestQueue.length) {
    const next = requestQueue.shift()
    activeRequestCount += 1
    requestMetadata(next.url)
      .then(preview => {
        previewCache.set(next.url, preview)
        next.resolve(preview)
      })
      .catch(next.reject)
      .finally(() => {
        pendingRequests.delete(next.url)
        activeRequestCount -= 1
        drainQueue()
      })
  }
}

/** Returns cached metadata if ready, without creating a network request. */
export const getCachedLinkMetadataPreview = url => previewCache.get(url) || null

/**
 * De-duplicates every URL, limits parallel work, and keeps retrying temporary
 * failures so opening a long article does not hit the metadata API all at once.
 */
export const preloadLinkMetadataPreview = url => {
  if (!url) return Promise.resolve(null)
  const cached = previewCache.get(url)
  if (cached) return Promise.resolve(cached)
  const pending = pendingRequests.get(url)
  if (pending) return pending

  const request = new Promise((resolve, reject) => {
    requestQueue.push({ url, resolve, reject })
    drainQueue()
  })
  pendingRequests.set(url, request)
  return request
}
