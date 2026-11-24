import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const EXCHANGE_COINS_COST = 40;
const VIP_DAYS_REWARD = 7;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng đăng nhập để thực hiện đổi Điểm' },
        { status: 401 }
      );
    }

    // 1. Kiểm tra số dư Điểm thực tế (Supabase + Local DB)
    let currentBalance = 0;
    try {
      const { data: sbUser } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', userId)
        .maybeSingle();
      if (sbUser) {
        currentBalance = Math.max(currentBalance, sbUser.balance || 0);
      }
    } catch (e) {
      console.warn('Lỗi đọc balance từ Supabase:', e);
    }

    const localWallet = db.getWallet(userId);
    currentBalance = Math.max(currentBalance, localWallet.balance || 0);

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

    // 2. Tính toán thời hạn VIP mới (7 ngày = 7 * 24 * 60 * 60 * 1000 ms)
    const nowMs = Date.now();
    const addVipMs = VIP_DAYS_REWARD * 24 * 60 * 60 * 1000;
    let currentVipExpire = nowMs;

    // Kiểm tra xem hiện tại user có đang là VIP hay không để cộng dồn thêm
    try {
      const authRes = await supabaseAdmin.auth.admin.getUserById(userId);
      const auVip = authRes.data?.user?.user_metadata?.vip_until;
      if (auVip && new Date(auVip).getTime() > nowMs) {
        currentVipExpire = new Date(auVip).getTime();
      }
    } catch (e) {}

    // Kiểm tra thêm từ local DB
    const localUser = db.getUserByPhone?.(userId);
    if (localUser?.vipUntil && new Date(localUser.vipUntil).getTime() > nowMs) {
      currentVipExpire = Math.max(currentVipExpire, new Date(localUser.vipUntil).getTime());
    }

    const newVipTime = currentVipExpire + addVipMs;
    const newVipUntilIso = new Date(newVipTime).toISOString();
    const newBalance = currentBalance - EXCHANGE_COINS_COST;

    // 3. Cập nhật trừ Điểm và kích hoạt VIP trên Supabase
    try {
      await supabaseAdmin
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { vip_until: newVipUntilIso },
      });

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
  }
}
