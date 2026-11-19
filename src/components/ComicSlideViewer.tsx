'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Maximize2, 
  X, Sparkles, ArrowRight, CheckCircle2,
  Columns, Rows, Smartphone, Monitor, Loader2
} from 'lucide-react';

function SlideImage({
  src,
  alt,
  className = '',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!loaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-[#08080C] rounded-lg">
          <Loader2 className="w-7 h-7 animate-spin text-[#7C5CFC]" />
          <span className="text-[11px] text-[#71717A] font-medium">Đang tải ảnh...</span>
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-2.5 bg-[#0B0B10] rounded-xl border border-[#222230]">
          <span className="text-xs text-[#A1A1AA]">Không tải được trang này</span>
          <button
            type="button"
            onClick={() => {
              setError(false);
              setLoaded(false);
            }}
            className="px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-xs font-medium rounded-lg transition shadow-md shadow-[#7C5CFC]/20"
          >
            Bấm để tải lại
          </button>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`${className} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}
    </div>
  );
}

interface ComicSlideViewerProps {
  images: string[];
  title: string;
  chapterIndex: number;
  totalChapters?: number;
  onNextChapter?: () => void;
  hasNextChapter?: boolean;
  nextChapterPrice?: number;
  isNextChapterUnlocked?: boolean;
}

export default function ComicSlideViewer({
  images,
  title,
  chapterIndex,
  totalChapters = 5,
  onNextChapter,
  hasNextChapter = false,
  nextChapterPrice = 0,
  isNextChapterUnlocked = false,
}: ComicSlideViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDiff, setTouchDiff] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [viewMode, setViewMode] = useState<'slide' | 'scroll'>('slide');

  // Reset về slide 0 khi đổi tập
  useEffect(() => {
    setCurrentIndex(0);
  }, [chapterIndex]);

  // TỐI ƯU HIỆU NĂNG: Tải trước (Preload) toàn bộ ảnh của tập vào bộ nhớ đệm ngay khi mở tập
  useEffect(() => {
    if (images && images.length > 0) {
      images.forEach((url) => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    }
  }, [images]);

  const prevSlide = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const nextSlide = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (hasNextChapter && onNextChapter) {
      onNextChapter();
    }
  };

  // Chạm vào giữa màn hình để ẩn/hiện thanh điều khiển
  const toggleControls = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowControls((prev) => !prev);
  };

  // Vuốt chạm ngang thời gian thực chuẩn TikTok Photo Mode
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
    setTouchDiff(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStart;

    // Giảm biên độ nếu vuốt quá biên (resistance physics)
    if ((currentIndex === 0 && diff > 0) || (currentIndex === images.length - 1 && diff < 0)) {
      setTouchDiff(diff * 0.35);
    } else {
      setTouchDiff(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchStart === null) return;
    const swipeThreshold = 40; // Ngưỡng vuốt 40px
    if (touchDiff < -swipeThreshold) {
      if (currentIndex < images.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (hasNextChapter && onNextChapter) {
        onNextChapter();
      }
    } else if (touchDiff > swipeThreshold) {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
    setTouchStart(null);
    setTouchDiff(0);
    setIsSwiping(false);
  };

  // Điều khiển bằng bàn phím (Mũi tên, Phím cách, Esc, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') {
        if (e.key === ' ') e.preventDefault();
        if (currentIndex < images.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else if (hasNextChapter && onNextChapter) {
          onNextChapter();
        }
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, hasNextChapter, onNextChapter, isFullscreen]);

  // Khóa cuộn trang khi toàn màn hình
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  if (!images || images.length === 0) return null;

  const isLastSlide = currentIndex === images.length - 1;
  const isLargeSet = images.length > 20;

  return (
    <div className="space-y-2.5">
      {/* THANH CHỌN CHẾ ĐỘ ĐỌC: LƯỚT SLIDE HOẶC CUỘN DỌC */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="inline-flex items-center bg-[#14141B] p-0.5 rounded-lg border border-[#22222E]">
          <button
            type="button"
            onClick={() => setViewMode('slide')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              viewMode === 'slide'
                ? 'bg-[#7C5CFC] text-white shadow-sm'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Lướt Slide</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('scroll')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              viewMode === 'scroll'
                ? 'bg-[#7C5CFC] text-white shadow-sm'
                : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Rows className="w-3 h-3" />
            <span>Cuộn Dọc</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#71717A] hidden sm:inline">
            100% Ảnh Đầy Đủ (Không Cắt)
          </span>
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#14141B] hover:bg-[#1E1E28] border border-[#22222E] rounded-lg text-[11px] text-[#D4D4D8] hover:text-white transition active:scale-95"
            title="Xem tràn toàn màn hình (Phím F)"
          >
            <Maximize2 className="w-3 h-3 text-[#F59E0B]" />
            <span className="font-medium">Toàn Màn Hình</span>
          </button>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: LƯỚT SLIDE (CAROUSEL PHONG CÁCH TIKTOK) */}
      {viewMode === 'slide' && (
        <div
          className="relative w-full max-w-xl sm:max-w-2xl mx-auto bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl select-none group border border-[#1F293D] touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* THANH TIẾN ĐỘ THÔNG MINH CHO NHIỀU ẢNH */}
          <div className={`absolute top-2.5 inset-x-3 z-30 transition-opacity duration-300 pointer-events-none ${
            showControls ? 'opacity-100' : 'opacity-25'
          }`}>
            {isLargeSet ? (
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] transition-all duration-200"
                  style={{ width: `${((currentIndex + 1) / images.length) * 100}%` }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {images.map((_, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden backdrop-blur-sm"
                  >
                    <div
                      className={`h-full transition-all duration-300 ${
                        pIdx === currentIndex
                          ? 'w-full bg-[#8B5CF6] shadow-sm shadow-[#8B5CF6]'
                          : pIdx < currentIndex
                          ? 'w-full bg-white/70'
                          : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HUY HIỆU ĐẾM TRANG & NÚT TOÀN MÀN HÌNH */}
          <div className={`absolute top-6 inset-x-3 z-30 flex items-center justify-between transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 bg-black/75 hover:bg-black/95 backdrop-blur-md text-white rounded-full border border-white/15 shadow-lg transition active:scale-95"
              title="Xem tràn toàn màn hình (Phím F)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            <div className="px-3 py-1 bg-black/80 backdrop-blur-md text-white text-[11px] font-bold rounded-full border border-white/15 shadow-lg flex items-center gap-1">
              <span className="text-[#F59E0B] font-extrabold">{currentIndex + 1}</span>
              <span className="text-gray-400">/</span>
              <span>{images.length}</span>
            </div>
          </div>

          {/* RAY TRƯỢT GPU TRANSFORM: 100% OBJECT-CONTAIN, KHÔNG CẮT BẤT KỲ GÓC CẠNH NÀO */}
          <div
            className="flex w-full will-change-transform"
            style={{
              transform:
                isSwiping && touchDiff !== 0
                  ? `translateX(calc(-${currentIndex * 100}% + ${touchDiff}px))`
                  : `translateX(-${currentIndex * 100}%)`,
              transition: isSwiping ? 'none' : 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            {images.map((imgUrl, idx) => {
              return (
                <div
                  key={idx}
                  className="w-full flex-shrink-0 bg-[#070709] flex items-center justify-center min-h-[52dvh] h-[68dvh] sm:h-[80vh] md:h-[84vh] p-1 sm:p-2 select-none"
                >
                  <SlideImage
                    src={imgUrl}
                    alt={`${title} - Trang ${idx + 1}`}
                    className="max-w-full max-h-full w-auto h-auto object-contain mx-auto block select-none pointer-events-none drop-shadow-2xl"
                    priority={idx === currentIndex}
                  />
                </div>
              );
            })}
          </div>

          {/* VÙNG CHẠM NHANH 3 VÙNG: TRÁI (LÙI) - GIỮA (ẨN/HIỆN NÚT) - PHẢI (TIẾP) */}
          <div
            onClick={prevSlide}
            className="absolute left-0 inset-y-12 w-1/4 z-10 cursor-pointer active:bg-white/5 transition"
            aria-label="Trang trước"
            title="Chạm mép trái để lùi"
          />
          <div
            onClick={toggleControls}
            className="absolute left-1/4 inset-y-12 w-2/4 z-10 cursor-pointer"
            aria-label="Ẩn/Hiện thanh điều khiển"
          />
          <div
            onClick={nextSlide}
            className="absolute right-0 inset-y-12 w-1/4 z-10 cursor-pointer active:bg-white/5 transition"
            aria-label="Trang tiếp theo"
            title="Chạm mép phải để sang trang"
          />

          {/* NÚT MŨI TÊN TRÁI (ẨN TRÊN MOBILE, HIỆN TRÊN DESKTOP HOẶC KHI RÊ CHUỘT) */}
          {currentIndex > 0 && showControls && (
            <button
              onClick={prevSlide}
              aria-label="Trang trước"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/75 hover:bg-black/95 backdrop-blur-md text-white border border-white/20 items-center justify-center transition shadow-xl active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* NÚT MŨI TÊN PHẢI (ẨN TRÊN MOBILE, HIỆN TRÊN DESKTOP HOẶC KHI RÊ CHUỘT) */}
          {currentIndex < images.length - 1 && showControls && (
            <button
              onClick={nextSlide}
              aria-label="Trang tiếp theo"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/75 hover:bg-black/95 backdrop-blur-md text-white border border-white/20 items-center justify-center transition shadow-xl active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* BANNER GỢI Ý KHI ĐẾN TRANG CUỐI */}
          {isLastSlide && (
            <div className="absolute bottom-3 inset-x-3 z-30 animate-fadeIn">
              {hasNextChapter ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNextChapter?.();
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-xl text-xs font-bold shadow-xl shadow-[#8B5CF6]/40 flex items-center justify-between transition-all active:scale-98"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>Đã đọc hết {images.length} trang Tập {chapterIndex}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] bg-black/30 px-2 py-0.5 rounded-lg">
                    <span>Sang Tập {chapterIndex + 1}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ) : (
                <div className="w-full py-2 px-3 bg-black/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã xem trọn vẹn toàn bộ {images.length} trang!</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG CẦM TAY DÀNH RIÊNG CHO MOBILE (THUMB-FRIENDLY BOTTOM DOCK) */}
      {viewMode === 'slide' && (
        <div className="sm:hidden flex items-center justify-between gap-2 p-1.5 bg-[#111116] border border-[#1E1E26] rounded-xl text-xs select-none shadow-lg">
          <button
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="flex-1 py-2.5 px-2 bg-[#181824] hover:bg-[#20202E] disabled:opacity-30 border border-[#272738] rounded-lg text-white font-medium flex items-center justify-center gap-1 transition active:scale-95"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4 text-[#A78BFA]" />
            <span className="text-[11px]">Trang trước</span>
          </button>

          <div className="px-3 py-1.5 bg-[#0A0A0D] border border-[#22222E] rounded-lg text-center font-mono font-bold text-xs text-white flex-shrink-0">
            <span className="text-[#F59E0B]">{currentIndex + 1}</span>
            <span className="text-gray-500 mx-1">/</span>
            <span>{images.length}</span>
          </div>

          <button
            onClick={nextSlide}
            className="flex-1 py-2.5 px-2 bg-[#7C5CFC] hover:bg-[#6D4CF0] border border-[#8B5CF6]/40 rounded-lg text-white font-medium flex items-center justify-center gap-1 transition shadow-md shadow-[#7C5CFC]/20 active:scale-95"
            aria-label="Trang tiếp"
          >
            <span className="text-[11px]">{isLastSlide && hasNextChapter ? `Tập ${chapterIndex + 1}` : 'Trang tiếp'}</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* CHẾ ĐỘ 2: CUỘN DỌC LIÊN TỤC (WEBTOON / MANHWA CONTINUOUS SCROLL) */}
      {viewMode === 'scroll' && (
        <div className="w-full max-w-xl sm:max-w-2xl mx-auto space-y-2 bg-[#0A0A0D] rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border border-[#1F293D] shadow-2xl">
          {images.map((imgUrl, idx) => (
            <div 
              key={idx} 
              className="relative w-full bg-black rounded-lg overflow-hidden flex items-center justify-center border border-[#1E1E26]/60 shadow-lg"
            >
              <img
                src={imgUrl}
                alt={`${title} - Trang ${idx + 1}`}
                className="w-full max-w-full h-auto object-contain mx-auto block select-none pointer-events-none"
                loading={idx < 3 ? 'eager' : 'lazy'}
                onContextMenu={(e) => e.preventDefault()}
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md text-[10px] text-gray-300 font-mono rounded border border-white/10 shadow">
                Trang {idx + 1}/{images.length}
              </div>
            </div>
          ))}

          {/* Cuối danh sách trang trong chế độ cuộn dọc */}
          <div className="pt-2 pb-1">
            {hasNextChapter ? (
              <button
                onClick={() => onNextChapter?.()}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6D28D9] text-white rounded-xl text-xs font-bold shadow-xl shadow-[#8B5CF6]/30 flex items-center justify-center gap-2 transition active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Hoàn thành {images.length} trang • Sang Tập {chapterIndex + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-full py-2.5 px-3 bg-black/70 border border-emerald-500/30 text-emerald-400 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Bạn đã xem trọn vẹn toàn bộ {images.length} trang của tập này!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ TOÀN MÀN HÌNH TRÀN VIỀN (FULLSCREEN IMMERSIVE THEATER) */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center select-none animate-fadeIn h-[100dvh] w-screen overflow-hidden touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar trong Fullscreen */}
          <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/95 to-transparent">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span className="text-[#8B5CF6] bg-[#8B5CF6]/20 px-2 py-0.5 rounded">Tập {chapterIndex}</span>
              <span className="text-gray-500">•</span>
              <span className="truncate max-w-[180px] sm:max-w-md">{title}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="px-3 py-1 bg-black/80 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/20 shadow">
                <span className="text-[#F59E0B] font-extrabold">{currentIndex + 1}</span>
                <span className="text-gray-400">/</span>
                <span>{images.length}</span>
              </div>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                title="Đóng toàn màn hình (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Slider Container */}
          <div className="relative w-full h-full flex items-center overflow-hidden">
            <div
              className="flex w-full h-full will-change-transform items-center"
              style={{
                transform:
                  isSwiping && touchDiff !== 0
                    ? `translateX(calc(-${currentIndex * 100}% + ${touchDiff}px))`
                    : `translateX(-${currentIndex * 100}%)`,
                transition: isSwiping ? 'none' : 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {images.map((imgUrl, idx) => {
                return (
                  <div
                    key={idx}
                    className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 sm:p-4"
                  >
                    <SlideImage
                      src={imgUrl}
                      alt={`${title} - Fullscreen Trang ${idx + 1}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain select-none pointer-events-none drop-shadow-2xl"
                      priority={idx === currentIndex}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vùng bấm chuyển Fullscreen */}
          <div
            onClick={prevSlide}
            className="absolute left-0 inset-y-16 w-1/4 z-20 cursor-pointer"
          />
          <div
            onClick={nextSlide}
            className="absolute right-0 inset-y-16 w-1/4 z-20 cursor-pointer"
          />

          {currentIndex > 0 && (
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-black/95 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition shadow-2xl active:scale-90"
              aria-label="Trang trước"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {currentIndex < images.length - 1 ? (
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/70 hover:bg-black/95 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition shadow-2xl active:scale-90"
              aria-label="Trang tiếp theo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            hasNextChapter && (
              <button
                onClick={() => {
                  setIsFullscreen(false);
                  onNextChapter?.();
                }}
                className="absolute bottom-6 z-30 px-5 py-2.5 bg-[#8B5CF6] hover:from-[#7C3AED] text-white rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 active:scale-95"
              >
                <span>Sang Tập {chapterIndex + 1} Tiếp Theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}