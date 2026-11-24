import { NextRequest, NextResponse } from 'next/server';
import { getChatStore, saveChatStore } from '@/lib/chat-store';
import { SupportConversation } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');
    const userName = searchParams.get('userName') || undefined;
    const userContact = searchParams.get('userContact') || undefined;

    const store = await getChatStore();
    let conv: SupportConversation | null = null;
    let needSave = false;

    if (conversationId) {
      conv = store.conversations.find(c => c.id === conversationId) || null;
    } else if (userId) {
      conv = store.conversations.find(c => c.userId === userId) || null;
      if (!conv) {
        conv = {
          id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          userName: userName || `Độc giả ${userId.slice(-4)}`,
          userContact: userContact || '',
          lastMessage: 'Cuộc trò chuyện đã được tạo',
          lastSender: 'admin',
          unreadAdmin: 0,
          unreadUser: 0,
          updatedAt: new Date().toISOString(),
        };
        store.conversations.unshift(conv);
        needSave = true;
      } else {
        if (userName && conv.userName !== userName) {
          conv.userName = userName;
          needSave = true;
        }
        if (userContact && conv.userContact !== userContact) {
          conv.userContact = userContact;
          needSave = true;
        }
      }
    }

    if (needSave) {
      await saveChatStore(store);
    }

    if (!conv) {
      return NextResponse.json({
        success: true,
        conversation: null,
        messages: [],
      });
    }

    const messages = store.messages
      .filter(m => m.conversationId === conv.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({
      success: true,
      conversation: conv,
      messages,
    });
  } catch (error: any) {
    console.error('Lỗi API chat/messages:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi đọc tin nhắn' },
      { status: 500 }
    );
  }
}
