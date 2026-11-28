import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Tạo secret ngẫu nhiên lúc khởi động nếu không có biến môi trường (chống hardcode lộ secret)
const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CarrotHDN@2026!Admin';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || RUNTIME_FALLBACK_SECRET;

// Thời hạn phiên đăng nhập tối đa (12 giờ)
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

// Tạo token phiên đăng nhập mã hóa băm HMAC SHA-256
export function generateAdminSessionToken(): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(`admin:${timestamp}`)
    .digest('hex');
  return `${timestamp}.${signature}`;
}

// Kiểm tra tính hợp lệ của token phiên
export function verifyAdminSessionToken(token: string): boolean {
  try {
    const [timestamp, signature] = token.split('.');
    if (!timestamp || !signature) return false;

    // Token bảo mật hết hạn sau 12 giờ
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(tokenTime) || now - tokenTime > SESSION_TTL_MS || tokenTime > now + 60000) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', ADMIN_SECRET)
      .update(`admin:${timestamp}`)
      .digest('hex');

    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expectedSignature, 'hex');
    if (a.length !== b.length) return false;

    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

// Kiểm tra quyền Admin từ request (hỗ trợ cả Cookie HttpOnly và Header bí mật)
export function isAuthorizedAdmin(req: NextRequest): boolean {
  // 1. Kiểm tra Cookie phiên HttpOnly bảo mật từ trình duyệt (Ưu tiên số 1)
  const sessionCookie = req.cookies.get('admin_session')?.value;
  if (sessionCookie && verifyAdminSessionToken(sessionCookie)) {
    return true;
  }

  // 2. Kiểm tra header bí mật hoặc token gửi từ Client
  const headerToken = req.headers.get('x-admin-token') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (headerToken) {
    if (verifyAdminSessionToken(headerToken)) {
      return true;
    }
    // So sánh thời gian an toàn nếu dùng master key từ server-to-server
    if (process.env.ADMIN_SECRET_KEY && headerToken.length === process.env.ADMIN_SECRET_KEY.length) {
      try {
        if (crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(process.env.ADMIN_SECRET_KEY))) {
          return true;
        }
      } catch {}
    }
  }

  return false;
}

export function checkAdminPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(ADMIN_PASSWORD);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
