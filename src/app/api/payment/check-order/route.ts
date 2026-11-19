import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderCode = searchParams.get('orderCode');

  if (!orderCode) {
    return NextResponse.json({ success: false, message: 'Thiếu mã đơn' }, { status: 400 });
  }

  let order = db.getOrderByCode(orderCode);
  let isCompleted = order?.status === 'completed';
  let userId = order?.userId;
  let orderCreatedAt = order?.createdAt;

  // Kiểm tra trạng thái trên Supabase transactions nếu local chưa xong
  if (!isCompleted) {
    try {
      const { data: sbTx } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('payment_code', orderCode)
        .maybeSingle();

      if (sbTx) {
        if (!userId) userId = sbTx.user_id;
        if (!orderCreatedAt) orderCreatedAt = sbTx.created_at;
        if (sbTx.status === 'completed') {
          isCompleted = true;
          if (order && order.status !== 'completed') {
            db.completeOrder(orderCode);
          }
        }
      }
    } catch (e) {}
  }

  if (!order && !userId) {
    return NextResponse.json({ success: false, message: 'Không tìm thấy đơn hàng' }, { status: 404 });
  }

  // Kiểm tra thời hạn hiệu lực thực tế: 15 phút (900.000 ms)
  const isExpired = Boolean(orderCreatedAt && !isCompleted && (Date.now() - new Date(orderCreatedAt).getTime() > 15 * 60 * 1000));

  const effectiveUserId = userId || order?.userId || '';
  const wallet = db.getWallet(effectiveUserId);
  let balance = wallet.balance || 0;
  let isVip = db.isVip(effectiveUserId);

  try {
    const { data: sbUser } = await supabaseAdmin.from('users').select('balance').eq('id', effectiveUserId).maybeSingle();
    if (sbUser) balance = Math.max(balance, sbUser.balance || 0);

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(effectiveUserId);
    const vipUntil = authUser?.user?.user_metadata?.vip_until;
    if (vipUntil && new Date(vipUntil) > new Date()) isVip = true;
  } catch (e) {}

  return NextResponse.json({
    success: true,
    status: isCompleted ? 'completed' : isExpired ? 'expired' : 'pending',
    completed: isCompleted,
    isExpired,
    balance,
    isVip,
  });
}
