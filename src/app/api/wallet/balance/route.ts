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

  // 1. Kiểm tra từ Supabase users
  try {
    const { data: sbUser } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (sbUser) {
      balance = Math.max(balance, sbUser.balance || 0);
    }
  } catch (e) {}

  // 2. Kiểm tra VIP từ Supabase Auth metadata nếu có
  if (!isVip) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const vipUntil = authUser?.user?.user_metadata?.vip_until;
      if (vipUntil && new Date(vipUntil) > new Date()) {
        isVip = true;
      }
    } catch (e) {}
  }

  // 3. Kết hợp với ví Local DB
  const localWallet = db.getWallet(userId);
  balance = Math.max(balance, localWallet.balance || 0);

  return NextResponse.json({
    success: true,
    balance,
    isVip,
  });
}
