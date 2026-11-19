'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Search, Coins, User as UserIcon, LogOut, Sliders } from 'lucide-react';

export default function Navbar() {
  const { user, balance, setIsRechargeOpen, setIsAuthModalOpen, logout, setIsHistoryOpen, setPendingOrder } = useAuth();
  const [searchCode, setSearchCode] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const isReaderPage = pathname?.startsWith('/truyen');

  // Kiểm tra quyền Admin bảo mật - ẨN 100% VỚI NGƯỜI DÙNG THÔNG THƯỜNG
  useEffect(() => {
    const checkAdminStatus = () => {
      if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('hoidonho_admin_token');
        setIsAdmin(Boolean(token));
      }
    };
    checkAdminStatus();

    const handleAuthChange = () => checkAdminStatus();
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('admin_auth_changed', handleAuthChange);

    // Phím tắt bí mật: Nhấn Ctrl + Shift + A để mở cổng Admin bất cứ lúc nào
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        router.push('/admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('admin_auth_changed', handleAuthChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    const clean = searchCode.replace('#', '').trim();
    router.push(`/?search=${clean}`);
  };

  // Lối tắt bí mật trên điện thoại: Nhấp 3 lần vào logo để mở trang Admin
  const handleLogoClick = (e: React.MouseEvent) => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        router.push('/admin');
        return 0;
      }
      return next;
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0E0E12]/95 backdrop-blur-md border-b border-[#1E1E26]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo Hồi Đó Nhỏ */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link 
            href="/" 
            onClick={handleLogoClick}
            className="flex items-center gap-2 group select-none cursor-pointer"
            title="Hồi Đó Nhỏ - Truyện Tranh AI"
          >
            <span className="font-bold text-white text-base tracking-tight uppercase">
              HỒI ĐÓ NHỎ
            </span>
          </Link>
          <a
            href="https://www.tiktok.com/@carrot.tia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#71717A] hover:text-[#A1A1AA] transition hidden sm:inline-flex"
            title="Kênh TikTok @carrot.tia"
          >
            @carrot.tia ↗
          </a>
        </div>

        {/* Thanh tìm kiếm mã truyện */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs relative hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#52525B]" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Tìm theo mã tập (vd: 01, 02)..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#14141B] border border-[#22222B] rounded-lg text-xs text-white placeholder-[#52525B] focus:outline-none focus:border-[#7C5CFC] transition"
          />
        </form>

        {/* Khu vực tài khoản / ví */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Huy hiệu Tên Độc Giả: Bấm để mở Lịch Sử Nạp & Đơn Chờ */}
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-[#14141B] hover:bg-[#1C1C26] border border-[#22222B] hover:border-[#333344] rounded-lg text-xs text-[#E4E4E7] transition active:scale-95 cursor-pointer relative"
                title="Bấm để xem lịch sử nạp & đơn chờ thanh toán"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name || 'User'} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-[#7C5CFC] flex-shrink-0" />
                )}
                <span className="font-semibold max-w-[68px] xs:max-w-[100px] sm:max-w-[150px] truncate" title={user.name || user.phone}>
                  {user.name || user.phone}
                </span>
                {user.isVip && (
                  <span className="text-[9px] font-bold text-[#F59E0B] bg-[#F59E0B]/15 border border-[#F59E0B]/30 px-1 py-0.2 rounded">
                    VIP
                  </span>
                )}
              </button>

              {/* Số dư Điểm Tri Ân / Nút Mời Cà Phê */}
              <button 
                onClick={() => {
                  setPendingOrder(null);
                  setIsRechargeOpen(true);
                }}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-[#181824] hover:bg-[#222233] border border-[#2D2D3D] rounded-lg text-xs text-white transition font-medium active:scale-95"
                title="Bấm để Mời Cà Phê / Ủng Hộ Tác Giả"
              >
                <Coins className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
                <span className="font-bold text-amber-300">{balance} <span className="text-[10px] font-normal text-amber-300/80">Điểm</span></span>
                <span className="text-[#A1A1AA] text-[10px] ml-0.5 hidden sm:inline">☕ Mời Cà Phê</span>
              </button>

              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-1.5 text-[#71717A] hover:text-red-400 rounded transition active:scale-90"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isAdmin ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-amber-300 hover:text-white bg-amber-500/15 border border-amber-500/30 rounded-lg transition font-medium animate-fadeIn"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">👑 Quản Trị Viên</span>
                <span className="sm:hidden">👑 Admin</span>
              </Link>
              <button
                onClick={() => {
                  sessionStorage.removeItem('hoidonho_admin_token');
                  setIsAdmin(false);
                  window.dispatchEvent(new Event('admin_auth_changed'));
                  router.push('/');
                }}
                title="Đăng xuất Quản trị"
                className="p-1.5 text-[#71717A] hover:text-red-400 rounded transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white bg-[#14141B] hover:bg-[#1E1E28] border border-[#22222B] rounded-lg transition font-medium active:scale-95"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#7C5CFC]" />
              <span>Đăng Nhập</span>
            </button>
          )}

          {/* Phím Mời Cà Phê nhanh cho khách */}
          {!user && (
            <button
              onClick={() => setIsRechargeOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-xs font-semibold rounded-lg transition shadow-sm active:scale-95 whitespace-nowrap flex items-center gap-1"
            >
              <span>☕ Mời Cà Phê</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile search - Chỉ hiện ở các trang không phải là trang đọc truyện để tối đa không gian đọc */}
      {!isReaderPage && (
        <div className="sm:hidden px-4 pb-2.5 pt-0.5">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#52525B]" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Tìm theo mã tập (vd: 01, 02)..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#14141B] border border-[#22222B] rounded-lg text-xs text-white placeholder-[#52525B] focus:outline-none focus:border-[#7C5CFC]"
            />
          </form>
        </div>
      )}
    </header>
  );
}