import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { syncGmailSacombankPayments } from '@/lib/gmail-payment';
import { getUserBalanceAndVip } from '@/lib/vip-server';

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
  let isProcessing = order?.status === 'processing';
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
        if (sbTx.status === 'processing') {
          isProcessing = true;
        }
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

  // Kiểm tra thời hạn hiệu lực hiển thị giao diện: 15 phút (900.000 ms)
  let isExpired = Boolean(orderCreatedAt && !isCompleted && (Date.now() - new Date(orderCreatedAt).getTime() > 15 * 60 * 1000));

  // Luôn quét thông báo Gmail từ Sacombank nếu đơn chưa completed (đảm bảo khách chuyển tiền lúc nào cũng được cộng)
  if (!isCompleted) {
    try {
      const { matchedOrders } = await syncGmailSacombankPayments(orderCode);
      if (matchedOrders.includes(orderCode)) {
        isCompleted = true;
        isExpired = false;
      }
    } catch (err) {
      console.warn('Lỗi quét Gmail Sacombank trong check-order:', err);
    }
  }

  const effectiveUserId = userId || order?.userId || '';
  const { balance, isVip, vipUntil } = await getUserBalanceAndVip(effectiveUserId);

  return NextResponse.json({
    success: true,
    status: isCompleted ? 'completed' : isExpired ? 'expired' : isProcessing ? 'processing' : 'pending',
    completed: isCompleted,
    isExpired,
    balance,
    isVip,
    vipUntil,
  });
}
