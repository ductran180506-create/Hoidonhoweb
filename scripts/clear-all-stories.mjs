import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uenacugbaqunprmvyhka.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const dataFilePath = path.join(process.cwd(), 'data.json');

async function clearAllStories() {
  console.log('--- ĐANG XÓA TOÀN BỘ TRUYỆN MẪU ĐỂ CHUẨN BỊ ĐĂNG MỚI ---');

  // 1. Xóa trong Supabase (chapters trước do có khóa ngoại cascade, rồi đến stories)
  try {
    const { error: chErr } = await supabase.from('chapters').delete().neq('id', '___non_existent___');
    if (chErr) console.warn('Supabase chapters delete warning:', chErr.message);
    else console.log('✓ Đã xóa sạch toàn bộ tập truyện trên Supabase');

    const { error: stErr } = await supabase.from('stories').delete().neq('id', '___non_existent___');
    if (stErr) console.warn('Supabase stories delete warning:', stErr.message);
    else console.log('✓ Đã xóa sạch toàn bộ bộ truyện trên Supabase');

    const { error: unErr } = await supabase.from('unlocked_chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (unErr) console.warn('Supabase unlocked_chapters delete warning:', unErr.message);
  } catch (err) {
    console.error('Lỗi khi xóa Supabase:', err);
  }

  // 2. Xóa trong file local data.json
  if (fs.existsSync(dataFilePath)) {
    try {
      const raw = fs.readFileSync(dataFilePath, 'utf-8');
      const data = JSON.parse(raw);
      data.stories = [];
      data.chapters = [];
      data.unlockedChapters = [];
      fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log('✓ Đã dọn sạch danh sách truyện trong data.json');
    } catch (e) {
      console.error('Lỗi cập nhật data.json:', e);
    }
  }

  console.log('--- HOÀN TẤT! HỆ THỐNG ĐÃ SẴN SÀNG ĐỂ ĐĂNG TRUYỆN THẬT TỪ TRANG ADMIN ---');
}

clearAllStories();
