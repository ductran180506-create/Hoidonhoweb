'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Story, Chapter } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import ChapterTipBox from '@/components/ChapterTipBox';

export default function ReaderPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const chapterIndex = parseInt(params?.chapter as string, 10) || 1;
  const router = useRouter();

  const { user, balance, refreshBalance, setIsRechargeOpen, setIsAuthModalOpen } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [unlocking, setUnlocking] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(17);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    loadChapter();
  }, [slug, chapterIndex, user?.id, user?.isVip]);

  const loadChapter = async () => {
    setLoading(true);
    setIsLocked(false);
    setContent('');

    try {
      const sRes = await fetch('/api/stories');
      const sData = await sRes.json();
      const currentStory = sData.stories.find((s: Story) => s.slug === slug);
      if (!currentStory) {
        setLoading(false);
        return;
      }
      setStory(currentStory);

      const chRes = await fetch(`/api/chapter/list?storyId=${currentStory.id}`);
      const chData = await chRes.json();
      setAllChapters(chData.chapters);

      const targetChap = chData.chapters.find((c: Chapter) => c.chapterIndex === chapterIndex);
      if (!targetChap) {
        setLoading(false);
        return;
      }
      setChapter(targetChap);

      // Nếu là tập miễn phí (0 xu) HOẶC tài khoản VIP: Mở ngay lập tức 0ms không cần fetch unlock
      if (!targetChap.priceCoins || targetChap.priceCoins === 0 || user?.isVip) {
        setContent(targetChap.content || '');
        setIsLocked(false);
      } else {
        const unlockRes = await fetch('/api/chapter/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            chapterId: targetChap.id,
            storyId: currentStory.id,
            action: 'check',
          }),
        });

        const unlockData = await unlockRes.json();
        if (unlockData.unlocked || unlockData.isVip) {
          setContent(unlockData.content || targetChap.content || '');
          setIsLocked(false);
        } else {
          setIsLocked(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUnlockWithCoins = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!chapter || !story) return;

    if (balance < chapter.priceCoins && !user.isVip) {
      setIsRechargeOpen(true);
      return;
    }

    setUnlocking(true);
    try {
      const res = await fetch('/api/chapter/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          chapterId: chapter.id,
          storyId: story.id,
          action: 'unlock',
        }),
      });
      const data = await res.json();
      if (data.unlocked) {
        setContent(data.content || '');
        setIsLocked(false);
        await refreshBalance();
      }
    } catch (err) {
      console.error(err);
    }
    setUnlocking(false);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-[#6B7280] text-xs">
        Đang tải nội dung...
      </div>
    );
  }

  if (!story || !chapter) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="text-white text-sm">Không tìm thấy tập truyện</div>
        <Link href="/" className="inline-block px-3 py-1.5 bg-[#121826] border border-[#1F293D] text-xs text-[#9CA3AF] rounded-lg">
          Về Trang Chủ
        </Link>
      </div>
    );
  }

  const prevChapter = chapterIndex > 1 ? chapterIndex - 1 : null;
  const nextChapter = chapterIndex < story.chaptersCount ? chapterIndex + 1 : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16 protect-content">
      {/* Thanh điều khiển đọc trên cùng MangaVerse */}
      <div className="sticky top-14 z-30 bg-white/95 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#1F293D] -mx-4 px-4 py-2 flex items-center justify-between text-xs">
        <Link
          href={`/truyen/${story.slug}`}
          className="text-slate-600 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Mục lục</span>
        </Link>

        {/* Dropdown chọn tập */}
        <select
          value={chapterIndex}
          onChange={(e) => router.push(`/truyen/${story.slug}/${e.target.value}`)}
          className="bg-slate-100 dark:bg-[#121826] border border-slate-300 dark:border-[#1F293D] text-slate-900 dark:text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
        >
          {allChapters.map((c) => (
            <option key={c.chapterIndex} value={c.chapterIndex}>
              Tập {c.chapterIndex} {c.chapterIndex > 10 ? `(${c.priceCoins || 5} Điểm)` : '(Free)'}
            </option>
          ))}
        </select>

        {/* Cỡ chữ */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#121826] border border-slate-300 dark:border-[#1F293D] rounded-lg px-1.5 py-0.5 text-slate-700 dark:text-[#9CA3AF]">
          <button
            onClick={() => setFontSize(Math.max(14, fontSize - 1))}
            className="hover:text-slate-900 dark:hover:text-white px-1 font-bold"
          >
            A-
          </button>
          <span className="text-[10px] text-slate-500 dark:text-[#6B7280] font-bold">{fontSize}</span>
          <button
            onClick={() => setFontSize(Math.min(24, fontSize + 1))}
            className="hover:text-slate-900 dark:hover:text-white px-1 font-bold"
          >
            A+
          </button>
        </div>
      </div>

      {/* Tiêu đề truyện & tập */}
      <div className="text-center space-y-1 pt-1">
        <Link
          href={`/truyen/${story.slug}`}
          className="text-xs text-indigo-600 dark:text-[#8B5CF6] font-bold hover:underline"
        >
          {story.title}
        </Link>
        <h1 className="font-headline font-bold text-base sm:text-lg text-slate-900 dark:text-white">
          {chapter.title}
        </h1>
      </div>

      {/* Khu vực đọc hoặc Khung Khóa */}
      <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-[#1F293D] rounded-2xl p-5 sm:p-7 min-h-[350px] shadow-xs">
        {!isLocked ? (
          /* Nội dung đọc rõ ràng, sạch sẽ */
          <div
            className="space-y-4 text-slate-800 dark:text-[#E5E7EB] leading-relaxed select-none font-body"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
          >
            {content.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="indent-6">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          /* Khung khóa MangaVerse */
          <div className="space-y-5 text-center py-6">
            <div className="w-11 h-11 mx-auto rounded-xl bg-amber-100 dark:bg-[#8B5CF6]/10 text-amber-700 dark:text-[#8B5CF6] flex items-center justify-center border border-amber-300 dark:border-[#8B5CF6]/20">
              <Lock className="w-5 h-5" />
            </div>

            <div>
              <div className="text-xs text-amber-700 dark:text-[#F59E0B] font-bold mb-1">
                MỞ KHÓA TRỌN BỘ ({chapter.priceCoins || 5} ĐIỂM)
              </div>
              <h3 className="font-headline text-base font-bold text-slate-900 dark:text-white">
                Chỉ cần 5 Điểm để đọc toàn bộ các tập của bộ truyện này
              </h3>
            </div>

            <div className="max-w-xs mx-auto space-y-2 pt-2">
              {user ? (
                balance >= (chapter.priceCoins || 5) || user.isVip ? (
                  <button
                    onClick={handleUnlockWithCoins}
                    disabled={unlocking}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#8B5CF6] dark:hover:bg-[#7C3AED] text-white font-semibold rounded-lg text-xs shadow-sm transition"
                  >
                    {unlocking ? 'Đang mở...' : `Mở Khóa Full Bộ (${chapter.priceCoins || 5} Điểm) • Ví: ${balance} Điểm`}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsRechargeOpen(true)}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#8B5CF6] dark:hover:bg-[#7C3AED] text-white font-semibold rounded-lg text-xs shadow-sm transition"
                    >
                      ☕ Mời Cà Phê Tích Điểm (Ví hiện có: {balance} Điểm)
                    </button>
                    <button
                      onClick={() => setIsRechargeOpen(true)}
                      className="w-full py-2 px-4 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 dark:bg-[#F59E0B]/10 dark:hover:bg-[#F59E0B]/20 dark:border-[#F59E0B]/30 dark:text-[#F59E0B] rounded-lg text-xs font-semibold transition"
                    >
                      Gói Hội Viên VIP 39k (Đọc không giới hạn)
                    </button>
                  </div>
                )
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#8B5CF6] dark:hover:bg-[#7C3AED] text-white font-semibold rounded-lg text-xs shadow-sm transition"
                >
                  Đăng Nhập SĐT Để Mở Khóa
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Khối Tặng Cà Phê Tác Giả Cuối Tập */}
      {story && chapter && !isLocked && (
        <ChapterTipBox
          storyId={story.id}
          storyTitle={story.title}
          chapterIndex={chapterIndex}
          chapterTitle={chapter.title}
        />
      )}

      {/* Điều hướng tập trước / sau */}
      <div className="flex items-center justify-between gap-3 text-xs">
        {prevChapter ? (
          <Link
            href={`/truyen/${story.slug}/${prevChapter}`}
            className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-[#121826] dark:hover:bg-[#182234] dark:border-[#1F293D] dark:text-[#D1D5DB] rounded-lg flex items-center gap-1 transition shadow-xs font-semibold"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Tập {prevChapter}
          </Link>
        ) : (
          <div />
        )}

        <Link
          href={`/truyen/${story.slug}`}
          className="py-2 px-3 text-slate-500 hover:text-slate-900 dark:text-[#6B7280] dark:hover:text-white font-medium"
        >
          Mục lục
        </Link>

        {nextChapter ? (
          <Link
            href={`/truyen/${story.slug}/${nextChapter}`}
            className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#8B5CF6] dark:hover:bg-[#7C3AED] text-white font-semibold rounded-lg flex items-center gap-1 shadow-sm transition"
          >
            Tập {nextChapter} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link
            href="/"
            className="py-2 px-3 bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-[#121826] dark:text-[#6B7280] dark:hover:text-white rounded-lg border border-slate-300 dark:border-[#1F293D] font-medium"
          >
            Hết truyện
          </Link>
        )}
      </div>
    </div>
  );
}
