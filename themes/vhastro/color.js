import { siteConfig } from '@/lib/config'
import CONFIG, { DEFAULT_THEME_COLOR } from './config'

const DEFAULT_COLOR = DEFAULT_THEME_COLOR
const rgb = hex =>
  hex
    .slice(1)
    .match(/../g)
    .map(value => parseInt(value, 16))
const toHex = channels =>
  `#${channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`
const luminance = hex =>
  rgb(hex)
    .map(value => {
      const channel = value / 255
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    })
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0
    )

export function contrastRatio(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

export function normalizeThemeColor(value) {
  if (typeof value !== 'string') return DEFAULT_COLOR
  const hex = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex
  if (/^#[0-9a-f]{3}$/.test(hex))
    return `#${hex
      .slice(1)
      .split('')
      .map(char => char + char)
      .join('')}`
  return DEFAULT_COLOR
}

function readableAccent(color, background, target) {
  if (contrastRatio(color, background) >= 4.5) return color
  const channels = rgb(color)
  const end = rgb(target)
  for (let step = 1; step <= 100; step++) {
    const mixed = toHex(
      channels.map((value, i) => value + ((end[i] - value) * step) / 100)
    )
    if (contrastRatio(mixed, background) >= 4.5) return mixed
  }
  return target
}

/** Separate mode tokens also work inside Headless UI's portalled search dialog. */
export function buildThemeColorStyle(value) {
  const color = normalizeThemeColor(value)
  const isDefault = color === DEFAULT_COLOR
  const light = readableAccent(color, '#ffffff', '#000000')
  const dark = isDefault
    ? '#5abff2' // Fuwari: hsl(200, 85%, 65%)
    : readableAccent(color, '#222c36', '#ffffff')
  return {
    '--vh-custom-bright': color,
    '--vh-custom-accent-light': light,
    '--vh-custom-accent-dark': dark,
    '--vh-custom-soft-light': `${color}1a`,
    '--vh-custom-soft-dark': `${dark}24`,
    '--vh-custom-on-accent-light': '#ffffff',
    '--vh-custom-on-accent-dark': '#172033'
  }
}

export const themeColorStyle = () =>
  buildThemeColorStyle(
    siteConfig('VHASTRO_THEME_COLOR', CONFIG.VHASTRO_THEME_COLOR, CONFIG)
  )
