import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[#1E1E26] bg-[#0E0E12] py-6 text-xs text-[#71717A]">
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-white">HỒI ĐÓ NHỎ</span> (
            <a
              href="https://www.tiktok.com/@carrot.tia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A1A1AA] hover:text-white transition font-medium"
            >
              @carrot.tia ↗
            </a>
            )
          </div>

          <div className="flex items-center gap-3 text-[#71717A] text-[11px]">
            <Link href="/" className="hover:text-white transition">Kệ Sách</Link>
            <span>•</span>
            <a
              href="https://www.tiktok.com/@carrot.tia"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition"
            >
              TikTok
            </a>
            <span>•</span>
            <span>Ủng hộ mình qua VietQR</span>
          </div>
        </div>

        {/* Dòng miễn trừ trách nhiệm rút gọn 1 dòng tinh tế */}
        <p className="text-[11px] text-[#52525B] text-center sm:text-left">
          ⚖️ Nội dung do tác giả tự sáng tác bằng AI nhằm mục đích chia sẻ nhân văn. Đóng góp mang tính chất ủng hộ duy trì kênh.
        </p>
      </div>
    </footer>
  );
}
