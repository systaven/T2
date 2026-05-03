// import '@/styles/animate.css' // @see https://animate.style/
import '@/styles/globals.css'
import '@/styles/utility-patterns.css'

// core styles shared by all of react-notion-x (required)
import '@/styles/notion.css' //  重写部分notion样式
import 'react-notion-x/src/styles.css' // 原版的react-notion-x

import useAdjustStyle from '@/hooks/useAdjustStyle'
import { GlobalContextProvider } from '@/lib/global'
import { getBaseLayoutByTheme } from '@/themes/theme'
import { useRouter } from 'next/router'
import { useCallback, useMemo, useEffect } from 'react'
import { getQueryParam } from '../lib/utils'

// 各种扩展插件 这个要阻塞引入
import BLOG from '@/blog.config'
import ExternalPlugins from '@/components/ExternalPlugins'
import GlobalStyle from '@/components/GlobalStyle'
import SEO from '@/components/SEO'
import { zhCN } from '@clerk/localizations'
import dynamic from 'next/dynamic'
// import { ClerkProvider } from '@clerk/nextjs'
const ClerkProvider = dynamic(() =>
  import('@clerk/nextjs').then(m => m.ClerkProvider)
)

/**
 * App挂载DOM 入口文件
 * @param {*} param0
 * @returns
 */
const MyApp = ({ Component, pageProps }) => {
  // 一些可能出现 bug 的样式，可以统一放入该钩子进行调整
  useAdjustStyle()

  const route = useRouter()
  const queryTheme = getQueryParam(route.asPath, 'theme')
  const notionTheme = pageProps?.NOTION_CONFIG?.THEME
  const configTheme = BLOG.THEME

  useEffect(() => {
    const whitelist = BLOG.LINK_WHITELIST || [];

    const rewriteLinks = (rootNode) => {
      if (!rootNode || typeof rootNode.querySelectorAll !== 'function') {
        return;
      }

      const links = rootNode.querySelectorAll('a[href]');

      links.forEach(link => {
        const href = link.getAttribute('href');
        // 如果没有 href，或者是锚点链接，或者已经被重写，则跳过
        if (!href || href.startsWith('#') || href.startsWith('/go?') || link.dataset.linkRewritten) {
          return;
        }

        const isExternal = /^https?:\/\//i.test(href) && !href.includes(location.hostname);

        if (isExternal) {
          const inWhitelist = whitelist.some(domain => href.includes(domain));
          // 标记为已处理，无论是否在白名单内
          link.dataset.linkRewritten = "true";

          if (inWhitelist) {
            return; // 在白名单内，不重写
          }

          const newHref = `/go?target=${encodeURIComponent(href)}`;
          link.setAttribute('href', newHref);
        }
      });
    };

    // 首次加载时重写链接
    rewriteLinks(document.body);

    // 使用 MutationObserver 监视动态添加的内容
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            rewriteLinks(node);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 组件卸载时断开观察
    return () => {
      observer.disconnect();
    };

  }, [route.asPath]);
  const theme = useMemo(() => {
    return queryTheme || notionTheme || configTheme
  }, [queryTheme, notionTheme, configTheme])

  useEffect(() => {
    const source = queryTheme
      ? 'url:theme'
      : notionTheme
        ? 'notion:config'
        : 'blog/env:config'
    console.log(
      '[ThemeResolver][runtime-final]',
      JSON.stringify(
        {
          note: 'This is the final theme used for rendering.',
          configTheme,
          notionTheme: notionTheme || null,
          queryTheme: queryTheme || null,
          finalTheme: theme,
          source
        },
        null,
        2
      )
    )
  }, [configTheme, notionTheme, queryTheme, theme])

  // 整体布局
  const GLayout = useCallback(
    props => {
      const Layout = getBaseLayoutByTheme(theme)
      return <Layout {...props} />
    },
    [theme]
  )

  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // 根据路由路径决定页面内容
  const pageContent = (
    route.pathname === '/go'
      ? <Component {...pageProps} />
      : <GLayout {...pageProps}>
          <SEO {...pageProps} />
          <Component {...pageProps} />
        </GLayout>
  )

  const content = (
    <GlobalContextProvider {...pageProps}>
      {route.pathname === '/go' && <GlobalStyle />}
      {pageContent}
      {route.pathname !== '/go' && <ExternalPlugins {...pageProps} />}
    </GlobalContextProvider>
  )

  return (
    <>
      {enableClerk
        ? (
        <ClerkProvider localization={zhCN}>{content}</ClerkProvider>
          )
        : (
            content
          )}
    </>
  )
}

export default MyApp
