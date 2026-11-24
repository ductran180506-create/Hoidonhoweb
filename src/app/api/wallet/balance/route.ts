import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Thiếu userId' }, { status: 400 });
  }

  let balance = 0;
  let isVip = db.isVip(userId);
  let vipUntil: string | null = null;

  // 1. Kiểm tra số dư từ bảng Supabase users (Lưu ý: bảng users chỉ có cột balance, không có cột vip_until)
  try {
    const { data: sbUser } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (sbUser && typeof sbUser.balance === 'number') {
      balance = Math.max(balance, sbUser.balance);
    }
  } catch (e) {}

  // 2. Kiểm tra VIP từ Supabase Auth metadata (dành cho user đăng nhập Google / UUID)
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUuid) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const auVip = authUser?.user?.user_metadata?.vip_until;
      if (auVip && new Date(auVip) > new Date()) {
        isVip = true;
        if (!vipUntil || new Date(auVip) > new Date(vipUntil)) {
          vipUntil = auVip;
        }
      }
    }
  } catch (e) {}

  // 3. Kiểm tra VIP từ lịch sử giao dịch thành công trên Supabase (hỗ trợ cả tài khoản SĐT/Username trên Vercel Serverless)
  try {
    const { data: vipTxs } = await supabaseAdmin
      .from('transactions')
      .select('payment_code, amount_vnd, created_at')
      .eq('user_id', userId)
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
        isVip = true;
        const calcIso = new Date(calcExpireMs).toISOString();
        if (!vipUntil || new Date(calcIso) > new Date(vipUntil)) {
          vipUntil = calcIso;
        }
      }
    }
  } catch (e) {}

  // 4. Kết hợp với ví Local DB
  const localWallet = db.getWallet(userId);
  balance = Math.max(balance, localWallet.balance || 0);
  const localUser = db.getUserByIdOrPhone?.(userId) || db.getUserByPhone?.(userId);
  if (localUser?.vipUntil && new Date(localUser.vipUntil) > new Date()) {
    isVip = true;
    if (!vipUntil || new Date(localUser.vipUntil) > new Date(vipUntil)) {
      vipUntil = localUser.vipUntil;
    }
  }

  return NextResponse.json({
    success: true,
    balance,
    isVip,
    vipUntil,
  });
}
