'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Story, Chapter } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

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
  }, [slug, chapterIndex, user]);

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

      // Nếu là tập miễn phí (0 xu): Mở ngay lập tức 0ms không cần fetch unlock
      if (!targetChap.priceCoins || targetChap.priceCoins === 0) {
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
        if (unlockData.unlocked && (unlockData.content || (unlockData.images && unlockData.images.length > 0))) {
          setContent(unlockData.content || '');
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
      <div className="sticky top-14 z-30 bg-[#0B0F19]/90 backdrop-blur-md border-b border-[#1F293D] -mx-4 px-4 py-2 flex items-center justify-between text-xs">
        <Link
          href={`/truyen/${story.slug}`}
          className="text-[#9CA3AF] hover:text-white flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Mục lục</span>
        </Link>

        {/* Dropdown chọn tập */}
        <select
          value={chapterIndex}
          onChange={(e) => router.push(`/truyen/${story.slug}/${e.target.value}`)}
          className="bg-[#121826] border border-[#1F293D] text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#8B5CF6]"
        >
          {allChapters.map((c) => (
            <option key={c.chapterIndex} value={c.chapterIndex}>
              Tập {c.chapterIndex} {c.chapterIndex > 10 ? `(${c.priceCoins || 5} Điểm)` : '(Free)'}
            </option>
          ))}
        </select>

        {/* Cỡ chữ */}
        <div className="flex items-center gap-1 bg-[#121826] border border-[#1F293D] rounded-lg px-1.5 py-0.5 text-[#9CA3AF]">
          <button
            onClick={() => setFontSize(Math.max(14, fontSize - 1))}
            className="hover:text-white px-1 font-bold"
          >
            A-
          </button>
          <span className="text-[10px] text-[#6B7280]">{fontSize}</span>
          <button
            onClick={() => setFontSize(Math.min(24, fontSize + 1))}
            className="hover:text-white px-1 font-bold"
          >
            A+
          </button>
        </div>
      </div>

      {/* Tiêu đề truyện & tập */}
      <div className="text-center space-y-1 pt-1">
        <Link
          href={`/truyen/${story.slug}`}
          className="text-xs text-[#8B5CF6] font-semibold hover:underline"
        >
          {story.title}
        </Link>
        <h1 className="font-headline font-bold text-base sm:text-lg text-white">
          {chapter.title}
        </h1>
      </div>

      {/* Khu vực đọc hoặc Khung Khóa */}
      <div className="bg-[#121826] border border-[#1F293D] rounded-2xl p-5 sm:p-7 min-h-[350px]">
        {!isLocked ? (
          /* Nội dung đọc rõ ràng, sạch sẽ */
          <div
            className="space-y-4 text-[#E5E7EB] leading-relaxed select-none font-body"
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
            <div className="w-11 h-11 mx-auto rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center border border-[#8B5CF6]/20">
              <Lock className="w-5 h-5" />
            </div>

            <div>
              <div className="text-xs text-[#F59E0B] font-bold mb-1">
                MỞ KHÓA TRỌN BỘ ({chapter.priceCoins || 5} ĐIỂM)
              </div>
              <h3 className="font-headline text-base font-bold text-white">
                Chỉ cần 5 Điểm để đọc toàn bộ các tập của bộ truyện này
              </h3>
            </div>

            <div className="max-w-xs mx-auto space-y-2 pt-2">
              {user ? (
                balance >= (chapter.priceCoins || 5) || user.isVip ? (
                  <button
                    onClick={handleUnlockWithCoins}
                    disabled={unlocking}
                    className="w-full py-2.5 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-lg text-xs shadow-sm shadow-[#8B5CF6]/30 transition"
                  >
                    {unlocking ? 'Đang mở...' : `Mở Khóa Full Bộ (${chapter.priceCoins || 5} Điểm) • Ví: ${balance} Điểm`}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsRechargeOpen(true)}
                      className="w-full py-2.5 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-lg text-xs shadow-sm shadow-[#8B5CF6]/30 transition"
                    >
                      ☕ Mời Cà Phê Tích Điểm (Ví hiện có: {balance} Điểm)
                    </button>
                    <button
                      onClick={() => setIsRechargeOpen(true)}
                      className="w-full py-2 px-4 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B] rounded-lg text-xs font-semibold transition"
                    >
                      Gói Hội Viên VIP 39k (Đọc không giới hạn)
                    </button>
                  </div>
                )
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-lg text-xs shadow-sm shadow-[#8B5CF6]/30 transition"
                >
                  Đăng Nhập SĐT Để Mở Khóa
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Điều hướng tập trước / sau */}
      <div className="flex items-center justify-between gap-3 text-xs">
        {prevChapter ? (
          <Link
            href={`/truyen/${story.slug}/${prevChapter}`}
            className="py-2 px-3 bg-[#121826] hover:bg-[#182234] border border-[#1F293D] text-[#D1D5DB] rounded-lg flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Tập {prevChapter}
          </Link>
        ) : (
          <div />
        )}

        <Link
          href={`/truyen/${story.slug}`}
          className="py-2 px-3 text-[#6B7280] hover:text-white"
        >
          Mục lục
        </Link>

        {nextChapter ? (
          <Link
            href={`/truyen/${story.slug}/${nextChapter}`}
            className="py-2 px-3.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-lg flex items-center gap-1 shadow-sm transition"
          >
            Tập {nextChapter} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link
            href="/"
            className="py-2 px-3 bg-[#121826] text-[#6B7280] hover:text-white rounded-lg border border-[#1F293D]"
          >
            Hết truyện
          </Link>
        )}
      </div>
    </div>
  );
}
