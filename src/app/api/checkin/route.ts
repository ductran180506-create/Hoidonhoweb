import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Lịch trả thưởng chuỗi 7 ngày (Tổng tròn đúng 15 Điểm = 1 Ly Cà Phê 10.000đ)
// Ngày 1: +1 | Ngày 2: +1 | Ngày 3: +2 | Ngày 4: +2 | Ngày 5: +2 | Ngày 6: +2 | Ngày 7: +5
const STREAK_REWARDS = [1, 1, 2, 2, 2, 2, 5];

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (Asia/Ho_Chi_Minh - UTC+7)
 */
function getVietnamDateStr(date: Date = new Date()): string {
  const vnDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const y = vnDate.getFullYear();
  const m = String(vnDate.getMonth() + 1).padStart(2, '0');
  const d = String(vnDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tính số mili-giây còn lại cho đến 00:00 ngày mai (giờ VN)
 */
function getTimeUntilNextDayMs(): number {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const vnTomorrow = new Date(vnNow);
  vnTomorrow.setDate(vnTomorrow.getDate() + 1);
  vnTomorrow.setHours(0, 0, 0, 0);
  return Math.max(0, vnTomorrow.getTime() - vnNow.getTime());
}

/**
 * GET /api/checkin?userId=...
 * Kiểm tra trạng thái điểm danh hôm nay và chuỗi hiện tại của người dùng
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const todayStr = getVietnamDateStr();
    const timeLeftMs = getTimeUntilNextDayMs();

    if (!userId) {
      // Khách chưa đăng nhập: Trả về trạng thái mẫu chuỗi 7 ngày để xem trước
      return NextResponse.json({
        success: true,
        isGuest: true,
        canCheckIn: true,
        todayStr,
        streak: 0,
        lastCheckInDate: null,
        nextReward: STREAK_REWARDS[0],
        timeLeftMs,
        rewards: STREAK_REWARDS,
      });
    }

    // 1. Tìm các giao dịch điểm danh của user trong Supabase
    let checkinTxs: any[] = [];
    try {
      const { data } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .ilike('payment_code', 'CHECKIN_%')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) checkinTxs = data;
    } catch (e) {}

    // 2. Lấy metadata từ Supabase Auth nếu là user Google
    let authMetadata: any = null;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      authMetadata = authUser?.user?.user_metadata || null;
    } catch (e) {}

    // Xác định xem hôm nay đã điểm danh chưa
    const todayCode = `CHECKIN_${todayStr}`;
    const checkedToday = checkinTxs.some(t => t.payment_code === todayCode) || 
                         authMetadata?.last_checkin_date === todayStr;

    // Tính toán chuỗi liên tiếp (streak)
    let currentStreak = authMetadata?.checkin_streak || 0;

    if (currentStreak === 0 && checkinTxs.length > 0) {
      // Phục hồi streak từ lịch sử giao dịch
      const latestTx = checkinTxs[0];
      const latestDateStr = latestTx.payment_code.replace('CHECKIN_', '');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getVietnamDateStr(yesterday);

      if (latestDateStr === todayStr) {
        currentStreak = Math.min(7, checkinTxs.length);
      } else if (latestDateStr === yesterdayStr) {
        currentStreak = Math.min(7, checkinTxs.length);
      } else {
        // Đã đứt chuỗi
        currentStreak = 0;
      }
    }

    // Nếu đã quá 1 ngày mà không điểm danh (và hôm nay chưa điểm danh), chuỗi bị đứt quay về 0
    if (!checkedToday && authMetadata?.last_checkin_date) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getVietnamDateStr(yesterday);
      if (authMetadata.last_checkin_date !== yesterdayStr) {
        currentStreak = 0;
      }
    }

    // Xác định phần thưởng của ngày tiếp theo
    const nextRewardIndex = checkedToday 
      ? Math.min(6, currentStreak % 7) // ngày mai
      : Math.min(6, currentStreak);    // hôm nay
    const nextReward = STREAK_REWARDS[nextRewardIndex] || 1;

    return NextResponse.json({
      success: true,
      isGuest: false,
      canCheckIn: !checkedToday,
      todayStr,
      streak: currentStreak,
      lastCheckInDate: authMetadata?.last_checkin_date || (checkinTxs[0]?.payment_code?.replace('CHECKIN_', '') || null),
      nextReward,
      timeLeftMs,
      rewards: STREAK_REWARDS,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/checkin
 * Thực hiện điểm danh nhận xu trong ngày
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập để điểm danh nhận quà' }, { status: 401 });
    }

    const todayStr = getVietnamDateStr();
    const todayCode = `CHECKIN_${todayStr}`;

    // 1. Kiểm tra xem hôm nay tài khoản này đã nhận quà chưa
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('payment_code', todayCode)
      .maybeSingle();

    let authUser: any = null;
    try {
      const authRes = await supabaseAdmin.auth.admin.getUserById(userId);
      authUser = authRes.data?.user;
    } catch (e) {}

    if (existingTx || authUser?.user_metadata?.last_checkin_date === todayStr) {
      return NextResponse.json({
        success: false,
        message: 'Hôm nay bạn đã nhận quà rồi! Hãy quay lại vào ngày mai nhé.',
        alreadyChecked: true,
      }, { status: 400 });
    }

    // 2. Tính toán số ngày chuỗi (Streak)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getVietnamDateStr(yesterday);

    let prevStreak = authUser?.user_metadata?.checkin_streak || 0;
    const lastCheckIn = authUser?.user_metadata?.last_checkin_date;

    let newStreak = 1;
    if (lastCheckIn === yesterdayStr) {
      // Điểm danh liên tiếp ngày hôm qua -> Tăng chuỗi
      newStreak = prevStreak >= 7 ? 1 : prevStreak + 1;
    } else {
      // Đứt chuỗi hoặc bắt đầu chuỗi mới
      newStreak = 1;
    }

    // 3. Xác định mức thưởng theo ngày chuỗi (newStreak từ 1 đến 7)
    // Ngày 1: 1đ | Ngày 2: 1đ | Ngày 3: 2đ | Ngày 4: 2đ | Ngày 5: 2đ | Ngày 6: 2đ | Ngày 7: 5đ
    const rewardIndex = Math.min(6, Math.max(0, newStreak - 1));
    const rewardCoins = STREAK_REWARDS[rewardIndex];

    // 4. Cộng tiền vào ví tài khoản trên Supabase
    let newBalance = 0;
    try {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', userId)
        .maybeSingle();

      const currentBal = userRow?.balance || 0;
      newBalance = currentBal + rewardCoins;

      if (userRow) {
        await supabaseAdmin
          .from('users')
          .update({ balance: newBalance, last_active: new Date().toISOString() })
          .eq('id', userId);
      } else {
        await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            phone: authUser?.email || userId,
            balance: newBalance,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          });
      }
    } catch (e) {
      console.warn('[CheckIn] Lỗi cập nhật users table:', e);
    }

    // 5. Ghi nhận giao dịch vào transactions table
    try {
      await supabaseAdmin.from('transactions').insert({
        id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        amount_vnd: 0,
        coins: rewardCoins,
        payment_code: todayCode,
        status: 'completed',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[CheckIn] Lỗi ghi transactions:', e);
    }

    // 6. Cập nhật metadata nếu là user Auth
    if (authUser) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...(authUser.user_metadata || {}),
            checkin_streak: newStreak,
            last_checkin_date: todayStr,
          },
        });
      } catch (e) {}
    }

    // 7. Đồng bộ ví Local DB dự phòng
    try {
      const w = db.addCoins(userId, rewardCoins);
      newBalance = Math.max(newBalance, w.balance);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      reward: rewardCoins,
      newStreak,
      newBalance,
      isDay7Jackpot: newStreak === 7,
      message: newStreak === 7
        ? `🎉 XUẤT SẮC! Bạn đã hoàn thành chuỗi 7 ngày và mở Rương Hoàng Gia nhận +${rewardCoins} Điểm!`
        : `🎁 Điểm danh Ngày ${newStreak} thành công! Bạn nhận được +${rewardCoins} Điểm.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
