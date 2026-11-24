import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    let conv = null;

    if (conversationId) {
      conv = db.getConversationById(conversationId);
    } else if (userId) {
      conv = db.getOrCreateConversation(userId, userName, userContact);
    }

    if (!conv) {
      return NextResponse.json({
        success: true,
        conversation: null,
        messages: [],
      });
    }

    const messages = db.getMessagesByConversationId(conv.id);

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
