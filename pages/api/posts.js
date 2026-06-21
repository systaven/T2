import { fetchGlobalAllData, cleanPostSummaries } from '@/lib/db/SiteDataApi'

export default async function handler(req, res) {
  const { locale } = req.query
  try {
    const props = await fetchGlobalAllData({ from: 'api-posts', locale })
    const { allPages } = props
    const posts = allPages?.filter(
      page => page.type === 'Post' && page.status === 'Published'
    ) || []
    
    // Clean and return posts summary list
    const cleanedPosts = cleanPostSummaries(posts)

    // Set cache control for performance
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
    res.status(200).json(cleanedPosts)
  } catch (error) {
    console.error('API posts error:', error)
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
}
