import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { syncGmailSacombankPayments } from '@/lib/gmail-payment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  try {
    const { orderCode, userId } = await req.json();

    if (!orderCode) {
      return NextResponse.json({ success: false, message: 'Thiếu mã đơn hàng' }, { status: 400 });
    }

    // 1. Cập nhật trạng thái đơn sang 'processing' (Đang xử lý) trên Local DB
    const localOrd = db.getOrderByCode(orderCode);
    if (localOrd && localOrd.status === 'pending') {
      localOrd.status = 'processing';
    }

    // 2. Cập nhật trạng thái đơn sang 'processing' trên Supabase
    let currentStatus: string = localOrd?.status || 'processing';
    let effectiveUserId = userId || localOrd?.userId || '';

    try {
      const { data: sbTx } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('payment_code', orderCode)
        .maybeSingle();

      if (sbTx) {
        if (!effectiveUserId) effectiveUserId = sbTx.user_id;
        if (sbTx.status === 'completed') {
          currentStatus = 'completed';
        } else {
          await supabaseAdmin
            .from('transactions')
            .update({ status: 'processing' })
            .eq('payment_code', orderCode)
            .eq('status', 'pending');
          currentStatus = 'processing';
        }
      }
    } catch (e) {
      console.warn('Lỗi cập nhật processing Supabase:', e);
    }

    // 3. Nếu chưa completed, lập tức quét Gmail Sacombank (force = true) để đối chiếu giá tiền & mã nội dung ngay
    let isCompleted = currentStatus === 'completed';
    if (!isCompleted) {
      try {
        const { matchedOrders } = await syncGmailSacombankPayments(orderCode, true);
        if (matchedOrders.includes(orderCode)) {
          isCompleted = true;
          currentStatus = 'completed';
        }
      } catch (err) {
        console.warn('Lỗi quét Gmail ngay khi bấm xác nhận chuyển khoản:', err);
      }
    }

    // 4. Lấy số dư mới nhất trả về cho user
    const wallet = db.getWallet(effectiveUserId);
    let balance = wallet.balance || 0;
    let isVip = db.isVip(effectiveUserId);

    try {
      const { data: sbUser } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', effectiveUserId)
        .maybeSingle();
      if (sbUser) balance = Math.max(balance, sbUser.balance || 0);
    } catch {}

    return NextResponse.json({
      success: true,
      status: isCompleted ? 'completed' : 'processing',
      completed: isCompleted,
      balance,
      isVip,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
