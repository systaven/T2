export const DEFAULT_THEME_COLOR = '#3aa8df' // Fuwari: hsl(200, 72%, 55%)

const CONFIG = {
  VHASTRO_THEME_COLOR:
    process.env.NEXT_PUBLIC_VHASTRO_THEME_COLOR || DEFAULT_THEME_COLOR,
  VHASTRO_HOME_BANNER: '',
  VHASTRO_SIDEBAR_POSITION:
    process.env.NEXT_PUBLIC_VHASTRO_SIDEBAR_POSITION || 'right',
  VHASTRO_HITOKOTO: true,
  VHASTRO_ARTICLE_COMMENT: true,
  VHASTRO_MUSIC: true,
  // Match the existing Fuwari sidebar default without losing an explicit env switch.
  MUSIC_PLAYER: process.env.NEXT_PUBLIC_MUSIC_PLAYER ?? true
}

export default CONFIG
