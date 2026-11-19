'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, X, Send } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  storyTitle?: string;
  url?: string;
  className?: string;
}

export default function ShareButton({
  title,
  storyTitle,
  url,
  className = '',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    if (url) return url;
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  };

  const getShareText = () => {
    return `Đọc truyện "${storyTitle || title}" siêu cuốn trên Hồi Đó Nhỏ (@carrot.tia) nhé!`;
  };

  const handleShare = async () => {
    const fullUrl = getShareUrl();
    const shareText = getShareText();

    // Nếu trình duyệt hỗ trợ Web Share API (100% trên điện thoại iPhone & Android)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: storyTitle || title,
          text: shareText,
          url: fullUrl,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setIsOpen(true);
        }
        return;
      }
    }

    // Fallback mở Modal chia sẻ
    setIsOpen(true);
  };

  const copyToClipboard = () => {
    const fullUrl = getShareUrl();
    navigator.clipboard.writeText(`${getShareText()}\n${fullUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareToFacebook = () => {
    const fullUrl = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${fullUrl}`, '_blank');
  };

  const shareToZalo = () => {
    const fullUrl = encodeURIComponent(getShareUrl());
    window.open(`https://chat.zalo.me/?url=${fullUrl}`, '_blank');
  };

  return (
    <>
      <button
        onClick={handleShare}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#14141B] hover:bg-[#1E1E28] border border-[#22222E] hover:border-[#7C5CFC]/50 text-xs font-medium text-[#D4D4D8] hover:text-white rounded-lg transition active:scale-95 ${className}`}
        title="Chia sẻ truyện"
      >
        <Share2 className="w-3.5 h-3.5 text-[#7C5CFC]" />
        <span>Chia sẻ</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm p-5 bg-[#111116] border border-[#22222B] rounded-xl shadow-2xl space-y-4">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 text-[#71717A] hover:text-white rounded transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="text-[11px] font-mono text-[#71717A] uppercase mb-1">Lan Tỏa Đam Mê</div>
              <h3 className="font-semibold text-base text-white">Chia Sẻ Bộ Truyện</h3>
              <p className="text-xs text-[#71717A] mt-0.5">
                Chia sẻ cùng bạn bè để cùng bàn luận về cái kết nhé!
              </p>
            </div>

            {/* Khối Copy link nhanh */}
            <div className="flex items-center gap-2 p-2 bg-[#0A0A0D] border border-[#22222B] rounded-lg">
              <input
                type="text"
                readOnly
                value={getShareUrl()}
                className="bg-transparent text-xs text-[#A1A1AA] flex-1 truncate focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-xs font-medium rounded-md transition flex items-center gap-1 flex-shrink-0 active:scale-95 shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã Copy</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Các nút mạng xã hội */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={shareToFacebook}
                className="py-2 px-3 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 text-[#1877F2] text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <span>Facebook</span>
              </button>
              <button
                onClick={shareToZalo}
                className="py-2 px-3 bg-[#0068FF]/10 hover:bg-[#0068FF]/20 border border-[#0068FF]/30 text-[#0068FF] text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <span>Zalo Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
