export const DEFAULT_FUWARI_HUE = 350

export const normalizeHue = (value, fallback = DEFAULT_FUWARI_HUE) => {
  const parsed = Number.parseInt(value, 10)
  const base = Number.isFinite(parsed)
    ? parsed
    : Number.parseInt(fallback, 10)

  if (!Number.isFinite(base)) return DEFAULT_FUWARI_HUE

  return Math.min(360, Math.max(0, base))
}
