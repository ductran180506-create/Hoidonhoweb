'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Story, Chapter } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { 
  ArrowLeft, Lock, Loader2, ChevronLeft, 
  ChevronRight, Coins, BookOpen 
} from 'lucide-react';
import ComicSlideViewer from '@/components/ComicSlideViewer';
import ShareButton from '@/components/ShareButton';
import CommentsSection from '@/components/CommentsSection';
import { saveReadingProgress } from '@/lib/reading-history';
import { trackPageView } from '@/lib/analytics';

function ContinuousReaderContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const initChapter = searchParams.get('chapter');

  const { user, balance, refreshBalance, setIsRechargeOpen, setIsAuthModalOpen } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(1);
  const [unlockedContents, setUnlockedContents] = useState<Record<string, { content?: string; images?: string[] }>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  useEffect(() => {
    if (initChapter) {
      const num = parseInt(initChapter);
      if (!isNaN(num) && num > 0) {
        setActiveChapterIndex(num);
      }
    }
  }, [initChapter]);

  useEffect(() => {
    if (slug) {
      // Nếu đã có dữ liệu truyện rồi thì chỉ cập nhật ngầm, không bật loading làm giật/tải lại trang
      loadStoryAndChapters(Boolean(story));
    }
  }, [slug, user?.id]);

  useEffect(() => {
    if (story && chapters.length > 0) {
      const curChap = chapters.find(c => c.chapterIndex === activeChapterIndex) || chapters[0];
      if (curChap) {
        saveReadingProgress({
          storyId: story.id,
          storySlug: story.slug,
          storyTitle: story.title,
          storyCover: story.coverImage,
          chapterIndex: activeChapterIndex,
          chapterTitle: curChap.title || `Tập ${activeChapterIndex}`,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [story, activeChapterIndex, chapters]);

  const loadStoryAndChapters = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    try {
      const sRes = await fetch('/api/stories');
      const sData = await sRes.json();
      
      const cleanSlug = (slug || '').replace('#', '').trim().toLowerCase();
      const storiesList: Story[] = Array.isArray(sData?.stories) ? sData.stories : [];
      const currentStory = storiesList.find(
        (s: Story) => s.slug === cleanSlug || (s.code && s.code.toLowerCase() === cleanSlug)
      );

      if (!currentStory) {
        setLoading(false);
        return;
      }
      setStory(currentStory);
      trackPageView({
        path: `/truyen/${currentStory.slug}`,
        storyId: currentStory.id,
        storyTitle: currentStory.title,
        userId: user?.id,
      });

      const chRes = await fetch(`/api/chapter/list?storyId=${currentStory.id}`);
      const chData = await chRes.json();
      const chapterList: Chapter[] = Array.isArray(chData?.chapters) ? chData.chapters : [];
      setChapters(chapterList);

      const contentsMap: Record<string, { content?: string; images?: string[] }> = {};

      // 1. Tập MIỄN PHÍ: Chỉ khi giá = 0 (Mở khóa ngay lập tức 0ms, không cần gọi API)
      const paidChapters: Chapter[] = [];
      for (const chap of chapterList) {
        if (!chap.priceCoins || chap.priceCoins === 0) {
          contentsMap[chap.id] = {
            content: chap.content || '',
            images: chap.images || [],
          };
        } else {
          paidChapters.push(chap);
        }
      }

      // 2. Tập tính phí: Kiểm tra xem độc giả đã mở khóa trọn bộ chưa
      if (paidChapters.length > 0 && user?.id) {
        try {
          const uRes = await fetch('/api/chapter/unlock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              chapterId: paidChapters[0].id,
              storyId: currentStory.id,
              action: 'check',
            }),
          });
          const uData = await uRes.json();
          if (uData.unlocked) {
            // Đã mở khóa full bộ -> mở khóa tất cả các tập
            chapterList.forEach((ch) => {
              contentsMap[ch.id] = {
                content: ch.content || '',
                images: ch.images || [],
              };
            });
          }
        } catch (e) {
          // ignore
        }
      }

      setUnlockedContents(contentsMap);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUnlockChapter = async (chap: Chapter) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!story) return;

    const unlockPrice = chap.priceCoins || 5;
    if (balance < unlockPrice && !user.isVip) {
      setIsRechargeOpen(true);
      return;
    }

    setUnlockingId(chap.id);
    try {
      const res = await fetch('/api/chapter/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          chapterId: chap.id,
          storyId: story.id,
          action: 'unlock',
        }),
      });
      const data = await res.json();
      if (data.unlocked) {
        // Mở khóa TOÀN BỘ các tập trong bộ truyện
        const allUnlocked: Record<string, { content?: string; images?: string[] }> = {};
        chapters.forEach((c) => {
          allUnlocked[c.id] = {
            content: c.content || '',
            images: c.images || [],
          };
        });
        setUnlockedContents(allUnlocked);
        await refreshBalance();
      }
    } catch (err) {
      console.error(err);
    }
    setUnlockingId(null);
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-2">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#71717A]" />
        <div className="text-[#71717A] text-xs">Đang tải truyện...</div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="text-white text-sm font-medium">Không tìm thấy truyện này</div>
        <Link href="/" className="inline-block px-3.5 py-1.5 bg-[#14141B] border border-[#22222B] text-xs text-[#A1A1AA] rounded-lg hover:text-white transition">
          Quay lại Tủ Truyện
        </Link>
      </div>
    );
  }

  const currentChapter = chapters.find(c => c.chapterIndex === activeChapterIndex) || chapters[0];
  const nextChapter = chapters.find(c => c.chapterIndex === activeChapterIndex + 1);
  const isCurrentUnlocked = currentChapter ? Boolean(unlockedContents[currentChapter.id]) : false;
  const isNextUnlocked = nextChapter ? Boolean(unlockedContents[nextChapter.id]) : false;
  const currentData = currentChapter ? unlockedContents[currentChapter.id] : null;

  return (
    <div className="max-w-2xl sm:max-w-3xl mx-auto space-y-3.5 sm:space-y-4 pb-20 protect-content animate-fadeIn w-full overflow-hidden">
      {/* Sticky Top Reader Bar */}
      <div className="sticky top-14 z-30 bg-[#0E0E12]/95 backdrop-blur-md border-b border-[#1E1E26] -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 flex items-center justify-between text-xs">
        <Link
          href="/"
          className="text-[#9E9EA8] hover:text-white flex items-center gap-1.5 transition active:scale-95 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-[#7C5CFC]" />
          <span className="text-[11px] sm:text-xs font-medium">Tủ Truyện</span>
        </Link>

        <div className="text-white font-medium truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs text-center flex items-center justify-center gap-1.5 px-2">
          <span className="text-[#F59E0B] font-mono font-bold text-[10px] bg-[#F59E0B]/10 border border-[#F59E0B]/25 px-1.5 py-0.2 rounded flex-shrink-0">
            #{story.code}
          </span>
          <span className="truncate text-xs font-semibold">{story.title}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] font-mono text-[#D4D4D8] bg-[#181822] border border-[#272738] px-2 py-0.5 rounded-full">
            Tập <strong className="text-[#F59E0B]">{activeChapterIndex}</strong>/{chapters.length}
          </span>
        </div>
      </div>

      {/* Thông tin truyện */}
      <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-3 sm:p-4 flex gap-3 sm:gap-3.5 items-center">
        <div className="w-12 h-16 sm:w-16 sm:h-20 flex-shrink-0 bg-[#0A0A0D] rounded-lg overflow-hidden border border-[#1E1E26] shadow-sm">
          <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#71717A]">
            <span className="bg-[#181824] border border-[#242436] text-[#A1A1AA] px-1.5 py-0.2 rounded font-medium">{story.genre}</span>
            <span>•</span>
            <span className="text-amber-400/90 font-medium">{chapters.length >= 5 ? 'Trọn bộ' : 'Đang cập nhật'}</span>
            <span>•</span>
            <span>{chapters.length} tập</span>
            <a
              href="https://www.tiktok.com/@carrot.tia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#71717A] hover:text-white transition ml-auto hidden xs:inline"
            >
              @carrot.tia ↗
            </a>
          </div>

          <h1 className="font-semibold text-sm sm:text-base text-white leading-snug truncate">
            {story.title}
          </h1>

          <p className="text-xs text-[#71717A] line-clamp-1 leading-relaxed">
            {story.summary}
          </p>
        </div>
      </div>

      {/* Thanh chọn Tập truyện lướt ngang */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs px-1 text-[#71717A]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Danh sách tập</span>
            <span className="px-2 py-0.2 rounded-full bg-[#1C1C26] text-[#A1A1AA] text-[10px] font-mono border border-[#272733]">
              {chapters.length} tập
            </span>
          </div>
          <span className="text-[11px] text-[#A1A1AA]">
            Đang xem: <strong className="text-[#F59E0B] font-mono font-bold">Tập {activeChapterIndex}</strong>/{chapters.length}
          </span>
        </div>

        {/* Danh sách các nút tập truyện lướt ngang - mượt mà, không thanh cuộn thô trên mobile */}
        <div
          id="chapter-buttons-slider"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth select-none"
        >
          {chapters.map((chap) => {
            const isUnlocked = Boolean(unlockedContents[chap.id]);
            const isActive = chap.chapterIndex === activeChapterIndex;
            return (
              <button
                key={chap.id}
                onClick={() => setActiveChapterIndex(chap.chapterIndex)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 flex-shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-[#7C5CFC]/20 text-white shadow-sm border border-[#7C5CFC] ring-1 ring-[#7C5CFC]/50'
                    : 'bg-[#121218] border border-[#20202C] text-[#8E8EA0] hover:text-white hover:border-[#303042]'
                }`}
              >
                <span>{chap.title}</span>
                {(!chap.priceCoins || chap.priceCoins === 0) ? (
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/40">
                    Free
                  </span>
                ) : !isUnlocked ? (
                  <span className="text-[10px] text-[#F59E0B] font-medium flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <span>{chap.priceCoins} Điểm</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* KHUNG SLIDE TRÀN VIỀN TẬP ĐANG CHỌN */}
      {currentChapter && (
        <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-1.5 sm:p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1E1E26] pb-2 px-1 text-xs">
            <span className="font-semibold text-white">
              {currentChapter.title}
            </span>

            {(!currentChapter.priceCoins || currentChapter.priceCoins === 0) ? (
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                Đọc Miễn Phí
              </span>
            ) : !isCurrentUnlocked ? (
              <span className="text-[10px] text-[#F59E0B] flex items-center gap-1 font-medium bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                <Lock className="w-3 h-3 text-[#F59E0B]" /> Cần {currentChapter.priceCoins || 5} Điểm (Mở Full Bộ)
              </span>
            ) : null}
          </div>

          {/* Nội dung Slide hoặc Khung Mở Khóa */}
          {isCurrentUnlocked ? (
            <div className="space-y-3">
              {currentData?.images && currentData.images.length > 0 ? (
                <ComicSlideViewer
                  images={currentData.images}
                  title={currentChapter.title}
                  chapterIndex={currentChapter.chapterIndex}
                  totalChapters={chapters.length}
                  hasNextChapter={activeChapterIndex < chapters.length}
                  nextChapterPrice={nextChapter?.priceCoins || 0}
                  isNextChapterUnlocked={isNextUnlocked}
                  onNextChapter={() => {
                    if (activeChapterIndex < chapters.length) {
                      setActiveChapterIndex(activeChapterIndex + 1);
                    }
                  }}
                />
              ) : (
                <div className="p-4 bg-[#0A0A0D] rounded-lg border border-[#1E1E26] text-[#D4D4D8] text-xs leading-relaxed">
                  {currentData?.content}
                </div>
              )}

              {/* Điều hướng tập Trước / Sau */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1E1E26] px-1 text-xs">
                <button
                  onClick={() => setActiveChapterIndex(prev => Math.max(1, prev - 1))}
                  disabled={activeChapterIndex <= 1}
                  className="px-3 py-1.5 bg-[#14141B] hover:bg-[#1C1C24] border border-[#22222B] rounded-lg text-xs font-medium text-[#A1A1AA] disabled:opacity-20 transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Tập trước</span>
                </button>

                <span className="text-[11px] text-[#71717A]">
                  Tập {activeChapterIndex} / {chapters.length}
                </span>

                {activeChapterIndex < chapters.length ? (
                  <button
                    onClick={() => setActiveChapterIndex(prev => Math.min(chapters.length, prev + 1))}
                    className="px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                  >
                    <span>Tập kế tiếp</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="px-3 py-1.5 bg-[#14141B] hover:bg-[#1C1C24] border border-[#22222B] text-white rounded-lg text-xs font-medium transition"
                  >
                    Về Tủ Truyện
                  </Link>
                )}
              </div>
            </div>
          ) : (
            /* KHUNG MỞ KHÓA TẬP CHUẨN ĐẸP TỐI ƯU MOBILE */
            <div className="text-center py-7 px-4 sm:p-7 space-y-4 bg-gradient-to-b from-[#161622] via-[#0E0E14] to-[#0A0A0D] border border-amber-500/25 rounded-xl shadow-xl">
              <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Lock className="w-5 h-5 text-amber-400" />
              </div>

              <div className="space-y-1">
                <div className="text-base sm:text-lg font-bold text-white">
                  Mở Khóa Đọc Trọn Bộ ({currentChapter.priceCoins || 5} Điểm)
                </div>
                <p className="text-xs text-[#A1A1AA] max-w-sm mx-auto leading-relaxed">
                  ✨ Chỉ cần mở khóa một lần duy nhất để đọc trọn vẹn tất cả <strong className="text-amber-400">{chapters.length} tập</strong> của bộ truyện này!
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-2 pt-1">
                {user ? (
                  balance >= (currentChapter.priceCoins || 5) || user.isVip ? (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => handleUnlockChapter(currentChapter)}
                        disabled={unlockingId === currentChapter.id}
                        className="w-full py-2.5 px-4 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white font-semibold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-lg shadow-[#7C5CFC]/30 active:scale-95"
                      >
                        {unlockingId === currentChapter.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>🔓 Mở Khóa Đọc Full Bộ ({currentChapter.priceCoins || 5} Điểm)</span>
                        )}
                      </button>
                      <div className="text-[11px] text-[#71717A]">
                        Ví hiện có: <strong className="text-amber-300">{balance} Điểm</strong> (Dư sau mở: {balance - (currentChapter.priceCoins || 5)} Điểm)
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => setIsRechargeOpen(true)}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95"
                      >
                        <Coins className="w-4 h-4" />
                        <span>☕ Nạp {Math.max(0, (currentChapter.priceCoins || 5) - balance)} Điểm Còn Thiếu (Ví có {balance})</span>
                      </button>
                      <div className="text-[11px] text-[#71717A]">
                        Mở cổng QR Momo & Sacombank tự động cộng điểm sau 3 giây
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full py-2.5 px-4 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white font-semibold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-[#7C5CFC]/25 active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🔑 Đăng Nhập Để Mở Khóa Full Bộ</span>
                    </button>
                    <button
                      onClick={() => setIsRechargeOpen(true)}
                      className="w-full py-2 px-3 bg-[#181824] hover:bg-[#202030] text-[#A1A1AA] hover:text-white rounded-lg text-xs transition border border-[#2B2B3D] flex items-center justify-center gap-1"
                    >
                      <span>☕ Mời Cà Phê Ủng Hộ Kênh</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Khối Chia Sẻ & Bàn Luận Cuối Tập */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#111116] border border-[#1E1E26] rounded-xl text-xs">
        <div>
          <div className="text-white font-semibold flex items-center gap-1.5">
            <span>Thấy truyện hay?</span>
          </div>
          <p className="text-[11px] text-[#71717A] mt-0.5">
            Chia sẻ để bạn bè cùng vào theo dõi và bàn luận về cái kết nhé!
          </p>
        </div>
        <ShareButton title={story.title} storyTitle={story.title} />
      </div>

      {/* Khối Bình Luận & Bàn Tán */}
      <CommentsSection storyId={story.id} chapterIndex={activeChapterIndex} />
    </div>
  );
}

export default function ContinuousReaderPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center space-y-2">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#71717A]" />
          <div className="text-[#71717A] text-xs">Đang tải truyện...</div>
        </div>
      }
    >
      <ContinuousReaderContent />
    </Suspense>
  );
}
