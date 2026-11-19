'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MessageSquare, Heart, Send, Loader2, Trash2, Smile } from 'lucide-react';
import { Comment } from '@/lib/types';

interface CommentsSectionProps {
  storyId: string;
  chapterIndex: number;
}

export default function CommentsSection({ storyId, chapterIndex }: CommentsSectionProps) {
  const { user, setIsAuthModalOpen } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchComments();
  }, [storyId, chapterIndex]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?storyId=${storyId}&chapterIndex=${chapterIndex}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.comments)) {
        setComments(data.comments);
        // Khởi tạo map liked
        if (user) {
          const lMap: Record<string, boolean> = {};
          data.comments.forEach((c: Comment) => {
            if (c.likedBy && c.likedBy.includes(user.id)) {
              lMap[c.id] = true;
            }
          });
          setLikedMap(lMap);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          chapterIndex,
          userId: user.id,
          userName: user.name || user.phone || 'Độc giả',
          userAvatar: user.avatar || '',
          content: content.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments(prev => [data.comment, ...prev]);
        setContent('');
      }
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const currentLiked = Boolean(likedMap[commentId]);
    setLikedMap(prev => ({ ...prev, [commentId]: !currentLiked }));
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            likes: Math.max(0, (c.likes || 0) + (currentLiked ? -1 : 1)),
          };
        }
        return c;
      })
    );

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'like',
          commentId,
          userId: user.id,
        }),
      });
    } catch (e) {
      // rollback if failed
    }
  };

  const formatTime = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'Vừa xong';
      if (m < 60) return `${m} phút trước`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} giờ trước`;
      const d = Math.floor(h / 24);
      return `${d} ngày trước`;
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#1E1E26] pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#7C5CFC]" />
          <h3 className="text-sm font-semibold text-white">
            Bình Luận Tập {chapterIndex} ({comments.length})
          </h3>
        </div>
        <span className="text-[11px] text-[#71717A]">Bàn luận văn minh</span>
      </div>

      {/* Form nhập bình luận */}
      <form onSubmit={handleSendComment} className="space-y-2">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              user
                ? `Viết cảm nghĩ của bạn về Tập ${chapterIndex}...`
                : 'Đăng nhập để tham gia bàn tán...'
            }
            onClick={() => {
              if (!user) setIsAuthModalOpen(true);
            }}
            rows={2}
            className="w-full bg-[#0A0A0D] border border-[#22222B] focus:border-[#7C5CFC] rounded-lg p-2.5 text-xs text-white placeholder-[#52525B] focus:outline-none resize-none transition"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[10px] text-[#71717A]">
            {user ? (
              <span className="text-emerald-400">● {user.name || user.phone}</span>
            ) : (
              <span>Chưa đăng nhập</span>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-3.5 py-1.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] disabled:opacity-40 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Gửi</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Danh sách bình luận */}
      {loading ? (
        <div className="py-6 text-center text-[#71717A] text-xs">
          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
          Đang tải bình luận...
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-[#52525B] text-xs space-y-1">
          <Smile className="w-6 h-6 mx-auto text-[#3F3F46]" />
          <div>Chưa có bình luận nào cho tập này.</div>
          <div className="text-[11px] text-[#71717A]">Hãy là người đầu tiên chia sẻ cảm nghĩ nhé!</div>
        </div>
      ) : (
        <div className="space-y-3 pt-1 divide-y divide-[#181822]">
          {comments.map((cmt) => {
            const isLiked = Boolean(likedMap[cmt.id]);

            return (
              <div key={cmt.id} className="pt-3 first:pt-0 flex items-start gap-2.5 group">
                {cmt.userAvatar ? (
                  <img
                    src={cmt.userAvatar}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-[#272733]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1E1E28] text-[#A1A1AA] flex items-center justify-center text-[10px] font-bold flex-shrink-0 border border-[#272733]">
                    {(cmt.userName || 'U')[0].toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {cmt.userName}
                    </span>
                    <span className="text-[10px] text-[#52525B] flex-shrink-0">
                      {formatTime(cmt.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-[#D4D4D8] mt-1 leading-relaxed break-words">
                    {cmt.content}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      onClick={() => handleLike(cmt.id)}
                      className={`text-[11px] flex items-center gap-1 transition ${
                        isLiked ? 'text-red-400 font-semibold' : 'text-[#71717A] hover:text-white'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-400 text-red-400' : ''}`} />
                      <span>{cmt.likes || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
