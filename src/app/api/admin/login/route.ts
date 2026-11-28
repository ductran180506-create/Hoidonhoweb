import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword, generateAdminSessionToken } from '@/lib/admin-auth';

// Chống dò mật khẩu (Anti-Brute Force Protection)
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // Khóa 30 phút

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'default-client';

    const now = Date.now();
    const clientState = failedAttempts.get(ip);

    // Kiểm tra xem IP có đang bị tạm khóa không
    if (clientState && clientState.lockedUntil > now) {
      const minutesLeft = Math.ceil((clientState.lockedUntil - now) / 60000);
      return NextResponse.json(
        { 
          success: false, 
          message: `🔒 CẢNH BÁO BẢO MẬT: Nhập sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần! IP của bạn đã bị tạm khóa trong ${minutesLeft} phút.` 
        },
        { status: 429 }
      );
    }

    const { password } = await req.json();

    if (!password || !checkAdminPassword(password)) {
      const currentCount = (clientState && clientState.lockedUntil <= now ? 0 : (clientState?.count || 0)) + 1;
      const isLocked = currentCount >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = isLocked ? now + LOCKOUT_DURATION_MS : 0;

      failedAttempts.set(ip, { count: currentCount, lockedUntil });

      // Cố tình làm trễ 1200ms để chống hacker dùng botnet/tool dò quét tự động
      await new Promise(r => setTimeout(r, 1200));

      const attemptsRemaining = Math.max(0, MAX_FAILED_ATTEMPTS - currentCount);
      return NextResponse.json(
        { 
          success: false, 
          message: isLocked 
            ? `🔒 CẢNH BÁO: Nhập sai ${MAX_FAILED_ATTEMPTS} lần liên tiếp! Hệ thống đã khóa quyền đăng nhập từ IP này trong 30 phút.` 
            : `Mật khẩu quản trị không chính xác (Còn ${attemptsRemaining} lần thử)` 
        },
        { status: 401 }
      );
    }

    // Đăng nhập thành công -> Xóa bộ đếm sai
    failedAttempts.delete(ip);

    const sessionToken = generateAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      message: 'Đăng nhập trang quản trị thành công',
    });

    // Thiết lập Cookie phiên bảo mật 12 giờ
    const isHttps = req.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: 'admin_session',
      value: sessionToken,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
