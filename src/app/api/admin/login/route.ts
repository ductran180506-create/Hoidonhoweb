import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword, generateAdminSessionToken } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || !checkAdminPassword(password)) {
      await new Promise(r => setTimeout(r, 600));
      return NextResponse.json(
        { success: false, message: 'Mật khẩu quản trị không chính xác' },
        { status: 401 }
      );
    }

    const sessionToken = generateAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      message: 'Đăng nhập trang quản trị thành công',
    });

    // Thiết lập Cookie phiên (Tương thích cả HTTP localhost và HTTPS sau này)
    const isHttps = req.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: 'admin_session',
      value: sessionToken,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
