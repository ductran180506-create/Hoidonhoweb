import crypto from 'crypto';
import { NextRequest } from 'next/server';

const USER_SECRET = process.env.ADMIN_SECRET_KEY || 'hdn_user_sec_2026_tiktok';

/**
 * Sinh User Session Token mã hóa chữ ký HMAC SHA-256
 * Ngăn chặn tuyệt đối việc kẻ gian mạo danh SĐT người khác để tiêu Xu
 */
export function generateUserToken(userId: string): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', USER_SECRET)
    .update(`${userId}:${timestamp}`)
    .digest('hex');
  return `${userId}.${timestamp}.${signature}`;
}

/**
 * Xác minh tính hợp lệ của User Token
 * Trả về userId nếu chữ ký đúng và chưa hết hạn, ngược lại trả về null
 */
export function verifyUserToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [userId, timestamp, signature] = parts;

    // Hạn dùng 30 ngày
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(tokenTime) || now - tokenTime > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', USER_SECRET)
      .update(`${userId}:${timestamp}`)
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return userId;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Trích xuất và xác thực danh tính người dùng từ Request
 */
export function getAuthenticatedUserId(req: NextRequest): string | null {
  const cookieToken = req.cookies.get('user_session')?.value;
  if (cookieToken) {
    const verified = verifyUserToken(cookieToken);
    if (verified) return verified;
  }

  const headerToken = req.headers.get('x-user-token');
  if (headerToken) {
    return verifyUserToken(headerToken);
  }

  return null;
}
