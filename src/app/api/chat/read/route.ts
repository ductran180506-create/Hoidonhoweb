import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    db.markConversationRead(conversationId, reader as 'admin' | 'user');

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
