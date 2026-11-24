import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { generateVietQrUrl } from '@/lib/sepay';
import { syncGmailSacombankPayments } from '@/lib/gmail-payment';

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

      // Nếu user có đơn đang pending/processing trong 48 giờ gần nhất, tự động quét Gmail Sacombank để đối soát ngay
      let newlyMatched: string[] = [];
      if (!error && sbTxs && sbTxs.some(tx => (tx.status === 'pending' || tx.status === 'processing') && (Date.now() - new Date(tx.created_at).getTime() <= 48 * 60 * 60 * 1000))) {
        try {
          const syncRes = await syncGmailSacombankPayments();
          newlyMatched = syncRes.matchedOrders;
        } catch {}
      }

      if (!error && sbTxs && sbTxs.length > 0) {
        orders = sbTxs.map(tx => {
          const createdAt = tx.created_at;
          const createdTime = new Date(createdAt).getTime();
          const ageMs = Date.now() - createdTime;
          // Hiển thị user: đúng 10 phút (600s)
          const isUserExpired = ageMs > 10 * 60 * 1000;
          // Hệ thống duy trì ngầm: 15 phút (900s)
          const isSystemExpired = ageMs > 15 * 60 * 1000;
          const remainingSec = Math.max(0, Math.floor((10 * 60 * 1000 - ageMs) / 1000));

          let status = newlyMatched.includes(tx.payment_code) ? 'completed' : (tx.status || 'pending');
          if (status === 'pending' && isUserExpired) {
            status = 'expired';
          } else if (status === 'processing' && isSystemExpired) {
            status = 'expired';
          }

          const isExVip = Boolean(tx.payment_code?.includes('EXCHANGE_VIP') || tx.payment_code?.includes('EX_VIP'));
          const isCheckin = Boolean(tx.payment_code?.includes('CHECKIN'));
          const isLucky = Boolean(tx.payment_code?.includes('LUCKY'));
          const isVip = tx.payment_code?.startsWith('VIP') || tx.amount_vnd === 39000;
          const packageName = isExVip
            ? '👑 Đổi 40 Điểm ➔ 7 Ngày VIP'
            : isCheckin
            ? '🎁 Thưởng Điểm Danh Hàng Ngày'
            : isLucky
            ? '🎡 Thưởng Vòng Quay May Mắn'
            : isVip
            ? '👑 Gói Hội Viên VIP 30 Ngày (+30 Điểm)'
            : tx.amount_vnd >= 50000
            ? '🍕 Gói 75 Điểm (50.000đ)'
            : tx.amount_vnd >= 20000
            ? '🥤 Gói 25 Điểm (20.000đ)'
            : tx.amount_vnd >= 10000
            ? '☕ Gói 15 Điểm (10.000đ)'
            : '🎁 Quà Tặng / Phần Thưởng';

          const qrUrl = ((status === 'pending' && !isUserExpired) || (status === 'processing' && !isSystemExpired))
            ? generateVietQrUrl({
                amount: tx.amount_vnd,
                orderCode: tx.payment_code,
              })
            : '';

          return {
            id: tx.id,
            orderCode: tx.payment_code,
            amountVnd: tx.amount_vnd,
            coinsReceived: tx.coins ?? (isCheckin ? 1 : isLucky ? 2 : isVip ? 30 : tx.amount_vnd >= 50000 ? 75 : tx.amount_vnd >= 20000 ? 25 : 15),
            packageType: isExVip ? 'EXCHANGE_VIP' : isCheckin ? 'CHECKIN' : isLucky ? 'LUCKY' : isVip ? 'VIP_39K' : tx.amount_vnd >= 50000 ? 'COIN_50K' : tx.amount_vnd >= 20000 ? 'COIN_20K' : 'COIN_10K',
            packageName,
            status,
            createdAt,
            expiresAt: new Date(createdTime + 10 * 60 * 1000).toISOString(),
            isExpired: status === 'expired',
            isSystemExpired,
            remainingSec,
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
        const isUserExpired = ageMs > 10 * 60 * 1000;
        const isSystemExpired = ageMs > 15 * 60 * 1000;
        const remainingSec = Math.max(0, Math.floor((10 * 60 * 1000 - ageMs) / 1000));

        let status = tx.status || 'pending';
        if (status === 'pending' && isUserExpired) {
          status = 'expired';
        } else if (status === 'processing' && isSystemExpired) {
          status = 'expired';
        }

        const isExVip = Boolean(tx.orderCode?.includes('EXCHANGE_VIP') || tx.orderCode?.includes('EX_VIP'));
        const isCheckin = Boolean(tx.orderCode?.includes('CHECKIN'));
        const isLucky = Boolean(tx.orderCode?.includes('LUCKY'));
        const isVip = tx.packageType === 'VIP_39K';
        const packageName = isExVip
          ? '👑 Đổi 40 Điểm ➔ 7 Ngày VIP'
          : isCheckin
          ? '🎁 Thưởng Điểm Danh Hàng Ngày'
          : isLucky
          ? '🎡 Thưởng Vòng Quay May Mắn'
          : isVip
          ? '👑 Gói Hội Viên VIP 30 Ngày (+30 Điểm)'
          : tx.amountVnd >= 50000
          ? '🍕 Gói 75 Điểm (50.000đ)'
          : tx.amountVnd >= 20000
          ? '🥤 Gói 25 Điểm (20.000đ)'
          : tx.amountVnd >= 10000
          ? '☕ Gói 15 Điểm (10.000đ)'
          : '🎁 Quà Tặng / Phần Thưởng';

        const qrUrl = ((status === 'pending' && !isUserExpired) || (status === 'processing' && !isSystemExpired))
          ? generateVietQrUrl({
              amount: tx.amountVnd,
              orderCode: tx.orderCode,
            })
          : '';

        return {
          id: tx.id,
          orderCode: tx.orderCode,
          amountVnd: tx.amountVnd,
          coinsReceived: tx.coinsReceived ?? (isCheckin ? 1 : isLucky ? 2 : isVip ? 30 : tx.amountVnd >= 50000 ? 75 : tx.amountVnd >= 20000 ? 25 : 15),
          packageType: isExVip ? 'EXCHANGE_VIP' : isCheckin ? 'CHECKIN' : isLucky ? 'LUCKY' : isVip ? 'VIP_39K' : tx.packageType || 'COIN_10K',
          packageName,
          status,
          createdAt,
          expiresAt: new Date(createdTime + 10 * 60 * 1000).toISOString(),
          isExpired: status === 'expired',
          isSystemExpired,
          remainingSec,
          qrUrl,
        };
      });
    }

    // Tìm đơn đang chờ thanh toán hoặc đang xử lý còn hiệu lực mới nhất (nếu có)
    const activePendingOrder = orders.find(o => (o.status === 'pending' || o.status === 'processing') && !o.isExpired) || null;

    return NextResponse.json({
      success: true,
      orders,
      activePendingOrder,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
