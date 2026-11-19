import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { generateVietQrUrl } from '@/lib/sepay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Thiếu mã người dùng' }, { status: 400 });
  }

  try {
    let orders: any[] = [];

    // 1. Lấy giao dịch từ Supabase
    try {
      const { data: sbTxs, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && sbTxs && sbTxs.length > 0) {
        orders = sbTxs.map(tx => {
          const createdAt = tx.created_at;
          const createdTime = new Date(createdAt).getTime();
          const ageMs = Date.now() - createdTime;
          const isExpired = ageMs > 15 * 60 * 1000;
          const remainingSec = Math.max(0, Math.floor((15 * 60 * 1000 - ageMs) / 1000));
          const displayRemainingSec = Math.max(0, Math.floor((10 * 60 * 1000 - ageMs) / 1000));

          let status = tx.status || 'pending';
          if (status === 'pending' && isExpired) {
            status = 'expired';
          }

          const isVip = tx.payment_code?.startsWith('VIP') || tx.amount_vnd === 39000;
          const packageName = isVip
            ? '👑 Gói Hội Viên VIP 30 Ngày (+50 Điểm)'
            : tx.amount_vnd >= 50000
            ? '🍕 Gói 120 Điểm (50.000đ)'
            : tx.amount_vnd >= 20000
            ? '🥤 Gói 45 Điểm (20.000đ)'
            : '☕ Gói 20 Điểm (10.000đ)';

          const qrUrl = generateVietQrUrl({
            amount: tx.amount_vnd,
            orderCode: tx.payment_code,
          });

          return {
            id: tx.id,
            orderCode: tx.payment_code,
            amountVnd: tx.amount_vnd,
            coinsReceived: tx.coins || (isVip ? 50 : 20),
            packageType: isVip ? 'VIP_39K' : tx.amount_vnd >= 50000 ? 'COIN_50K' : tx.amount_vnd >= 20000 ? 'COIN_20K' : 'COIN_10K',
            packageName,
            status,
            createdAt,
            expiresAt: new Date(createdTime + 15 * 60 * 1000).toISOString(),
            displayExpiresAt: new Date(createdTime + 10 * 60 * 1000).toISOString(),
            isExpired,
            remainingSec,
            displayRemainingSec,
            qrUrl,
          };
        });
      }
    } catch (e) {
      console.warn('Lỗi đọc transactions Supabase:', e);
    }

    // 2. Fallback nếu Supabase chưa có dữ liệu
    if (orders.length === 0) {
      const localOrders = db.getAllOrders().filter(o => o.userId === userId);
      orders = localOrders.map(tx => {
        const createdAt = tx.createdAt;
        const createdTime = new Date(createdAt).getTime();
        const ageMs = Date.now() - createdTime;
        const isExpired = ageMs > 15 * 60 * 1000;
        const remainingSec = Math.max(0, Math.floor((15 * 60 * 1000 - ageMs) / 1000));
        const displayRemainingSec = Math.max(0, Math.floor((10 * 60 * 1000 - ageMs) / 1000));

        let status = tx.status || 'pending';
        if (status === 'pending' && isExpired) {
          status = 'expired';
        }

        const isVip = tx.packageType === 'VIP_39K';
        const packageName = isVip
          ? '👑 Gói Hội Viên VIP 30 Ngày (+50 Điểm)'
          : tx.amountVnd >= 50000
          ? '🍕 Gói 120 Điểm (50.000đ)'
          : tx.amountVnd >= 20000
          ? '🥤 Gói 45 Điểm (20.000đ)'
          : '☕ Gói 20 Điểm (10.000đ)';

        const qrUrl = generateVietQrUrl({
          amount: tx.amountVnd,
          orderCode: tx.orderCode,
        });

        return {
          id: tx.id,
          orderCode: tx.orderCode,
          amountVnd: tx.amountVnd,
          coinsReceived: tx.coinsReceived,
          packageType: tx.packageType,
          packageName,
          status,
          createdAt,
          expiresAt: new Date(createdTime + 15 * 60 * 1000).toISOString(),
          displayExpiresAt: new Date(createdTime + 10 * 60 * 1000).toISOString(),
          isExpired,
          remainingSec,
          displayRemainingSec,
          qrUrl,
        };
      });
    }

    // Tìm đơn đang chờ thanh toán còn hiệu lực mới nhất (nếu có)
    const activePendingOrder = orders.find(o => o.status === 'pending' && !o.isExpired) || null;

    return NextResponse.json({
      success: true,
      orders,
      activePendingOrder,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
