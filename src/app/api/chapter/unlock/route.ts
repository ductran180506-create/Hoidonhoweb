import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/user-auth';
import { supabaseAdmin, toCdnUrls } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, chapterId, storyId, action = 'unlock' } = await req.json();

    if (!chapterId || !storyId) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin tập truyện' }, { status: 400 });
    }

    // 1. Tìm tập truyện trên Supabase trước
    let chapter: any = null;
    try {
      const { data: sbChap } = await supabaseAdmin
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (sbChap) {
        chapter = {
          id: sbChap.id,
          storyId: sbChap.story_id,
          chapterIndex: sbChap.chapter_number,
          title: sbChap.title,
          priceCoins: sbChap.price,
          content: '',
          images: sbChap.images || [],
          createdAt: sbChap.created_at,
        };
      }
    } catch (e) {
      // ignore
    }

    // Fallback sang local db nếu chưa tìm thấy
    if (!chapter) {
      const chapters = db.getChaptersByStoryId(storyId);
      chapter = chapters.find(c => c.id === chapterId);
    }

    if (!chapter) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy tập truyện' }, { status: 404 });
    }

    // 2. Tập MIỄN PHÍ: Chỉ khi tác giả đặt 0 Điểm (hoặc không cài giá)
    if (!chapter.priceCoins || chapter.priceCoins === 0) {
      return NextResponse.json({
        success: true,
        unlocked: true,
        content: chapter.content,
        images: toCdnUrls(chapter.images),
      });
    }

    // 3. Với tập có phí: BẮT BUỘC XÁC THỰC DANH TÍNH
    const verifiedUserId = getAuthenticatedUserId(req);
    const effectiveUserId = verifiedUserId || userId;

    if (!effectiveUserId) {
      return NextResponse.json({
        success: false,
        requireAuth: true,
        message: 'Vui lòng đăng nhập hoặc nạp Điểm để mở khóa full bộ',
        priceCoins: chapter.priceCoins || 5,
      }, { status: 401 });
    }

    if (verifiedUserId && userId && verifiedUserId !== userId) {
      return NextResponse.json({
        success: false,
        message: 'Cảnh báo an ninh: Không thể sử dụng tài khoản của người khác để mở khóa',
      }, { status: 403 });
    }

    // 4. Kiểm tra VIP (Local DB hoặc Supabase Auth metadata hoặc lịch sử giao dịch VIP)
    let isVipUser = db.isVip(effectiveUserId);

    if (!isVipUser) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveUserId);
        if (isUuid) {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(effectiveUserId);
          const vipUntil = authUser?.user?.user_metadata?.vip_until;
          if (vipUntil && new Date(vipUntil) > new Date()) {
            isVipUser = true;
          }
        }
      } catch (e) {}
    }

    if (!isVipUser) {
      try {
        const { data: vipTxs } = await supabaseAdmin
          .from('transactions')
          .select('payment_code, amount_vnd, created_at')
          .eq('user_id', effectiveUserId)
          .eq('status', 'completed')
          .order('created_at', { ascending: true });

        if (vipTxs && vipTxs.length > 0) {
          let calcExpireMs = 0;
          for (const tx of vipTxs) {
            const code = (tx.payment_code || '').toUpperCase();
            let daysToAdd = 0;
            if (code.startsWith('VIP') || Number(tx.amount_vnd) === 39000) {
              daysToAdd = 30;
            } else if (code.includes('EXCHANGE_VIP') || code.includes('EX_VIP')) {
              daysToAdd = 7;
            } else if (code.includes('LUCKY_REWARD_VIP_')) {
              const m = code.match(/LUCKY_REWARD_VIP_(\d+)DAYS/);
              daysToAdd = m ? parseInt(m[1], 10) : 1;
            }
            if (daysToAdd > 0) {
              const txTime = new Date(tx.created_at).getTime();
              const baseTime = calcExpireMs > txTime ? calcExpireMs : txTime;
              calcExpireMs = baseTime + daysToAdd * 24 * 60 * 60 * 1000;
            }
          }
          if (calcExpireMs > Date.now()) {
            isVipUser = true;
          }
        }
      } catch (e) {}
    }

    if (isVipUser) {
      return NextResponse.json({
        success: true,
        unlocked: true,
        isVip: true,
        content: chapter.content,
        images: toCdnUrls(chapter.images),
        message: 'Tài khoản VIP - Đã mở khóa full bộ!',
      });
    }

    // 5. Kiểm tra nếu đã mở khóa trước đó (Supabase hoặc local)
    // Độc giả chỉ cần mở khóa 1 lần là mở khóa đọc FULL BỘ TRUYỆN - TUYỆT ĐỐI KHÔNG KHÓA LẠI
    try {
      const localStory = db.getStoryById(storyId) || db.getStories().find(s => s.slug === storyId || `story-${s.slug}` === storyId);
      const possibleStoryIds = [storyId];
      if (localStory) {
        if (localStory.id && !possibleStoryIds.includes(localStory.id)) possibleStoryIds.push(localStory.id);
        if (localStory.slug && !possibleStoryIds.includes(`story-${localStory.slug}`)) possibleStoryIds.push(`story-${localStory.slug}`);
      }

      const { data: sbUnlocked } = await supabaseAdmin
        .from('unlocked_chapters')
        .select('id, chapter_id')
        .eq('user_id', effectiveUserId)
        .in('story_id', possibleStoryIds);

      if (sbUnlocked && sbUnlocked.length > 0) {
        return NextResponse.json({
          success: true,
          unlocked: true,
          content: chapter.content,
          images: toCdnUrls(chapter.images),
        });
      }
    } catch (e) {}

    if (db.hasUnlockedStory(effectiveUserId, storyId) || db.hasUnlockedChapter(effectiveUserId, chapterId)) {
      return NextResponse.json({
        success: true,
        unlocked: true,
        content: chapter.content,
        images: toCdnUrls(chapter.images),
      });
    }

    const unlockPrice = chapter.priceCoins || 5;

    // Nếu chỉ là kiểm tra xem tập đã mở chưa (action === 'check') thì KHÔNG TRỪ ĐIỂM TỰ ĐỘNG
    if (action === 'check') {
      return NextResponse.json({
        success: true,
        unlocked: false,
        priceCoins: unlockPrice,
        message: 'Tập truyện đang bị khóa. Mở khóa 5 Điểm để đọc trọn bộ!',
      });
    }

    // 6. Kiểm tra số dư Điểm và trừ điểm (Chỉ khi độc giả bấm nút MỞ KHÓA action === 'unlock')
    let currentBalance = 0;
    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', effectiveUserId)
        .single();
      if (user) currentBalance = user.balance || 0;
    } catch (e) {}

    const localWallet = db.getWallet(effectiveUserId);
    currentBalance = Math.max(currentBalance, localWallet.balance);

    if (currentBalance < unlockPrice) {
      return NextResponse.json({
        success: false,
        requireCoins: true,
        currentBalance,
        priceCoins: unlockPrice,
        message: `Số dư không đủ (${currentBalance}/${unlockPrice} Điểm). Vui lòng mời cà phê tích thêm Điểm!`,
      }, { status: 402 });
    }

    // Trừ Điểm trên Supabase
    const newBalance = currentBalance - unlockPrice;
    try {
      await supabaseAdmin.from('users').update({ balance: newBalance }).eq('id', effectiveUserId);
      await supabaseAdmin.from('unlocked_chapters').insert({
        user_id: effectiveUserId,
        story_id: storyId,
        chapter_id: chapterId,
      });
    } catch (sbErr) {
      console.warn('Lỗi sync unlock sang Supabase:', sbErr);
    }

    // Đồng bộ Local DB
    db.deductCoins(effectiveUserId, unlockPrice);
    db.unlockChapter(effectiveUserId, chapterId, storyId);

    return NextResponse.json({
      success: true,
      unlocked: true,
      newBalance,
      content: chapter.content,
      images: toCdnUrls(chapter.images),
      message: `Đã mở khóa full bộ thành công! (Trừ ${unlockPrice} Điểm)`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
