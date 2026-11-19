import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, storyId, storyTitle, referrer, device, userId, deviceId } = body;

    // Định danh thiết bị duy nhất của máy
    const cleanDeviceId = deviceId || (userId && userId.startsWith('dev_') ? userId : `dev_${Date.now()}`);

    // Phân tích nguồn truy cập (Referrer)
    let cleanReferrer = referrer || 'direct';
    if (cleanReferrer.includes('tiktok')) cleanReferrer = 'TikTok Bio';
    else if (cleanReferrer.includes('facebook') || cleanReferrer.includes('fb')) cleanReferrer = 'Facebook';
    else if (cleanReferrer.includes('instagram')) cleanReferrer = 'Instagram';
    else if (cleanReferrer.includes('zalo')) cleanReferrer = 'Zalo';
    else if (cleanReferrer.includes('google')) cleanReferrer = 'Google Search';
    else if (cleanReferrer === 'direct' || !cleanReferrer) cleanReferrer = 'Truy cập trực tiếp';

    // 1. Lưu vào Local DB (cập nhật nếu đã có, chỉ thêm nếu máy mới)
    const event = db.recordAnalytics({
      id: cleanDeviceId,
      path: path || '/',
      storyId,
      storyTitle,
      referrer: cleanReferrer,
      device: device || 'Không xác định',
      userId: userId || cleanDeviceId,
    });

    // 2. Đồng bộ lên Supabase: 1 Máy = 1 Hàng duy nhất trong analytics
    try {
      const { data: existing } = await supabaseAdmin
        .from('analytics')
        .select('id, user_id')
        .eq('id', cleanDeviceId)
        .maybeSingle();

      const nowIso = new Date().toISOString();

      if (existing) {
        // Máy cũ: Cập nhật trang đang xem và thời gian hoạt động mới nhất, KHÔNG TĂNG SỐ LƯỢNG MÁY
        await supabaseAdmin
          .from('analytics')
          .update({
            path: path || '/',
            story_id: storyId || null,
            story_title: storyTitle || null,
            created_at: nowIso, // Mốc hoạt động gần nhất
          })
          .eq('id', cleanDeviceId);
      } else {
        // Máy mới lần đầu truy cập: Tạo mới với mốc thời gian lần đầu
        await supabaseAdmin
          .from('analytics')
          .insert({
            id: cleanDeviceId,
            path: path || '/',
            story_id: storyId || null,
            story_title: storyTitle || null,
            referrer: cleanReferrer,
            device: device || 'Không xác định',
            user_id: userId || cleanDeviceId,
            created_at: nowIso,
          });
      }
    } catch (e) {
      // Bỏ qua nếu lỗi kết nối
    }

    // Tăng lượt xem truyện (chỉ khi có storyId)
    if (storyId) {
      db.incrementStoryViews(storyId);
      try {
        await supabaseAdmin.rpc('increment_story_views', { story_id: storyId });
      } catch (e) {}
    }

    return NextResponse.json({ success: true, deviceId: cleanDeviceId });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
