import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOrderCode, generateVietQrUrl, DEFAULT_BANK_CONFIG } from '@/lib/sepay';
import { OrderPackage } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';

const PACKAGE_CONFIG: Record<OrderPackage, { amount: number; coins: number; vipDays: number; name: string }> = {
  COIN_10K: { amount: 10000, coins: 15, vipDays: 0, name: "Gói 15 Điểm (Ủng hộ 10k)" },
  COIN_20K: { amount: 20000, coins: 45, vipDays: 0, name: "Gói 45 Điểm (Ủng hộ 20k)" },
  COIN_50K: { amount: 50000, coins: 120, vipDays: 0, name: "Gói 120 Điểm (Ủng hộ 50k)" },
  VIP_39K: { amount: 39000, coins: 50, vipDays: 30, name: "Gói Hội Viên VIP 30 Ngày (+ Tặng 50 Điểm)" },
};

export async function POST(req: NextRequest) {
  try {
    const { userId, packageType } = await req.json();

    if (!userId || !packageType || !PACKAGE_CONFIG[packageType as OrderPackage]) {
      return NextResponse.json({ success: false, message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const pkg = PACKAGE_CONFIG[packageType as OrderPackage];
    const orderCode = generateOrderCode(packageType);
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const createdAt = now.toISOString();
    // Hiệu lực thực tế: 15 phút (900 giây)
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    // Hiển thị cho user: 10 phút (600 giây) để trừ hao lỗi mạng
    const displayExpiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    // 1. Lưu đơn hàng vào Local DB
    const order = db.createOrder({
      id: orderId,
      orderCode,
      userId,
      packageType: packageType as OrderPackage,
      amountVnd: pkg.amount,
      coinsReceived: pkg.coins,
      vipDaysReceived: pkg.vipDays,
      status: 'pending',
      createdAt,
    });

    // 2. Lưu giao dịch vào Supabase Transactions
    try {
      // Đảm bảo user_id tồn tại trong bảng users để tránh lỗi Foreign Key Constraint
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingUser) {
        await supabaseAdmin.from('users').insert({
          id: userId,
          phone: userId,
          balance: 0,
          created_at: new Date().toISOString()
        });
      }

      await supabaseAdmin.from('transactions').insert({
        id: orderId,
        user_id: userId,
        amount_vnd: pkg.amount,
        coins: pkg.coins,
        payment_code: orderCode,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    } catch (sbErr) {
      console.warn('Lỗi ghi Supabase transaction:', sbErr);
    }

    const qrUrl = generateVietQrUrl({
      amount: order.amountVnd,
      orderCode: order.orderCode,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderCode: order.orderCode,
        amountVnd: order.amountVnd,
        packageType: order.packageType,
        packageName: pkg.name,
        coinsReceived: order.coinsReceived,
        vipDaysReceived: order.vipDaysReceived,
        qrUrl,
        createdAt,
        expiresAt, // 15 phút thực tế
        displayExpiresAt, // 10 phút hiển thị
        durationSeconds: 10 * 60, // 600s
        actualDurationSeconds: 15 * 60, // 900s
        bankInfo: {
          bankId: DEFAULT_BANK_CONFIG.bankId,
          accountNo: DEFAULT_BANK_CONFIG.accountNo,
          accountName: DEFAULT_BANK_CONFIG.accountName,
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
