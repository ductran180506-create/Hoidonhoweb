'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Story } from '@/lib/types';
import StoryCard from '@/components/StoryCard';
import ResumeReadingBanner from '@/components/ResumeReadingBanner';
import { trackPageView } from '@/lib/analytics';
import { Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function HomeContent() {
  const { setIsLuckyWheelOpen } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get('search') || '';
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('Tất cả');
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    fetchStories();
    trackPageView({ path: '/' });
  }, []);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      if (data.success) {
        setStories(data.stories);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const presetGenres = [
    'Tuổi Thơ - Đời Thường',
    'Chuyện Làng Quê - Hoài Niệm',
    'Học Đường - Tuổi Học Trò',
    'Gia Đình - Cha Mẹ',
    'Châm Biếm - Tấu Hài Đời Thực',
    'Kinh Dị - Giật Gân',
    'Tâm Linh - Bí Ẩn Dân Gian',
    'Đô Thị Kỳ Dị - Bóc Phốt',
    'Trinh Thám - Phá Án',
  ];
  const storyGenres = Array.from(new Set((stories || []).map(s => s.genre).filter(Boolean)));
  const genres = ['Tất cả', ...Array.from(new Set([...storyGenres, ...presetGenres])).slice(0, 10)];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = localSearch.replace('#', '').trim();
    if (clean) {
      router.push(`/?search=${clean}`);
    } else {
      router.push('/');
    }
  };

  const filteredStories = stories.filter((story) => {
    const matchesGenre = selectedGenre === 'Tất cả' || story.genre === selectedGenre;
    const cleanSearch = searchQuery.toLowerCase().replace('#', '').trim();
    const matchesSearch =
      !cleanSearch ||
      story.code.toLowerCase().includes(cleanSearch) ||
      story.title.toLowerCase().includes(cleanSearch) ||
      story.summary.toLowerCase().includes(cleanSearch);

    return matchesGenre && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Editorial Header - Thô mộc & Điềm đạm */}
      <div className="pt-2 pb-1 border-b border-slate-200 dark:border-[#1E1E26] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#71717A] font-medium tracking-wider uppercase mb-1">
              <span>Hồi Đó Nhỏ</span>
              <span>•</span>
              <a
                href="https://www.tiktok.com/@carrot.tia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-white transition"
              >
                @carrot.tia ↗
              </a>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tủ Truyện Tranh Slide
            </h1>
          </div>

          {/* Ô tìm kiếm mã truyện ghim từ TikTok */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#52525B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Nhập mã tập (vd: 01, 02)..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#111116] border border-slate-300 dark:border-[#22222B] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#52525B] focus:outline-none focus:border-indigo-500 dark:focus:border-[#7C5CFC] transition"
            />
          </form>
        </div>

        {/* Mã truyện nổi bật */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#71717A] pt-1">
          <span className="text-[11px]">Mã xem nhiều:</span>
          {stories.slice(0, 4).map((s) => (
            <button
              key={s.id}
              onClick={() => router.push(`/?search=${s.code}`)}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-mono text-slate-700 dark:bg-[#14141B] dark:hover:bg-[#1E1E28] dark:border-[#22222B] dark:text-[#D4D4D8] transition"
            >
              #{s.code}
            </button>
          ))}
        </div>
      </div>

      {/* Banner Vòng Quay May Mắn */}
      <div 
        onClick={() => setIsLuckyWheelOpen(true)}
        className="cursor-pointer relative p-3 sm:p-3.5 bg-gradient-to-r from-amber-50 via-purple-50/60 to-orange-50 border border-amber-300 hover:border-amber-400 dark:from-amber-950/40 dark:via-purple-950/40 dark:to-slate-900 dark:border-amber-500/30 dark:hover:border-amber-500/60 rounded-xl transition shadow-md group flex items-center justify-between gap-3 overflow-hidden select-none"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-lg sm:text-xl shadow-md shadow-orange-500/30 flex-shrink-0 group-hover:scale-105 transition">
            🎡
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight flex items-center gap-1">
                <span>VÒNG QUAY MAY MẮN</span>
                <span className="text-[10px]">✨</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-semibold font-mono">
                100% TRÚNG QUÀ
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-[#A1A1AA] truncate mt-0.5">
              Cơ hội rinh Gói VIP & Điểm thưởng mỗi ngày • Thử vận may ngay!
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-lg transition shadow-md active:scale-95 flex items-center gap-1 whitespace-nowrap"
        >
          <span>QUAY NGAY</span>
          <span>→</span>
        </button>
      </div>

      {/* Widget Đọc Tiếp Lịch Sử */}
      <ResumeReadingBanner />

      {/* Bộ Lọc Thể Loại */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGenre(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedGenre === g
                ? 'bg-indigo-600 text-white font-bold shadow-sm dark:bg-[#7C5CFC] dark:text-white'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-[#111116] dark:border-[#1E1E26] dark:text-[#71717A] dark:hover:text-white dark:hover:border-[#272733]'
            }`}
          >
            <span>{g}</span>
            {g === 'Tất cả' && (
              <span className={`ml-1.5 text-[10px] ${selectedGenre === g ? 'text-indigo-100 dark:text-[#E4E4E7]' : 'text-slate-500 dark:text-[#A1A1AA]'}`}>
                {stories.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Kết quả tìm kiếm */}
      {searchQuery && (
        <div className="flex items-center justify-between text-xs text-[#71717A] bg-[#111116] p-2.5 rounded-lg border border-[#1E1E26]">
          <span>
            Kết quả cho mã <strong className="text-white">#{searchQuery}</strong> ({filteredStories.length} bộ)
          </span>
          <button
            onClick={() => router.push('/')}
            className="text-[#A1A1AA] hover:text-white transition font-medium"
          >
            Xóa tìm kiếm
          </button>
        </div>
      )}

      {/* Lưới truyện tranh */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[9/16] bg-[#111116] border border-[#1E1E26] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredStories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredStories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[#52525B] text-xs bg-[#111116] border border-[#1E1E26] rounded-xl space-y-1">
          <div className="text-sm font-medium text-white">Chưa có truyện nào phù hợp</div>
          <p>Thử tìm bằng mã số khác hoặc chọn "Tất cả".</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-[#52525B] text-xs">Đang tải tủ truyện...</div>}>
      <HomeContent />
    </Suspense>
  );
}
