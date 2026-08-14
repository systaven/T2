const CONFIG = {
  HEO_HOME_POST_TWO_COLS: true, // 首页博客两列显示，若为false则只显示一列
  HEO_LOADING_COVER: false, // 页面加载的遮罩动画

  HEO_HOME_BANNER_ENABLE: true,

  HEO_INFO_CARD_AVATAR_BLUR: true, // 文章详情页个人资料卡头像样式。true：显示为模糊装饰头像；false：与首页头像保持一致

  HEO_COLOR_PRIMARY: '#4f65f0',
  HEO_COLOR_PRIMARY_HOVER: '#4f46e5',
  HEO_COLOR_PRIMARY_TEXT: '#ffffff',
  HEO_COLOR_ACCENT: '#dca846',
  HEO_COLOR_BG: '#f7f9fe',
  HEO_COLOR_BG_DARK: '#18171d',
  HEO_COLOR_CARD: '#ffffff',
  HEO_COLOR_CARD_DARK: '#1e1e1e',
  HEO_COLOR_CARD_MUTED: '#f1f3f8',
  HEO_COLOR_BORDER: '#4f46e5',
  HEO_COLOR_BORDER_DARK: '#dca846',
  HEO_COLOR_TEXT: '#111827',
  HEO_COLOR_TEXT_SECONDARY: '#4b5563',

  HEO_SITE_CREATE_TIME: '2024-07-02', // 建站日期，用于计算网站运行的第几天

  // 首页顶部通知条滚动内容，如不需要可以留空 []
  HEO_NOTICE_BAR: [
    { title: '欢迎来到奇怪的博客', url: 'https://blog.vachiika.me' },
    { title: '欢迎来到我的博客', url: 'https://blog.vachiika.me/about' },
    { title: '友情链接', url: 'https://blog.vachiika.me/links' }
  ],

  // 英雄区左右侧组件颠倒位置
  HEO_HERO_REVERSE: false,
  // 博客主体区左右侧组件颠倒位置
  HEO_HERO_BODY_REVERSE: false,

  // 英雄区(首页顶部大卡)
  HEO_HERO_TITLE_1: '分享事情',
  HEO_HERO_TITLE_2: 'To look up future',
  HEO_HERO_TITLE_3: 'Stavmb',
  HEO_HERO_TITLE_4: '点击进入',
  HEO_HERO_TITLE_5: '神奇的小房间',
  HEO_HERO_TITLE_LINK: 'https://blog.vachiika.me/',
  // 英雄区遮罩文字
  HEO_HERO_COVER_TITLE: '随便逛逛',

  // 英雄区显示三个置顶分类
  HEO_HERO_CATEGORY_1: { title: '推荐', url: '/tag/suggest' },
  HEO_HERO_CATEGORY_2: { title: '教程', url: '/tag/trending' },
  HEO_HERO_CATEGORY_3: { title: '记录', url: '/tag/diary' },

  // 英雄区右侧推荐文章标签, 例如 [推荐] , 最多六篇文章; 若留空白''，则推荐最近更新文章
  HEO_HERO_RECOMMEND_POST_TAG: '',
  HEO_HERO_RECOMMEND_POST_SORT_BY_UPDATE_TIME: true, // 推荐文章排序，为`true`时将强制按最后修改时间倒序
  HERO_RECOMMEND_COVER: 'https://www.dmoe.cc/random.php', // 英雄区右侧图片

  // 英雄区右侧推荐文章遮罩控制
  HEO_HERO_RECOMMEND_COVER_ENABLE: true, // 是否显示推荐文章遮罩图片，true显示遮罩需点击查看，false直接显示推荐文章

  // 右侧个人资料卡牌欢迎语，点击可自动切换
  HEO_INFOCARD_GREETINGS: [
    '你好！我是',
    '喵喵喵？～',
    '啊哈哈。。。',
    '还在点？（疑惑）',
    '不要再点了！生气了～',
    '呜呜呜～',
    
  ],

  // 个人资料底部按钮
  HEO_INFO_CARD_URL1: '/about',
  HEO_INFO_CARD_ICON1: 'fas fa-user',
  HEO_INFO_CARD_URL2: 'https://github.com/systaven',
  HEO_INFO_CARD_ICON2: 'fab fa-github',
  HEO_INFO_CARD_ICON_ORCID: 'fab fa-orcid',
  HEO_INFO_CARD_URL3: 'https://blog.vachiika.me/about',
  HEO_INFO_CARD_TEXT3: '了解更多',

  // 用户技能图标
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

  HEO_SOCIAL_CARD: false, // 是否显示右侧，点击加入社群按钮
  HEO_SOCIAL_CARD_TITLE_1: '交流频道',
  HEO_SOCIAL_CARD_TITLE_2: '加入我们的社群讨论分享',
  HEO_SOCIAL_CARD_TITLE_3: '点击加入社群',
  HEO_SOCIAL_CARD_URL: 'https://blog.vachiika.me/article/how-to-question',

  // 底部统计面板文案
  HEO_POST_COUNT_TITLE: '文章数:',
  HEO_SITE_TIME_TITLE: '建站天数:',
  HEO_SITE_VISIT_TITLE: '访问量:',
  HEO_SITE_VISITOR_TITLE: '访客数:',

  // *****  以下配置无效，只是预留开发 ****
  // 菜单配置
  HEO_MENU_INDEX: true, // 显示首页
  HEO_MENU_CATEGORY: true, // 显示分类
  HEO_MENU_TAG: true, // 显示标签
  HEO_MENU_ARCHIVE: true, // 显示归档
  HEO_MENU_SEARCH: true, // 显示搜索

  HEO_POST_LIST_COVER: true, // 列表显示文章封面
  HEO_POST_LIST_COVER_HOVER_ENLARGE: true, // 列表鼠标悬停放大

  HEO_POST_LIST_COVER_DEFAULT: true, // 封面为空时用站点背景做默认封面
  HEO_POST_LIST_SUMMARY: true, // 文章摘要
  HEO_POST_LIST_PREVIEW: true, // 读取文章预览
  HEO_POST_LIST_IMG_CROSSOVER: true, // 博客列表图片左右交错

  HEO_ARTICLE_ADJACENT: true, // 显示上一篇下一篇文章推荐
  HEO_ARTICLE_COPYRIGHT: true, // 显示文章版权声明
  HEO_ARTICLE_NOT_BY_AI: false, // 显示非AI写作
  HEO_ARTICLE_RECOMMEND: true, // 文章关联推荐

  HEO_WIDGET_LATEST_POSTS: true, // 显示最新文章卡
  HEO_WIDGET_ANALYTICS: true, // 显示统计卡
  HEO_WIDGET_TO_TOP: true,
  HEO_WIDGET_TO_COMMENT: true, // 跳到评论区
  HEO_WIDGET_DARK_MODE: true, // 夜间模式
  HEO_WIDGET_TOC: true // 移动端悬浮目录
}
export default CONFIG
