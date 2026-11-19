import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get('storyId');
  const chapterIndexStr = searchParams.get('chapterIndex');

  if (!storyId) {
    return NextResponse.json({ success: false, message: 'Thiếu storyId' }, { status: 400 });
  }

  const chapterIndex = chapterIndexStr !== null && chapterIndexStr !== undefined ? parseInt(chapterIndexStr) : undefined;

  // 1. Tìm trong Supabase comments
  try {
    let query = supabaseAdmin
      .from('comments')
      .select('*')
      .eq('story_id', storyId);

    if (chapterIndex !== undefined && !isNaN(chapterIndex)) {
      query = query.eq('chapter_index', chapterIndex);
    }

    const { data: sbComments, error: sbErr } = await query.order('created_at', { ascending: false });

    if (!sbErr && sbComments && sbComments.length > 0) {
      const formatted = sbComments.map((c: any) => ({
        id: c.id,
        storyId: c.story_id,
        chapterIndex: c.chapter_index,
        userId: c.user_id,
        userName: c.user_name,
        userAvatar: c.user_avatar,
        content: c.content,
        likes: c.likes || 0,
        likedBy: Array.isArray(c.liked_by) ? c.liked_by : [],
        createdAt: c.created_at,
      }));

      return NextResponse.json({
        success: true,
        comments: formatted,
        source: 'supabase',
      });
    }
  } catch (e) {
    console.warn('Lỗi đọc bình luận Supabase:', e);
  }

  // 2. Fallback sang Local DB
  const comments = db.getComments(storyId, isNaN(chapterIndex as any) ? undefined : chapterIndex);

  return NextResponse.json({
    success: true,
    comments,
    source: 'local',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'create', storyId, chapterIndex = 1, userId, userName, userAvatar, content, commentId } = body;

    if (action === 'like') {
      if (!commentId || !userId) {
        return NextResponse.json({ success: false, message: 'Thiếu thông tin thả tim' }, { status: 400 });
      }

      // Supabase like update
      try {
        const { data: existing } = await supabaseAdmin.from('comments').select('likes, liked_by').eq('id', commentId).maybeSingle();
        if (existing) {
          const likedBy: string[] = Array.isArray(existing.liked_by) ? existing.liked_by : [];
          const hasLiked = likedBy.includes(userId);
          const newLikedBy = hasLiked ? likedBy.filter(id => id !== userId) : [...likedBy, userId];
          const newLikes = Math.max(0, newLikedBy.length);

          await supabaseAdmin.from('comments').update({
            likes: newLikes,
            liked_by: newLikedBy,
          }).eq('id', commentId);

          return NextResponse.json({ success: true, likes: newLikes, hasLiked: !hasLiked });
        }
      } catch (e) {}

      const result = db.likeComment(commentId, userId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'delete') {
      const isAdmin = isAuthorizedAdmin(req);
      if (!isAdmin) {
        return NextResponse.json({ success: false, message: 'Không có quyền xóa' }, { status: 403 });
      }

      try {
        await supabaseAdmin.from('comments').delete().eq('id', commentId);
      } catch (e) {}

      const success = db.deleteComment(commentId);
      return NextResponse.json({ success });
    }

    // Tạo bình luận mới
    if (!storyId || !content || !content.trim()) {
      return NextResponse.json({ success: false, message: 'Nội dung bình luận không được để trống' }, { status: 400 });
    }

    if (content.trim().length > 500) {
      return NextResponse.json({ success: false, message: 'Bình luận tối đa 500 ký tự' }, { status: 400 });
    }

    const newCommentId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const commentRecord = {
      id: newCommentId,
      story_id: storyId,
      chapter_index: Number(chapterIndex) || 1,
      user_id: userId || `guest-${Date.now()}`,
      user_name: userName?.trim() || 'Độc giả ẩn danh',
      user_avatar: userAvatar || '',
      content: content.trim(),
      likes: 0,
      liked_by: [],
      created_at: new Date().toISOString(),
    };

    // Lưu Supabase
    try {
      await supabaseAdmin.from('comments').insert(commentRecord);
    } catch (sbErr) {
      console.warn('Lỗi lưu bình luận Supabase:', sbErr);
    }

    // Fallback local DB
    const newComment = db.addComment({
      storyId,
      chapterIndex: Number(chapterIndex) || 1,
      userId: userId || `guest-${Date.now()}`,
      userName: userName?.trim() || 'Độc giả ẩn danh',
      userAvatar: userAvatar || '',
      content: content.trim(),
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: commentRecord.id,
        storyId: commentRecord.story_id,
        chapterIndex: commentRecord.chapter_index,
        userId: commentRecord.user_id,
        userName: commentRecord.user_name,
        userAvatar: commentRecord.user_avatar,
        content: commentRecord.content,
        likes: commentRecord.likes,
        likedBy: commentRecord.liked_by,
        createdAt: commentRecord.created_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
