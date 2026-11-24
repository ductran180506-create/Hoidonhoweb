import { NextRequest, NextResponse } from 'next/server';
import { getChatStore, saveChatStore } from '@/lib/chat-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { conversationId, reader } = await req.json();

    if (!conversationId || !reader) {
      return NextResponse.json(
        { success: false, message: 'Thiếu dữ liệu' },
        { status: 400 }
      );
    }

    const store = await getChatStore();
    const conv = store.conversations.find(c => c.id === conversationId);

    if (conv) {
      if (reader === 'admin') {
        conv.unreadAdmin = 0;
      } else {
        conv.unreadUser = 0;
      }
      await saveChatStore(store);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã đánh dấu đã đọc',
    });
  } catch (error: any) {
    console.error('Lỗi API chat/read:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi đánh dấu đã đọc' },
      { status: 500 }
    );
  }
}
