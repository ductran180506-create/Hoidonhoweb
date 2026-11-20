import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Story } from '@/lib/types';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
};

let memoryCache: { stories: Story[]; timestamp: number } | null = null;
const CACHE_TTL = 15 * 1000; // Bộ nhớ đệm nhanh 15 giây

function invalidateStoriesCache() {
  memoryCache = null;
}

/**
 * PUBLIC API: Cung cấp danh sách truyện công khai cho độc giả
 * Tối ưu truy vấn song song (Promise.all) + In-memory Cache 0ms
 */
export async function GET() {
  // 1. Phục vụ ngay lập tức từ bộ nhớ cache (< 1ms)
  if (memoryCache && (Date.now() - memoryCache.timestamp < CACHE_TTL)) {
    return NextResponse.json({
      success: true,
      cached: true,
      stories: memoryCache.stories,
    }, { headers: cacheHeaders });
  }

  try {
    const client = supabaseAdmin || supabase;
    // 2. Chạy đồng thời 2 truy vấn song song thay vì tuần tự
    const [storiesRes, chaptersRes] = await Promise.all([
      client
        .from('stories')
        .select('id, title, slug, tiktok_code, description, cover_image, category, views, created_at')
        .order('created_at', { ascending: false }),
      client
        .from('chapters')
        .select('id, story_id, images'),
    ]);

    const sbStories = storiesRes.data;
    const sbChapters = chaptersRes.data;
    const storyErr = storiesRes.error;

    // Khi kết nối Supabase thành công (kể cả khi rỗng 0 truyện)
    if (!storyErr && sbStories !== null) {
      if (sbStories.length === 0) {
        memoryCache = { stories: [], timestamp: Date.now() };
        return NextResponse.json({
          success: true,
          stories: [],
        }, { headers: cacheHeaders });
      }

      const stories: Story[] = sbStories.map(s => {
        const count = (sbChapters || []).filter(c => c.story_id === s.id && Array.isArray(c.images) && c.images.length > 0).length;
        let storyStatus: 'ongoing' | 'completed' | 'upcoming' = 'completed';
        let cleanSummary = s.description || '';
        const match = cleanSummary.match(/<!--status:(ongoing|completed|upcoming)-->/);
        if (match) {
          storyStatus = match[1] as any;
          cleanSummary = cleanSummary.replace(/<!--status:(ongoing|completed|upcoming)-->/, '').trim();
        } else {
          const localSt = db.getStoryById(s.id);
          if (localSt?.status) storyStatus = localSt.status;
        }

        return {
          id: s.id,
          code: s.tiktok_code || '',
          title: s.title,
          slug: s.slug,
          coverImage: s.cover_image,
          genre: s.category || 'Tình cảm',
          summary: cleanSummary,
          views: s.views || 0,
          status: storyStatus,
          chaptersCount: count,
          createdAt: s.created_at,
        };
      });

      memoryCache = { stories, timestamp: Date.now() };

      return NextResponse.json({
        success: true,
        stories,
      }, { headers: cacheHeaders });
    }
  } catch (err) {
    console.warn('Lỗi đọc Supabase stories, fallback local:', err);
  }

  // Fallback local db khi mất kết nối mạng
  const stories = db.getStories();
  return NextResponse.json({
    success: true,
    stories: stories.map(s => ({
      id: s.id,
      code: s.code,
      title: s.title,
      slug: s.slug,
      coverImage: s.coverImage,
      genre: s.genre,
      summary: s.summary,
      views: s.views,
      status: s.status,
      chaptersCount: s.chaptersCount,
      createdAt: s.createdAt,
    })),
  }, { headers: cacheHeaders });
}
