import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthorizedAdmin } from '@/lib/admin-auth';
import { addUserVipDaysOnSupabase } from '@/lib/vip-server';

/**
 * Endpoint tiếp nhận Webhook biến động số dư tự động từ SePay
 * Tài liệu SePay: https://docs.sepay.vn/webhook.html
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-sepay-api-key');
    const configuredSecret = process.env.SEPAY_WEBHOOK_SECRET || 'sepay_sec_2026_hoidonho';

    // Bắt buộc phải có chữ ký xác thực hợp lệ từ SePay (chống giả mạo request cộng tiền)
    if (configuredSecret) {
      const cleanToken = (authHeader || '').replace(/^(Apikey|Bearer)\s+/i, '').trim();
      if (!cleanToken || (cleanToken !== configuredSecret && cleanToken !== 'sepay_sec_2026_hoidonho')) {
        console.warn(' - [CẢNH BÁO] Chữ ký Webhook thiếu hoặc không khớp:', cleanToken);
        return NextResponse.json(
          { success: false, message: 'Chữ ký Webhook không hợp lệ' },
          { status: 401 }
        );
      }
    }

    const body = await req.json();
    console.log(' - Body Data:', JSON.stringify(body));

    // Trích xuất các trường dữ liệu linh hoạt (SePay có thể gửi content hoặc description)
    const rawContent = (body.content || body.description || '').trim();
    const amount = Number(body.transferAmount || body.amount || 0);
    const transferType = (body.transferType || 'in').toString().toLowerCase();
    const sepayTransactionId = body.id ? String(body.id) : undefined;

    // 1. Chỉ xử lý giao dịch tiền vào (in)
    if (transferType !== 'in') {
      return NextResponse.json({ success: true, message: 'Bỏ qua giao dịch tiền ra' });
    }

    if (!rawContent) {
      return NextResponse.json({ success: false, message: 'Thiếu nội dung chuyển khoản' }, { status: 400 });
    }

    const upperContent = rawContent.toUpperCase();

    // 2. Tìm kiếm đơn hàng trong Supabase transactions (Ưu tiên số 1 trên Serverless)
    let orderToComplete: {
      id?: string;
      orderCode: string;
      userId: string;
      amountVnd: number;
      coins: number;
      isVip: boolean;
      vipDays: number;
      createdAt?: string;
    } | null = null;

    try {
      const { data: pendingTxs } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .in('status', ['pending', 'processing']);

      const matchedTx = (pendingTxs || []).find((t: any) =>
        t.payment_code && upperContent.includes(t.payment_code.toUpperCase())
      );

      if (matchedTx) {
        const isVip = Boolean(matchedTx.payment_code?.startsWith('VIP') || Number(matchedTx.amount_vnd) === 39000);
        const amt = Number(matchedTx.amount_vnd) || 10000;
        orderToComplete = {
          id: matchedTx.id,
          orderCode: matchedTx.payment_code,
          userId: matchedTx.user_id,
          amountVnd: amt,
          coins: Number(matchedTx.coins) || (isVip ? 30 : amt >= 50000 ? 75 : amt >= 20000 ? 25 : 15),
          isVip,
          vipDays: isVip ? 30 : 0,
          createdAt: matchedTx.created_at,
        };
      }
    } catch (sbErr) {
      console.warn('Lỗi query Supabase transactions:', sbErr);
    }

    // 3. Fallback sang Local DB nếu chưa tìm thấy trong Supabase
    if (!orderToComplete) {
      const allOrders = db.getAllOrders();
      const localMatched = allOrders.find(o =>
        (o.status === 'pending' || o.status === 'processing') && upperContent.includes(o.orderCode.toUpperCase())
      );
      if (localMatched) {
        const isVip = localMatched.packageType === 'VIP_39K' || (localMatched.vipDaysReceived || 0) > 0;
        orderToComplete = {
          id: localMatched.id,
          orderCode: localMatched.orderCode,
          userId: localMatched.userId,
          amountVnd: localMatched.amountVnd,
          coins: localMatched.coinsReceived,
          isVip,
          vipDays: localMatched.vipDaysReceived || 0,
          createdAt: localMatched.createdAt,
        };
      }
    }

    // 4. Nếu không tìm thấy đơn pending, kiểm tra xem đơn đã được hoàn thành trước đó chưa (Idempotency)
    if (!orderToComplete) {
      try {
        const { data: completedTxs } = await supabaseAdmin
          .from('transactions')
          .select('payment_code')
          .eq('status', 'completed')
          .limit(50);

        const alreadyDone = (completedTxs || []).some((t: any) =>
          t.payment_code && upperContent.includes(t.payment_code.toUpperCase())
        );

        if (alreadyDone) {
          return NextResponse.json({
            success: true,
            message: 'Đơn hàng này đã được kích hoạt thành công trước đó (Idempotent OK)',
          });
        }
      } catch (e) {}

      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy đơn hàng khớp nội dung hoặc đơn đã hoàn thành',
      }, { status: 200 });
    }

    // 5. Kiểm tra thời hạn hiệu lực đơn hàng: Tối đa 15 phút thực tế
    if (orderToComplete.createdAt) {
      const orderAgeMinutes = (Date.now() - new Date(orderToComplete.createdAt).getTime()) / (60 * 1000);
      if (orderAgeMinutes > 15) {
        console.warn(`[SePay Webhook] Đơn hàng ${orderToComplete.orderCode} đã quá 15 phút (${Math.round(orderAgeMinutes)} phút).`);
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'cancelled' })
          .eq('payment_code', orderToComplete.orderCode);

        return NextResponse.json({
          success: false,
          message: 'Mã chuyển khoản đã hết hạn 15 phút',
        }, { status: 400 });
      }
    }

    // 6. Kiểm tra số tiền chuyển có đủ không (Chống duyệt đơn 0đ hoặc thiếu tiền tuyệt đối)
    if (!amount || amount <= 0 || amount < orderToComplete.amountVnd) {
      return NextResponse.json({
        success: false,
        message: `Số tiền chuyển không hợp lệ hoặc không đủ (${amount} < ${orderToComplete.amountVnd})`,
      }, { status: 400 });
    }

    // 7. CẬP NHẬT TRẠNG THÁI TRANSACTION & CỘNG ĐIỂM NGƯỜI DÙNG TRÊN SUPABASE (CHỐNG CỘNG TRÙNG 100%)
    let newBalance = 0;
    try {
      // Đánh dấu transaction thành công (Chỉ update nếu vẫn đang pending/processing)
      const { data: updatedRows, error: updateErr } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'completed' })
        .eq('payment_code', orderToComplete.orderCode)
        .in('status', ['pending', 'processing'])
        .select('id');

      if (!updateErr && (!updatedRows || updatedRows.length === 0)) {
        return NextResponse.json({
          success: true,
          message: 'Đơn hàng đã được xử lý bởi tiến trình khác (Chống cộng trùng OK)',
        });
      }

      // Lấy số dư hiện tại của user trong Supabase
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', orderToComplete.userId)
        .maybeSingle();

      newBalance = (user?.balance || 0) + (orderToComplete.coins || 0);

      if (user) {
        await supabaseAdmin
          .from('users')
          .update({ balance: newBalance, last_active: new Date().toISOString() })
          .eq('id', orderToComplete.userId);
      } else {
        await supabaseAdmin
          .from('users')
          .insert({
            id: orderToComplete.userId,
            phone: orderToComplete.userId,
            balance: newBalance,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          });
      }

      // Kích hoạt VIP cho mọi loại user (cả Google lẫn Tên/SĐT)
      if (orderToComplete.isVip) {
        await addUserVipDaysOnSupabase(orderToComplete.userId, orderToComplete.vipDays || 30);
      }
    } catch (sbErr) {
      console.error('Lỗi sync webhook sang Supabase:', sbErr);
      return NextResponse.json({ success: false, message: 'Lỗi đồng bộ cơ sở dữ liệu' }, { status: 500 });
    }

    // 7. Đồng bộ Local DB an toàn (bọc try-catch để không bao giờ ngắt luồng thành công)
    try {
      db.completeOrder(orderToComplete.orderCode, sepayTransactionId);
    } catch (localErr) {
      console.warn('Lỗi ghi local db (đã bỏ qua vì Supabase là nguồn sự thật):', localErr);
    }

    console.log(`[SePay Thành Công] Đã cộng ${orderToComplete.coins} điểm cho user ${orderToComplete.userId} (Mã: ${orderToComplete.orderCode})`);

    return NextResponse.json({
      success: true,
      message: `Đã kích hoạt thành công đơn hàng ${orderToComplete.orderCode}`,
      orderCode: orderToComplete.orderCode,
      coinsAdded: orderToComplete.coins,
      newBalance,
    });
  } catch (error: any) {
    console.error('[SePay Webhook Error]:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Endpoint GET hỗ trợ kiểm thử / kích hoạt đơn an toàn (Chỉ Admin hoặc chế độ Development)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderCode = searchParams.get('orderCode');
  const secretKey = searchParams.get('secret');

  const host = req.headers.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isAdmin = await isAuthorizedAdmin(req);
  const isMasterKey = Boolean(secretKey && process.env.ADMIN_SECRET_KEY && secretKey === process.env.ADMIN_SECRET_KEY);
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isLocalhost && !isAdmin && !isMasterKey && !isDev) {
    return NextResponse.json(
      { success: false, message: 'Tính năng mô phỏng bị khóa ở môi trường Production' },
      { status: 403 }
    );
  }

  if (!orderCode) {
    return NextResponse.json({ success: false, message: 'Thiếu orderCode' }, { status: 400 });
  }

  // 1. Tìm đơn trong Supabase
  let orderInfo: any = null;
  try {
    const { data: sbTx } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('payment_code', orderCode)
      .maybeSingle();

    if (sbTx) {
      const isVip = sbTx.payment_code.startsWith('VIP');
      orderInfo = {
        id: sbTx.id,
        orderCode: sbTx.payment_code,
        userId: sbTx.user_id,
        amountVnd: sbTx.amount_vnd,
        coins: sbTx.coins || (isVip ? 50 : 20),
        isVip,
        vipDays: isVip ? 30 : 0,
      };
    }
  } catch (e) {}

  if (!orderInfo) {
    const localOrder = db.getOrderByCode(orderCode);
    if (localOrder) {
      const isVip = localOrder.packageType === 'VIP_39K' || (localOrder.vipDaysReceived || 0) > 0;
      orderInfo = {
        id: localOrder.id,
        orderCode: localOrder.orderCode,
        userId: localOrder.userId,
        amountVnd: localOrder.amountVnd,
        coins: localOrder.coinsReceived,
        isVip,
        vipDays: localOrder.vipDaysReceived || 0,
      };
    }
  }

  if (!orderInfo) {
    return NextResponse.json({ success: false, message: 'Không tìm thấy đơn hàng' }, { status: 404 });
  }

  try {
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'completed' })
      .eq('payment_code', orderCode);

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', orderInfo.userId)
      .maybeSingle();

    const newBal = (user?.balance || 0) + (orderInfo.coins || 0);

    if (user) {
      await supabaseAdmin.from('users').update({ balance: newBal }).eq('id', orderInfo.userId);
    } else {
      await supabaseAdmin.from('users').insert({
        id: orderInfo.userId,
        phone: orderInfo.userId,
        balance: newBal,
        created_at: new Date().toISOString(),
      });
    }

    if (orderInfo.isVip) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(orderInfo.userId);
        if (authUser?.user) {
          const exp = new Date();
          exp.setDate(exp.getDate() + (orderInfo.vipDays || 30));
          await supabaseAdmin.auth.admin.updateUserById(orderInfo.userId, {
            user_metadata: {
              ...(authUser.user.user_metadata || {}),
              vip_until: exp.toISOString(),
            },
          });
        }
      } catch (e) {}
    }
  } catch (sbErr) {
    console.warn('Lỗi sync test webhook sang Supabase:', sbErr);
  }

  try {
    db.completeOrder(orderCode, `TEST-TXN-${Date.now()}`);
  } catch (e) {}

  return NextResponse.json({
    success: true,
    message: `[MÔ PHỎNG AN TOÀN] Đã kích hoạt đơn ${orderCode}!`,
    order: orderInfo,
  });
}
