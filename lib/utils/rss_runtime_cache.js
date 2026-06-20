let rssRuntimeCache = {
  xml: null,
  atomXml: null,
  json: null,
  updatedAt: 0
}

export function getRssRuntimeCache() {
  return rssRuntimeCache
}

export function setRssRuntimeCache(nextValue) {
  rssRuntimeCache = nextValue
}

export function clearRssRuntimeCache() {
  rssRuntimeCache = {
    xml: null,
    atomXml: null,
    json: null,
    updatedAt: 0
  }
}
