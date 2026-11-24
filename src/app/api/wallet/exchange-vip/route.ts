import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserBalanceAndVip, addUserVipDaysOnSupabase } from '@/lib/vip-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const EXCHANGE_COINS_COST = 40;
const VIP_DAYS_REWARD = 7;
const activeExchangeLocks = new Set<string>();

export async function POST(req: NextRequest) {
  let lockedUserId = '';
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để thực hiện đổi Điểm' },
        { status: 401 }
      );
    }

    if (activeExchangeLocks.has(userId)) {
      return NextResponse.json(
        { success: false, message: 'Giao dịch đang được xử lý, vui lòng chờ giây lát!' },
        { status: 429 }
      );
    }
    activeExchangeLocks.add(userId);
    lockedUserId = userId;

    // 1. Kiểm tra số dư Điểm & VIP thực tế (Supabase + Local DB)
    const userState = await getUserBalanceAndVip(userId);
    const currentBalance = userState.balance;

    if (currentBalance < EXCHANGE_COINS_COST) {
      return NextResponse.json(
        {
          success: false,
          message: `Số dư của bạn không đủ (${currentBalance}/${EXCHANGE_COINS_COST} Điểm). Vui lòng nạp thêm để đổi gói VIP!`,
          currentBalance,
          requiredCoins: EXCHANGE_COINS_COST,
        },
        { status: 400 }
      );
    }

    // 2. Cộng thêm 7 ngày VIP và trừ 40 Điểm trên Supabase
    const newBalance = currentBalance - EXCHANGE_COINS_COST;
    const newVipUntilIso = await addUserVipDaysOnSupabase(userId, VIP_DAYS_REWARD);

    // 3. Cập nhật trừ Điểm và ghi lịch sử giao dịch trên Supabase
    try {
      await supabaseAdmin
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);

      await supabaseAdmin.from('transactions').insert({
        id: `tx-ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        amount_vnd: 0,
        coins: -EXCHANGE_COINS_COST,
        payment_code: `EXCHANGE_VIP_7D_${Date.now()}`,
        status: 'completed',
        created_at: new Date().toISOString(),
      });
    } catch (sbErr) {
      console.warn('Lỗi ghi dữ liệu VIP đổi điểm sang Supabase:', sbErr);
    }

    // 4. Đồng bộ Local DB
    db.deductCoins(userId, EXCHANGE_COINS_COST);
    db.addVipDays(userId, VIP_DAYS_REWARD);

    // Ghi nhận đơn hàng Local để hiển thị trong Lịch sử giao dịch
    try {
      db.createOrder({
        id: `ord-ex-${Date.now()}`,
        userId,
        amountVnd: 0,
        packageType: 'VIP_39K',
        orderCode: `EX_VIP7D_${Date.now().toString().slice(-6)}`,
        coinsReceived: -EXCHANGE_COINS_COST,
        vipDaysReceived: VIP_DAYS_REWARD,
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `🎉 Đổi thành công ${EXCHANGE_COINS_COST} Điểm lấy ${VIP_DAYS_REWARD} Ngày Hội Viên VIP!`,
      newBalance,
      vipUntil: newVipUntilIso,
      vipDays: VIP_DAYS_REWARD,
    });
  } catch (error: any) {
    console.error('Lỗi API exchange-vip:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi xử lý đổi điểm VIP' },
      { status: 500 }
    );
  } finally {
    if (lockedUserId) {
      activeExchangeLocks.delete(lockedUserId);
    }
  }
}
