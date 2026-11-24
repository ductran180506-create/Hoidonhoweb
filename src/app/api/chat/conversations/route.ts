import { NextRequest, NextResponse } from 'next/server';
import { getChatStore, saveChatStore } from '@/lib/chat-store';
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

    // Chỉ hiển thị các cuộc trò chuyện THỰC SỰ có tin nhắn (loại bỏ cuộc trò chuyện rác/tự sinh)
    const validConversations = (store.conversations || []).filter(c => {
      const hasMessages = (store.messages || []).some(m => m.conversationId === c.id);
      return hasMessages || (c.lastMessage && c.lastMessage !== 'Cuộc trò chuyện đã được tạo');
    });

    // Sắp xếp cuộc trò chuyện có tin nhắn mới nhất lên đầu
    const sorted = [...validConversations].sort(
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

export async function DELETE(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu quyền Quản Trị Viên' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu conversationId' },
        { status: 400 }
      );
    }

    const store = await getChatStore();
    store.conversations = (store.conversations || []).filter(c => c.id !== conversationId);
    store.messages = (store.messages || []).filter(m => m.conversationId !== conversationId);

    await saveChatStore(store);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa cuộc trò chuyện thành công',
    });
  } catch (error: any) {
    console.error('Lỗi DELETE chat/conversations:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi xóa cuộc trò chuyện' },
      { status: 500 }
    );
  }
}
