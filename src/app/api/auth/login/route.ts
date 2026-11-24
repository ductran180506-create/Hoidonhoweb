import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { generateUserToken } from '@/lib/user-auth';
import { getUserBalanceAndVip } from '@/lib/vip-server';

export async function POST(req: NextRequest) {
  try {
    const { phone, pin, confirmPin, mode = 'login', guestUserId, pendingOrderCode } = await req.json();

    if (!phone || !pin) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' }, { status: 400 });
    }

    if (pin.length < 4) {
      return NextResponse.json({ success: false, message: 'Mật khẩu tối thiểu phải có 4 ký tự' }, { status: 400 });
    }

    if (mode === 'register' && confirmPin !== undefined && pin !== confirmPin) {
      return NextResponse.json({ success: false, message: 'Xác nhận mật khẩu không trùng khớp' }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    // Hàm phụ trợ tự động gộp đơn, số dư và lượt mở khoá từ phiên khách vãng lai (hoặc mã user- cũ)
    const mergeGuestData = async (targetUserId: string): Promise<number> => {
      let guestBalToMerge = 0;
      try {
        if (guestUserId && guestUserId !== targetUserId) {
          // Lấy số dư từ tài khoản guest/cũ nếu có
          const { data: guestRow } = await supabaseAdmin
            .from('users')
            .select('balance')
            .eq('id', guestUserId)
            .maybeSingle();

          if (guestRow && Number(guestRow.balance) > 0) {
            guestBalToMerge = Number(guestRow.balance);
            await supabaseAdmin
              .from('users')
              .update({ balance: 0 })
              .eq('id', guestUserId);
          }

          // Chuyển transactions
          await supabaseAdmin
            .from('transactions')
            .update({ user_id: targetUserId })
            .eq('user_id', guestUserId);

          // Chuyển unlocked chapters
          await supabaseAdmin
            .from('unlocked_chapters')
            .update({ user_id: targetUserId })
            .eq('user_id', guestUserId);
        }

        if (pendingOrderCode) {
          await supabaseAdmin
            .from('transactions')
            .update({ user_id: targetUserId })
            .eq('payment_code', pendingOrderCode);
        }
      } catch (err) {
        console.warn('Merge guest data warning:', err);
      }
      return guestBalToMerge;
    };

    // 1. Kiểm tra tài khoản trên Supabase và Local DB
    let sbUser: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();
      sbUser = data;
    } catch (e) {
      console.warn('Supabase find user warning:', e);
    }

    const localUser = db.getUserByPhone(cleanPhone);
    const userExists = Boolean(sbUser || localUser);

    // XỬ LÝ CHẾ ĐỘ ĐĂNG KÝ
    if (mode === 'register') {
      if (userExists) {
        return NextResponse.json({
          success: false,
          message: 'Tài khoản này đã được đăng ký trước đó. Vui lòng chuyển sang Đăng Nhập.',
        }, { status: 400 });
      }

      await mergeGuestData(cleanPhone);

      let initialBalance = 0;
      try {
        const { data: mergedTx } = await supabaseAdmin
          .from('transactions')
          .select('coins, status')
          .eq('user_id', cleanPhone)
          .eq('status', 'completed');
        if (mergedTx && mergedTx.length > 0) {
          initialBalance = mergedTx.reduce((sum, t) => sum + (Number(t.coins) || 0), 0);
        }
      } catch (err) {}

      // Tạo trên Supabase
      try {
        await supabaseAdmin.from('users').insert({
          id: cleanPhone,
          phone: cleanPhone,
          pin_code: pin,
          balance: initialBalance,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        });
      } catch (sbErr) {
        console.warn('Supabase insert user error:', sbErr);
      }

      // Tạo trên Local DB
      const user = db.createUser(cleanPhone, pin, cleanPhone);
      if (initialBalance > 0) {
        db.adjustCoins(user.id, initialBalance);
      }
      const isVip = db.isVip(user.id);
      const sessionToken = generateUserToken(cleanPhone);

      const displayName = user.phone.length >= 9 ? `${user.phone.slice(0, 3)}***${user.phone.slice(-3)}` : user.phone;

      const res = NextResponse.json({
        success: true,
        isNew: true,
        message: 'Đăng ký tài khoản thành công!',
        token: sessionToken,
        user: {
          id: cleanPhone,
          phone: user.phone,
          name: displayName,
          vipUntil: user.vipUntil,
          isVip,
        },
        wallet: {
          balance: initialBalance,
        },
      });

      res.cookies.set({
        name: 'user_session',
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });

      return res;
    }

    // XỬ LÝ CHẾ ĐỘ ĐĂNG NHẬP
    if (!userExists && cleanPhone !== 'admin' && cleanPhone !== 'quantri') {
      return NextResponse.json({
        success: false,
        message: 'Tài khoản chưa tồn tại. Vui lòng chuyển sang tab Đăng Ký để tạo tài khoản mới.',
      }, { status: 404 });
    }

    // Kiểm tra mật khẩu bảo mật
    if (sbUser && sbUser.pin_code && sbUser.pin_code !== pin) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ success: false, message: 'Mật khẩu không chính xác' }, { status: 401 });
    }
    if (localUser && localUser.pin !== pin) {
      return NextResponse.json({ success: false, message: 'Mật khẩu không chính xác' }, { status: 401 });
    }

    const guestMergedBal = await mergeGuestData(cleanPhone);

    let user = localUser;
    if (!user) {
      user = db.createUser(cleanPhone, pin, cleanPhone);
    }
    if (!sbUser) {
      try {
        await supabaseAdmin.from('users').insert({
          id: cleanPhone,
          phone: cleanPhone,
          pin_code: pin,
          balance: guestMergedBal,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        });
      } catch (e) {}
    } else if (guestMergedBal > 0) {
      try {
        const updatedBal = (Number(sbUser.balance) || 0) + guestMergedBal;
        await supabaseAdmin
          .from('users')
          .update({ balance: updatedBal, last_active: new Date().toISOString() })
          .eq('id', cleanPhone);
        sbUser.balance = updatedBal;
      } catch (e) {}
    }

    const { balance: resolvedBal, isVip, vipUntil } = await getUserBalanceAndVip(cleanPhone);
    const wallet = db.getWallet(cleanPhone);
    const balance = Math.max(wallet.balance, resolvedBal);
    if (balance !== wallet.balance) {
      db.adjustCoins(cleanPhone, balance - wallet.balance);
    }
    if (vipUntil) {
      db.setVip(cleanPhone, vipUntil);
    }

    const sessionToken = generateUserToken(cleanPhone);

    const displayName = user.phone.length >= 9 ? `${user.phone.slice(0, 3)}***${user.phone.slice(-3)}` : user.phone;

    const res = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: cleanPhone,
        phone: user.phone,
        name: displayName,
        vipUntil,
        isVip,
      },
      wallet: {
        balance,
      },
    });

    res.cookies.set({
      name: 'user_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
