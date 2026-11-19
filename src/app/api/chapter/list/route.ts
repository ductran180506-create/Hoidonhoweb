import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get('storyId');

  if (!storyId) {
    return NextResponse.json({ success: false, message: 'Thiếu storyId' }, { status: 400, headers: noCacheHeaders });
  }

  // 1. Lấy trực tiếp danh sách tập truyện từ Supabase
  try {
    const client = supabaseAdmin || supabase;
    const { data: sbChapters, error } = await client
      .from('chapters')
      .select('*')
      .eq('story_id', storyId)
      .order('chapter_number', { ascending: true });

    if (!error && sbChapters && sbChapters.length > 0) {
      // Chỉ trả về các tập ĐÃ PHÁT HÀNH (có ít nhất 1 ảnh hoặc có nội dung)
      const publishedChapters = sbChapters.filter(c => 
        (Array.isArray(c.images) && c.images.length > 0) ||
        (typeof c.content === 'string' && c.content.trim().length > 0)
      );

      return NextResponse.json({
        success: true,
        source: 'supabase',
        chapters: publishedChapters.map((c, idx) => ({
          id: c.id,
          storyId: c.story_id,
          chapterIndex: c.chapter_number || (idx + 1),
          title: c.title,
          priceCoins: c.price,
          images: c.images || [],
          createdAt: c.created_at,
        })),
      }, { headers: noCacheHeaders });
    }
  } catch (err) {
    console.warn('Lỗi đọc Supabase chapters:', err);
  }

  // 2. Fallback sang local db nếu mất kết nối
  const chapters = db.getChaptersByStoryId(storyId);
  const publishedLocalChapters = chapters.filter(c =>
    (Array.isArray(c.images) && c.images.length > 0) ||
    (typeof c.content === 'string' && c.content.trim().length > 0)
  );

  return NextResponse.json({
    success: true,
    source: 'local',
    chapters: publishedLocalChapters.map(c => ({
      id: c.id,
      storyId: c.storyId,
      chapterIndex: c.chapterIndex,
      title: c.title,
      priceCoins: c.priceCoins,
      images: c.images || [],
      createdAt: c.createdAt,
    })),
  }, { headers: noCacheHeaders });
}
