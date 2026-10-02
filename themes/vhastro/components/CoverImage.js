/* eslint-disable @next/next/no-img-element */
import { useState } from 'react'

// Track the failed URL rather than hiding every subsequent replacement image.
export default function CoverImage({ src, fallback = null, ...props }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!src || src === failedSrc) return fallback
  return <img {...props} src={src} onError={() => setFailedSrc(src)} />
}
