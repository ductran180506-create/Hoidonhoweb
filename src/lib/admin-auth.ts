import { NextRequest } from 'next/server';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hoidonho@2026';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'hdn_sec_token_99a8b7c6d5e4f3a2b1';

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

    // Token hết hạn sau 7 ngày
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(tokenTime) || now - tokenTime > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', ADMIN_SECRET)
      .update(`admin:${timestamp}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    return false;
  }
}

// Kiểm tra quyền Admin từ request (hỗ trợ cả Cookie HttpOnly và Header bí mật)
export function isAuthorizedAdmin(req: NextRequest): boolean {
  // 1. Kiểm tra header bí mật hoặc token gửi từ Client
  const headerToken = req.headers.get('x-admin-token') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (headerToken && (headerToken === ADMIN_SECRET || verifyAdminSessionToken(headerToken))) {
    return true;
  }

  // 2. Kiểm tra Cookie phiên HttpOnly bảo mật từ trình duyệt
  const sessionCookie = req.cookies.get('admin_session')?.value;
  if (sessionCookie && verifyAdminSessionToken(sessionCookie)) {
    return true;
  }

  return false;
}

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}
