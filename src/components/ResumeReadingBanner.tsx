'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLastRead } from '@/lib/reading-history';
import { ReadingHistoryItem } from '@/lib/types';
import { BookOpen, ArrowRight, X } from 'lucide-react';

export default function ResumeReadingBanner() {
  const [lastRead, setLastRead] = useState<ReadingHistoryItem | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const item = getLastRead();
    if (item) {
      setLastRead(item);
    }
  }, []);

  if (!lastRead || dismissed) return null;

  return (
    <div className="relative p-3.5 bg-gradient-to-r from-[#171426] via-[#16132A] to-[#12111E] border border-[#7C5CFC]/30 hover:border-[#7C5CFC]/50 rounded-xl transition shadow-lg shadow-[#7C5CFC]/5 animate-fadeIn">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2.5 right-2.5 p-1 text-[#71717A] hover:text-white rounded transition"
        title="Ẩn"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-center gap-3 pr-6">
        {lastRead.storyCover ? (
          <img
            src={lastRead.storyCover}
            alt=""
            className="w-10 h-14 rounded-md object-cover flex-shrink-0 border border-[#272738]"
          />
        ) : (
          <div className="w-10 h-14 rounded-md bg-[#1F1E2E] flex items-center justify-center flex-shrink-0 border border-[#272738]">
            <BookOpen className="w-5 h-5 text-[#7C5CFC]" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono font-semibold text-[#A78BFA] uppercase tracking-wider">
            Lịch Sử Đọc Gần Đây
          </div>
          <div className="text-sm font-semibold text-white truncate mt-0.5">
            {lastRead.storyTitle}
          </div>
          <div className="text-xs text-[#A1A1AA] flex items-center gap-2 mt-0.5">
            <span className="text-[#F59E0B] font-medium">{lastRead.chapterTitle || `Tập ${lastRead.chapterIndex}`}</span>
            <span>•</span>
            <span className="text-[11px] text-[#71717A]">Đang đọc dở</span>
          </div>
        </div>

        <Link
          href={`/truyen/${lastRead.storySlug}?chapter=${lastRead.chapterIndex}`}
          className="flex-shrink-0 px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 active:scale-95 shadow-sm"
        >
          <span>Đọc tiếp</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
