import { NextRequest, NextResponse } from 'next/server';
import { getChatStore } from '@/lib/chat-store';
import { isAuthorizedAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

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

    const store = await getChatStore();

    // Sắp xếp cuộc trò chuyện có tin nhắn mới nhất lên đầu
    const sorted = [...store.conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Lấy thêm số dư & VIP của từng độc giả
    const enriched = await Promise.all(
      sorted.map(async (c) => {
        let balance = db.getWallet(c.userId).balance || 0;
        let isVip = db.isVip(c.userId);

        try {
          const { data: sbUser } = await supabaseAdmin
            .from('users')
            .select('balance, vip_until')
            .eq('id', c.userId)
            .maybeSingle();

          if (sbUser) {
            balance = Math.max(balance, sbUser.balance || 0);
            if (sbUser.vip_until && new Date(sbUser.vip_until) > new Date()) {
              isVip = true;
            }
          }
        } catch (e) {}

        return {
          ...c,
          balance,
          isVip,
        };
      })
    );

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
