import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get('storyId') || undefined;
    const chapterIndexStr = searchParams.get('chapterIndex');
    const chapterIndex = chapterIndexStr ? parseInt(chapterIndexStr, 10) : undefined;

    const rawTips = db.getChapterTips(storyId, chapterIndex);
    // Ẩn nội dung lời nhắn riêng tư khi trả về danh sách công khai
    const tips = rawTips.map(t => {
      if (t.isPrivate) {
        return {
          ...t,
          message: t.message ? '🔒 Lời nhắn gửi riêng cho tác giả' : undefined,
        };
      }
      return t;
    });
    return NextResponse.json({ success: true, tips });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, storyId, chapterIndex = 1, amountCoins = 5, message = '', isPrivate = false } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập để tặng cà phê' }, { status: 401 });
    }

    const coinsToDeduct = Math.max(1, parseInt(amountCoins, 10) || 5);

    // 1. Kiểm tra số dư người dùng
    const localBal = db.getWallet(userId)?.balance || 0;
    let sbBal = 0;
    let uName = 'Độc giả';
    let uAvatar = '';

    try {
      const { data: uData } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (uData) {
        sbBal = uData.balance || 0;
        uName = uData.name || uData.phone || uData.email || 'Độc giả';
        uAvatar = uData.avatar || '';
      }
    } catch (e) {}

    const currentBalance = Math.max(localBal, sbBal);

    if (currentBalance < coinsToDeduct) {
      return NextResponse.json({
        success: false,
        message: `Bạn cần ${coinsToDeduct} Điểm để mời cà phê (Số dư hiện tại: ${currentBalance} Điểm). Hãy nạp thêm nhé!`,
        needCoins: true,
        balance: currentBalance,
      }, { status: 400 });
    }

    // 2. Trừ điểm
    db.adjustCoins(userId, -coinsToDeduct);
    const newBalance = Math.max(0, currentBalance - coinsToDeduct);

    try {
      await supabaseAdmin.from('users').update({ balance: newBalance }).eq('id', userId);
      await supabaseAdmin.from('transactions').insert({
        id: `tip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        amount_vnd: 0,
        coins: -coinsToDeduct,
        payment_code: `TIP_${storyId}_CHAP${chapterIndex}_${Date.now()}`,
        status: 'completed',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Lỗi cập nhật transaction tip trên Supabase:', e);
    }

    // 3. Ghi nhận Tip record
    const tipRecord = db.recordChapterTip({
      id: `tip-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      storyId,
      chapterIndex,
      userId,
      userName: uName,
      userAvatar: uAvatar,
      amountCoins: coinsToDeduct,
      message: message.trim() || undefined,
      isPrivate: Boolean(isPrivate),
      createdAt: new Date().toISOString(),
    });

    // 4. Tự động đăng bình luận chúc mừng vào phần comment
    try {
      let commentContent = '';
      if (isPrivate) {
        commentContent = `☕ [Tặng Riêng] Đã mời tác giả ${coinsToDeduct} Điểm cà phê và gửi lời nhắn riêng tư! 🔒❤️`;
      } else {
        commentContent = message.trim()
          ? `☕ Đã mời tác giả ${coinsToDeduct} Điểm: "${message.trim()}"`
          : `☕ Đã mời tác giả ${coinsToDeduct} Điểm ly cà phê ấm áp! ❤️`;
      }

      db.addComment({
        storyId,
        chapterIndex,
        userId,
        userName: uName,
        userAvatar: uAvatar,
        content: commentContent,
      });

      try {
        await supabaseAdmin.from('comments').insert({
          id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          story_id: storyId,
          chapter_index: chapterIndex,
          user_id: userId,
          user_name: uName,
          user_avatar: uAvatar,
          content: commentContent,
          likes: 0,
          created_at: new Date().toISOString(),
        });
      } catch (e) {}
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Cảm ơn bạn đã mời tác giả ${coinsToDeduct} Điểm ly cà phê! ❤️`,
      newBalance,
      tip: tipRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Lỗi gửi cà phê' }, { status: 500 });
  }
}
