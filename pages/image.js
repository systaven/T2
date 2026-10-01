import Head from 'next/head'
import dynamic from 'next/dynamic'
import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

const WallpaperWall = dynamic(
  () => import('@/components/wallpapers/WallpaperWall'),
  {
    ssr: false,
    loading: () => (
      <div className='p-12 text-center' role='status'>
        正在载入壁纸墙…
      </div>
    )
  }
)

export default function ImagePage({ siteInfo }) {
  return (
    <>
      <Head>
        <title>{`壁纸墙 | ${siteInfo?.title || BLOG.TITLE || BLOG.AUTHOR}`}</title>
        <meta
          name='description'
          content='自动更新的插画壁纸精选，浏览手机与电脑壁纸，查看原作并下载原图。'
        />
      </Head>
      <WallpaperWall />
    </>
  )
}

export async function getStaticProps({ locale }) {
  const props = await fetchGlobalAllData({ from: 'wallpaper-wall', locale })
  delete props.allPages
  return {
    props: { ...props, fullWidthContent: true },
    revalidate: process.env.EXPORT ? undefined : 3600
  }
}
