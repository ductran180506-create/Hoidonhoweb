import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { generateUserToken } from '@/lib/user-auth';

export async function POST(req: NextRequest) {
  try {
    const { phone, pin, confirmPin, mode = 'login' } = await req.json();

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

      // Tạo trên Supabase
      try {
        await supabaseAdmin.from('users').insert({
          id: cleanPhone,
          phone: cleanPhone,
          pin_code: pin,
          balance: 0,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        });
      } catch (sbErr) {
        console.warn('Supabase insert user error:', sbErr);
      }

      // Tạo trên Local DB
      const user = db.createUser(cleanPhone, pin);
      const isVip = db.isVip(user.id);
      const sessionToken = generateUserToken(user.id);

      const displayName = user.phone.length >= 9 ? `${user.phone.slice(0, 3)}***${user.phone.slice(-3)}` : user.phone;

      const res = NextResponse.json({
        success: true,
        isNew: true,
        message: 'Đăng ký tài khoản thành công!',
        token: sessionToken,
        user: {
          id: user.id,
          phone: user.phone,
          name: displayName,
          vipUntil: user.vipUntil,
          isVip,
        },
        wallet: {
          balance: 0,
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

    let user = localUser;
    if (!user) {
      user = db.createUser(cleanPhone, pin);
    }
    if (!sbUser) {
      try {
        await supabaseAdmin.from('users').insert({
          id: cleanPhone,
          phone: cleanPhone,
          pin_code: pin,
          balance: 0,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        });
      } catch (e) {}
    }

    const wallet = db.getWallet(user.id);
    const sbBalance = sbUser?.balance || 0;
    const balance = Math.max(wallet.balance, sbBalance);
    if (balance !== wallet.balance) {
      db.adjustCoins(user.id, balance - wallet.balance);
    }

    const isVip = db.isVip(user.id);
    const sessionToken = generateUserToken(user.id);

    const displayName = user.phone.length >= 9 ? `${user.phone.slice(0, 3)}***${user.phone.slice(-3)}` : user.phone;

    const res = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: displayName,
        vipUntil: user.vipUntil,
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
