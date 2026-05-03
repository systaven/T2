/**
 * Fuwari 主题专用配置
 *
 * 与 NotionNext 的 `blog.config.js` 合并后生效；可在博客配置里覆盖任意项。
 * 布尔项：true 显示/启用，false 隐藏/关闭。
 */

const CONFIG = {
  // ---------------------------------------------------------------------------
  // 导航（桌面顶栏 + 受 FUWARI_MOBILE_MENU 影响的移动菜单项）
  // ---------------------------------------------------------------------------
  /** 显示「首页」 */
  FUWARI_MENU_INDEX: true,
  /** 显示「归档」 */
  FUWARI_MENU_ARCHIVE: true,
  /** 显示「分类」 */
  FUWARI_MENU_CATEGORY: true,
  /** 显示「标签」 */
  FUWARI_MENU_TAG: true,
  /** 显示「搜索」（Algolia 或站内搜索由全局配置决定） */
  FUWARI_MENU_SEARCH: true,

  // ---------------------------------------------------------------------------
  // 首页文章列表卡片
  // ---------------------------------------------------------------------------
  /** 是否显示右侧封面图区域 */
  FUWARI_POST_LIST_COVER: true,
  /** 无文章封面时，是否用站点横幅图（HOME_BANNER_IMAGE）作默认图 */
  FUWARI_POST_LIST_COVER_DEFAULT: false,
  /** 封面悬停轻微放大 */
  FUWARI_POST_LIST_COVER_HOVER_ENLARGE: true,
  /** 显示摘要（有 summary 时） */
  FUWARI_POST_LIST_SUMMARY: true,
  /** 卡片内显示标签 */
  FUWARI_POST_LIST_TAG: true,
  /** 桌面端列表卡片封面列宽度（px），增大则更扁长横向 */
  FUWARI_POST_LIST_COVER_COL_WIDTH: 280,

  // ---------------------------------------------------------------------------
  // 移动端
  // ---------------------------------------------------------------------------
  /** 右侧汉堡菜单（含导航项）；关闭后小屏仅保留顶栏图标 */
  FUWARI_MOBILE_MENU: true,

  // ---------------------------------------------------------------------------
  // 首页 Hero 大图区（适配 HEO 风格标题）
  // ---------------------------------------------------------------------------
  /** 是否渲染 Hero 区块（无图时仍占位，可按需关） */
  FUWARI_HERO_ENABLE: true,
  /** 自定义背景图 URL；留空则用 Notion 站点封面或 HOME_BANNER_IMAGE */
  FUWARI_HERO_BG_IMAGE: '',
  /** 右下角署名文案；留空不显示 */
  FUWARI_HERO_CREDIT_TEXT: '',
  /** 署名链接 */
  FUWARI_HERO_CREDIT_LINK: '',

  // HEO 风格标题适配
  HEO_HERO_TITLE_1: '分享事情',
  HEO_HERO_TITLE_2: 'To look up future',
  HEO_HERO_TITLE_3: 'Stavmb',
  HEO_HERO_TITLE_4: '点击进入',
  HEO_HERO_TITLE_5: '神奇的小房间',
  HEO_HERO_TITLE_LINK: 'https://blog.vachiika.me/',

  // ---------------------------------------------------------------------------
  // 侧栏（SidePanel）小部件
  // ---------------------------------------------------------------------------
  /** 公告（有公告数据时） */
  FUWARI_WIDGET_NOTICE: true,
  /** 最新文章列表 */
  FUWARI_WIDGET_LATEST_POSTS: true,
  /** 分类云/列表 */
  FUWARI_WIDGET_CATEGORY_LIST: true,
  /** 标签云/列表 */
  FUWARI_WIDGET_TAG_LIST: true,
  /** 侧栏头像/昵称下的「个人页」链接路径 */
  FUWARI_PROFILE_PATH: '/about',
  /** 联系/社群入口卡片 */
  FUWARI_WIDGET_CONTACT: true,
  /** 侧栏广告位总开关 */
  FUWARI_WIDGET_AD: false,
  /** 侧栏广告位内：是否渲染 WWAds */
  FUWARI_WIDGET_WWADS: true,
  /** 侧栏广告位内：是否渲染 AdSense 槽位 */
  FUWARI_WIDGET_ADSENSE: false,
  /** 插件注入区域卡片 */
  FUWARI_WIDGET_PLUGIN_AREA: true,
  /** 访问量等统计卡片 */
  FUWARI_WIDGET_ANALYTICS: true,
  /** 顶栏调色板内的色相滑块等；false 时展开调色板无控件 */
  FUWARI_WIDGET_THEME_COLOR_SWITCHER: true,
  /** 默认品牌色相 0–360 (HEO 风格推荐 350 左右) */
  FUWARI_THEME_COLOR_HUE: 350,
  /** true：隐藏顶栏调色盘按钮，无法在站内改色相 */
  FUWARI_THEME_COLOR_FIXED: false,
  /** 文章页右侧浮动区：跳转评论区按钮 */
  FUWARI_WIDGET_TO_COMMENT: true,
  /** 文章页右侧浮动区：深色模式切换 */
  FUWARI_WIDGET_DARK_MODE: true,
  /** 文章页目录：桌面在侧栏；小屏为浮动按钮抽屉（RightFloatArea） */
  FUWARI_ARTICLE_TOC: true,

  // ---------------------------------------------------------------------------
  // 个人资料卡（适配 HEO 风格欢迎语）
  // ---------------------------------------------------------------------------
  FUWARI_PROFILE_GREETINGS: [
    '你好！我是',
    '喵喵喵？～',
    '啊哈哈。。。',
    '还在点？（疑惑）',
    '不要再点了！生气了～',
    '呜呜呜～'
  ],

  // 用户技能图标 (适配 HEO 风格)
  HEO_GROUP_ICONS: [
    {
      title_1: 'face-smile-solid-full',
      img_1: '/images/heo/icon/face-smile-solid-full.svg',
      color_1: '#FFD9EF',
      title_2: 'bilibili-brands-solid-full',
      img_2: '/images/heo/icon/bilibili-brands-solid-full.svg',
      color_2: '#FFF0F8'
    },
    {
      title_1: 'envelope-solid-full',
      img_1: '/images/heo/icon/envelope-solid-full.svg',
      color_1: '#FFB8E3',
      title_2: 'shield-cat-solid-full',
      img_2: '/images/heo/icon/shield-cat-solid-full.svg',
      color_2: '#F76FC2'
    },
    {
      title_1: 'trophy-solid-full',
      img_1: '/images/heo/icon/trophy-solid-full.svg',
      color_1: '#FFF0F8',
      title_2: 'gamepad-solid-full',
      img_2: '/images/heo/icon/gamepad-solid-full.svg',
      color_2: '#FFF0F8'
    },
    {
      title_1: 'heart-solid-full',
      img_1: '/images/heo/icon/heart-solid-full.svg',
      color_1: '#FFB8E3',
      title_2: 'heart-regular-full',
      img_2: '/images/heo/icon/heart-regular-full.svg',
      color_2: '#2E031B'
    }
  ],

  // ---------------------------------------------------------------------------
  // 联系卡片（侧栏，可翻转）
  // ---------------------------------------------------------------------------
  /** 正面标题 */
  FUWARI_CONTACT_TITLE: '交流频道',
  /** 正面说明文案 */
  FUWARI_CONTACT_DESCRIPTION: '加入我们的社群讨论分享',
  /** 正面右上角徽标 */
  FUWARI_CONTACT_FRONT_BADGE: 'Community',
  /** 跳转 URL（外链或站内路径） */
  FUWARI_CONTACT_URL: 'https://blog.vachiika.me/article/how-to-question',
  /** 正面行动文案（如「联系我们 →」） */
  FUWARI_CONTACT_TEXT: '点击加入',
  /** 是否使用正反面翻转卡片 */
  FUWARI_CONTACT_FLIP_CARD: true,
  /** 背面标题 */
  FUWARI_CONTACT_BACK_TITLE: '关注 GitHub',
  /** 背面说明 */
  FUWARI_CONTACT_BACK_DESCRIPTION: '查看我的项目与代码',
  /** 背面行动文案 */
  FUWARI_CONTACT_BACK_TEXT: '前往',
  FUWARI_CONTACT_BACK_URL: 'https://github.com/systaven',

  // ---------------------------------------------------------------------------
  // 全站动效（按需开启，可能影响性能）
  // ---------------------------------------------------------------------------
  /** Lenis 平滑滚动 */
  FUWARI_EFFECT_LENIS: false,
  /** 自定义光标圆点 */
  FUWARI_EFFECT_CURSOR_DOT: false,

  // ---------------------------------------------------------------------------
  // 文章页
  // ---------------------------------------------------------------------------
  /** 有 Notion 封面时，在详情页文章卡片内顶部展示封面图（object-cover，不占满屏） */
  FUWARI_ARTICLE_COVER_HERO: false,
  /** 文首：日期、分类、标签等元信息 */
  FUWARI_ARTICLE_META: true,
  /** 分享条 */
  FUWARI_ARTICLE_SHARE: true,
  /** 文末版权信息块 */
  FUWARI_ARTICLE_COPYRIGHT: true,
  /** 文末评论区（需在 `blog.config.js` 配置任一种评论服务，如 COMMENT_GISCUS_REPO / COMMENT_TWIKOO_ENV_ID 等，否则不渲染） */
  FUWARI_ARTICLE_COMMENT: true,
  /** 文末上一篇 / 下一篇 */
  FUWARI_ARTICLE_ADJACENT: true
}

export default CONFIG
