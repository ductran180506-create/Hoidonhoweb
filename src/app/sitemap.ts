import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://hoidonho.id.vn';
  const stories = db.getStories();

  const storyUrls: MetadataRoute.Sitemap = stories.map((story) => ({
    url: `${baseUrl}/story/${story.slug || story.id}`,
    lastModified: new Date(story.createdAt || Date.now()),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...storyUrls,
  ];
}
