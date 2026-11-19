import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uenacugbaqunprmvyhka.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const dataFilePath = path.join(process.cwd(), 'data.json');

async function migrate() {
  console.log('--- BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU SANG SUPABASE ---');

  if (!fs.existsSync(dataFilePath)) {
    console.error('Không tìm thấy file data.json');
    return;
  }

  const raw = fs.readFileSync(dataFilePath, 'utf-8');
  const data = JSON.parse(raw);

  // 1. Stories
  if (data.stories && data.stories.length > 0) {
    console.log(`Đang đồng bộ ${data.stories.length} bộ truyện...`);
    for (const story of data.stories) {
      const { error } = await supabase.from('stories').upsert({
        id: story.id,
        title: story.title,
        slug: story.slug,
        tiktok_code: story.code || null,
        description: story.summary || '',
        cover_image: story.coverImage || '',
        category: story.genre || 'Tình cảm',
        is_hot: false,
        views: story.views || 0,
        created_at: story.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });

      if (error) {
        console.error(`Lỗi sync story ${story.id}:`, error.message);
      } else {
        console.log(`✓ Đã sync truyện: ${story.title}`);
      }
    }
  }

  // 2. Chapters
  if (data.chapters && data.chapters.length > 0) {
    console.log(`Đang đồng bộ ${data.chapters.length} tập truyện...`);
    for (const chap of data.chapters) {
      const { error } = await supabase.from('chapters').upsert({
        id: chap.id,
        story_id: chap.storyId,
        chapter_number: chap.chapterIndex || 1,
        title: chap.title,
        price: chap.priceCoins || 0,
        images: chap.images || [],
        created_at: chap.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });

      if (error) {
        console.error(`Lỗi sync chapter ${chap.id}:`, error.message);
      } else {
        console.log(`✓ Đã sync tập: ${chap.title}`);
      }
    }
  }

  // 3. Demo User
  const { error: userErr } = await supabase.from('users').upsert({
    id: '0987654321',
    phone: '0987654321',
    pin_code: '1234',
    balance: 50,
    created_at: new Date().toISOString()
  }, { onConflict: 'id' });

  if (!userErr) {
    console.log('✓ Đã tạo tài khoản demo: 0987654321 (50 Xu)');
  }

  console.log('--- HOÀN TẤT ĐỒNG BỘ DỮ LIỆU ---');
}

migrate();
