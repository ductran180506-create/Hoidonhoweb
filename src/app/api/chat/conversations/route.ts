import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền Quản Trị Viên' },
        { status: 401 }
      );
    }

    const conversations = db.getAllConversations();

    // Lấy thêm thông tin số dư và VIP của từng user nếu có
    const enriched = conversations.map(c => {
      const wallet = db.getWallet(c.userId);
      const isVip = db.isVip(c.userId);
      return {
        ...c,
        balance: wallet.balance || 0,
        isVip,
      };
    });

    return NextResponse.json({
      success: true,
      conversations: enriched,
    });
  } catch (error: any) {
    console.error('Lỗi API chat/conversations:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi đọc danh sách cuộc trò chuyện' },
      { status: 500 }
    );
  }
}
