import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let conversationId = '';
    let userId = '';
    let userName = '';
    let userContact = '';
    let sender: 'user' | 'admin' = 'user';
    let content = '';
    let imageUrl = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      conversationId = (formData.get('conversationId') as string) || '';
      userId = (formData.get('userId') as string) || '';
      userName = (formData.get('userName') as string) || '';
      userContact = (formData.get('userContact') as string) || '';
      sender = ((formData.get('sender') as string) || 'user') as 'user' | 'admin';
      content = (formData.get('content') as string) || '';

      const file = formData.get('image') as File | null;
      if (file && file.size > 0) {
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, message: 'Ảnh đính kèm tối đa 10MB' },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = path.extname(file.name) || '.png';
        const filename = `chat/msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}${ext}`;

        try {
          const { error: sbErr } = await supabaseAdmin.storage
            .from('comics')
            .upload(filename, buffer, {
              contentType: file.type || 'image/png',
              upsert: true,
            });

          if (!sbErr) {
            const { data: publicData } = supabaseAdmin.storage
              .from('comics')
              .getPublicUrl(filename);
            imageUrl = publicData.publicUrl;
          }
        } catch (e) {
          console.warn('Lỗi upload ảnh chat lên Supabase storage:', e);
        }

        if (!imageUrl) {
          imageUrl = `data:${file.type || 'image/png'};base64,${buffer.toString('base64')}`;
        }
      }
    } else {
      const body = await req.json();
      conversationId = body.conversationId || '';
      userId = body.userId || '';
      userName = body.userName || '';
      userContact = body.userContact || '';
      sender = body.sender || 'user';
      content = body.content || '';
      imageUrl = body.imageUrl || '';
    }

    if (!content.trim() && !imageUrl) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập nội dung tin nhắn' },
        { status: 400 }
      );
    }

    let conv = null;
    if (conversationId) {
      conv = db.getConversationById(conversationId);
    }
    if (!conv && userId) {
      conv = db.getOrCreateConversation(userId, userName, userContact);
    }

    if (!conv) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy cuộc trò chuyện' },
        { status: 404 }
      );
    }

    const newMsg = db.addSupportMessage(conv.id, sender, content.trim(), imageUrl);

    return NextResponse.json({
      success: true,
      message: newMsg,
      conversation: db.getConversationById(conv.id),
    });
  } catch (error: any) {
    console.error('Lỗi API chat/send:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi gửi tin nhắn' },
      { status: 500 }
    );
  }
}
