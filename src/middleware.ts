import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// BẬT / TẮT CHẾ ĐỘ BẢO TRÌ (true = đang bảo trì khóa web, false = mở lại bình thường)
const IS_MAINTENANCE_MODE = false;
const ADMIN_MAINTENANCE_KEY = process.env.ADMIN_PASSWORD || 'hoidonho@2026';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Nếu đang bật chế độ bảo trì
  if (IS_MAINTENANCE_MODE) {
    // Luôn mở cho localhost để bạn test nội bộ thoải mái không bị chặn
    const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
    if (isLocalhost) {
      return NextResponse.next();
    }

    // 1. Kiểm tra chìa khóa Admin bí mật:
    // Hỗ trợ cả '?key=hoidonho@2026', cookie admin_session, hoặc header x-admin-token
    const hasAdminKey = request.nextUrl.searchParams.get('key') === ADMIN_MAINTENANCE_KEY;
    const hasAdminCookie = Boolean(request.cookies.get('admin_session')?.value);
    const hasAdminTokenHeader = Boolean(request.headers.get('x-admin-token'));
    const isMasterAdmin = hasAdminKey || hasAdminCookie || hasAdminTokenHeader;

    // 2. Các tài nguyên hệ thống bắt buộc chạy nền (để Webhook ngân hàng không bị gián đoạn và tải CSS/icon)
    const isSystemResource =
      pathname.startsWith('/api/webhook') ||
      pathname.startsWith('/_next') ||
      pathname === '/maintenance' ||
      pathname.includes('/robots.txt') ||
      pathname.includes('/sitemap.xml') ||
      pathname.includes('.'); // static files (.png, .webp, .ico, etc.)

    if (isSystemResource) {
      return NextResponse.next();
    }

    // 3. Cho phép Admin truy cập bảng điều khiển và các API quản trị (Feedback, Stories, Comments, Analytics)
    const isAdminRoute =
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/api/feedback') ||
      pathname.startsWith('/api/comments');

    if (isAdminRoute && isMasterAdmin) {
      return NextResponse.next();
    }

    // 4. KHÓA CHẶT 100%: Mọi người lạ vào /admin, trang chủ, đọc truyện...
    // Đều bị chặn hoàn toàn và chuyển sang màn hình bảo trì (kèm header đánh dấu bảo trì)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-is-maintenance', '1');

    const url = request.nextUrl.clone();
    url.pathname = '/maintenance';
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
