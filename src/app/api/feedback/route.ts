import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let type = 'content';
    let content = '';
    let contact = '';
    let userId = '';
    let userName = '';
    let imageUrl = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      type = (formData.get('type') as string) || 'content';
      content = (formData.get('content') as string) || '';
      contact = (formData.get('contact') as string) || '';
      userId = (formData.get('userId') as string) || '';
      userName = (formData.get('userName') as string) || '';

      const file = formData.get('image') as File | null;
      if (file && file.size > 0) {
        // Giới hạn ảnh tối đa 10MB
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { success: false, message: 'Ảnh đính kèm quá lớn (tối đa 10MB)' },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = path.extname(file.name) || '.png';
        const filename = `feedback/fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;

        // 1. Tải lên Supabase Storage
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
        } catch (e: any) {
          console.warn('Supabase feedback image upload warning:', e.message);
        }

        // 2. Fallback: Nếu Supabase Storage chưa xong, lưu dạng Data URL an toàn
        if (!imageUrl) {
          imageUrl = `data:${file.type || 'image/png'};base64,${buffer.toString('base64')}`;
        }
      }
    } else {
      const body = await req.json();
      type = body.type || 'content';
      content = body.content || '';
      contact = body.contact || '';
      userId = body.userId || '';
      userName = body.userName || '';
      imageUrl = body.imageUrl || '';
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập nội dung góp ý' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, message: 'Nội dung góp ý quá dài (tối đa 2.000 ký tự)' },
        { status: 400 }
      );
    }

    const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const validTypes = ['content', 'bug', 'payment', 'other'];
    const finalType = validTypes.includes(type) ? type : 'other';

    const feedbackRecord = {
      id: feedbackId,
      type: finalType,
      content: content.trim(),
      contact: contact ? String(contact).trim() : null,
      image_url: imageUrl || null,
      user_id: userId ? String(userId) : null,
      user_name: userName ? String(userName) : null,
      status: 'new',
      created_at: new Date().toISOString(),
    };

    // 1. Lưu vào Supabase public.feedback (Lưu vĩnh viễn trên đám mây)
    let savedToSupabase = false;
    try {
      const { error: sbErr } = await supabaseAdmin.from('feedback').insert(feedbackRecord);
      if (!sbErr) {
        savedToSupabase = true;
      } else {
        console.warn('Lỗi ghi Supabase feedback (bảng chưa tạo hoặc lỗi quyền):', sbErr);
      }
    } catch (e) {
      console.warn('Exception khi ghi feedback sang Supabase:', e);
    }

    // 2. Lưu vào local DB để fallback
    let localSaved: any = null;
    try {
      localSaved = db.addFeedback({
        type: finalType as any,
        content: content.trim(),
        contact: contact ? String(contact).trim() : undefined,
        imageUrl: imageUrl || undefined,
        userId: userId ? String(userId) : undefined,
        userName: userName ? String(userName) : undefined,
      });
    } catch (e) {
      console.warn('Lỗi ghi local feedback:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Cảm ơn bạn đã gửi góp ý! Tác giả sẽ đọc và ghi nhận ý kiến của bạn.',
      feedback: savedToSupabase ? {
        id: feedbackRecord.id,
        type: feedbackRecord.type,
        content: feedbackRecord.content,
        contact: feedbackRecord.contact,
        imageUrl: feedbackRecord.image_url,
        userId: feedbackRecord.user_id,
        userName: feedbackRecord.user_name,
        status: feedbackRecord.status,
        createdAt: feedbackRecord.created_at,
      } : localSaved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi gửi góp ý' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      { success: false, message: 'Yêu cầu quyền Quản trị viên' },
      { status: 401 }
    );
  }

  try {
    // 1. Ưu tiên đọc từ Supabase public.feedback
    try {
      const { data: sbList, error: sbErr } = await supabaseAdmin
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sbErr && sbList && sbList.length > 0) {
        const formatted = sbList.map((f: any) => ({
          id: f.id,
          type: f.type,
          content: f.content,
          contact: f.contact,
          imageUrl: f.image_url,
          userId: f.user_id,
          userName: f.user_name,
          status: f.status,
          createdAt: f.created_at,
        }));

        return NextResponse.json({
          success: true,
          feedback: formatted,
          source: 'supabase',
        });
      }
    } catch (e) {
      console.warn('Lỗi query feedback Supabase:', e);
    }

    // 2. Fallback sang Local DB
    const list = db.getAllFeedback();
    return NextResponse.json({
      success: true,
      feedback: list,
      source: 'local',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Lỗi tải góp ý' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      { success: false, message: 'Yêu cầu quyền Quản trị viên' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin' }, { status: 400 });
    }

    // 1. Cập nhật Supabase
    try {
      await supabaseAdmin.from('feedback').update({ status }).eq('id', id);
    } catch (e) {}

    // 2. Cập nhật Local
    const ok = db.updateFeedbackStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      { success: false, message: 'Yêu cầu quyền Quản trị viên' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, message: 'Thiếu id' }, { status: 400 });
    }

    // 1. Xóa trong Supabase
    try {
      await supabaseAdmin.from('feedback').delete().eq('id', id);
    } catch (e) {}

    // 2. Xóa trong Local
    const ok = db.deleteFeedback(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
