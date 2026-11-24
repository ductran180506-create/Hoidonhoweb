import { NextRequest, NextResponse } from 'next/server';
import { getChatStore, saveChatStore } from '@/lib/chat-store';
import { SupportMessage, SupportConversation } from '@/lib/types';
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

    const store = await getChatStore();
    let conv: SupportConversation | null = null;

    if (conversationId) {
      conv = store.conversations.find(c => c.id === conversationId) || null;
    }
    if (!conv && userId) {
      conv = store.conversations.find(c => c.userId === userId) || null;
      if (!conv) {
        conv = {
          id: conversationId || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          userName: userName || `Độc giả ${userId.slice(-4)}`,
          userContact: userContact || '',
          lastMessage: '',
          lastSender: sender,
          unreadAdmin: 0,
          unreadUser: 0,
          updatedAt: new Date().toISOString(),
        };
        store.conversations.unshift(conv);
      }
    }

    if (!conv) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy cuộc trò chuyện' },
        { status: 404 }
      );
    }

    const newMsg: SupportMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: conv.id,
      sender,
      content: content.trim(),
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString(),
    };

    store.messages.push(newMsg);

    // Cập nhật conversation
    conv.lastMessage = content.trim() || (imageUrl ? '[Đã gửi một hình ảnh]' : '');
    conv.lastSender = sender;
    conv.updatedAt = newMsg.createdAt;
    if (sender === 'user') {
      conv.unreadAdmin = (conv.unreadAdmin || 0) + 1;
    } else {
      conv.unreadUser = (conv.unreadUser || 0) + 1;
    }

    // Đẩy cuộc trò chuyện có tin nhắn mới lên đầu danh sách
    store.conversations = [
      conv,
      ...store.conversations.filter(c => c.id !== conv.id),
    ];

    // Lưu vĩnh viễn lên Supabase Storage
    await saveChatStore(store);

    // Ghi bản sao an toàn vào bảng Supabase feedback để không bao giờ mất dữ liệu
    try {
      await supabaseAdmin.from('feedback').insert({
        id: newMsg.id,
        type: sender === 'admin' ? 'chat_admin' : 'chat_user',
        content: newMsg.content || '[Hình ảnh]',
        contact: conv.userContact || conv.userId,
        image_url: newMsg.imageUrl || null,
        user_id: conv.userId,
        user_name: sender === 'admin' ? 'Tác Giả @carrot.tia' : conv.userName,
        status: sender === 'user' ? 'new' : 'reviewed',
        created_at: newMsg.createdAt,
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: newMsg,
      conversation: conv,
    });
  } catch (error: any) {
    console.error('Lỗi API chat/send:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi gửi tin nhắn' },
      { status: 500 }
    );
  }
}
