import React from 'react';
import Link from 'next/link';
import { Story } from '@/lib/types';

interface StoryCardProps {
  story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
  return (
    <Link
      href={`/truyen/${story.slug}`}
      className="group block bg-[#111116] border border-[#1E1E26] hover:border-[#2E2E3C] rounded-xl overflow-hidden transition-all duration-200"
    >
      {/* Bìa truyện tỷ lệ đứng 3:4 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#0A0A0D]">
        <img
          src={story.coverImage}
          alt={story.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
        />

        {/* Mã TikTok */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/85 backdrop-blur-sm text-white font-mono text-[11px] font-bold rounded border border-white/10">
          #{story.code}
        </div>

        {/* Số tập */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/85 backdrop-blur-sm text-[10px] text-[#A1A1AA] font-medium rounded border border-white/10">
          {story.chaptersCount} tập
        </div>
      </div>

      {/* Thông tin truyện */}
      <div className="p-3 space-y-1">
        <div className="text-[10px] font-medium text-[#71717A] uppercase tracking-wider">
          {story.genre}
        </div>
        <h3 className="font-semibold text-xs sm:text-sm text-white line-clamp-2 group-hover:text-[#A78BFA] transition-colors leading-snug">
          {story.title}
        </h3>
        <p className="text-[11px] text-[#71717A] line-clamp-1 pt-0.5">
          {story.summary}
        </p>
      </div>
    </Link>
  );
}
