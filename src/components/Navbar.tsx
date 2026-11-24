'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Search, Coins, User as UserIcon, LogOut, Sliders, Gift, CheckCircle2, Sparkles, Crown } from 'lucide-react';
import { formatVipTimeRemaining } from '@/lib/vip-utils';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navbar() {
  const { 
    user, 
    balance, 
    setIsRechargeOpen, 
    setIsAuthModalOpen, 
    logout, 
    setIsHistoryOpen, 
    setPendingOrder,
    setIsCheckInOpen,
    checkInState,
    setIsLuckyWheelOpen,
    luckyWheelState,
  } = useAuth();
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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0E0E12]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1E1E26] w-full">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo Hồi Đó Nhỏ */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link 
            href="/" 
            onClick={handleLogoClick}
            className="flex items-center gap-2 group select-none cursor-pointer"
            title="Hồi Đó Nhỏ - Truyện Tranh AI"
          >
            <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight uppercase">
              HỒI ĐÓ NHỎ
            </span>
          </Link>
          <a
            href="https://www.tiktok.com/@carrot.tia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-500 dark:text-[#71717A] hover:text-slate-800 dark:hover:text-[#A1A1AA] transition hidden sm:inline-flex"
            title="Kênh TikTok @carrot.tia"
          >
            @carrot.tia ↗
          </a>
        </div>

        {/* Thanh tìm kiếm mã truyện */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs relative hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 dark:text-[#52525B]" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Tìm theo mã tập (vd: 01, 02)..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-[#14141B] border border-slate-300 dark:border-[#22222B] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#52525B] focus:outline-none focus:border-indigo-500 dark:focus:border-[#7C5CFC] transition"
          />
        </form>

        {/* Khu vực tài khoản / ví */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {user ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Huy hiệu Tên Độc Giả: Bấm để mở Lịch Sử Nạp & Đơn Chờ & Chi Tiết VIP */}
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#14141B] dark:hover:bg-[#1C1C26] border border-slate-300 dark:border-[#22222B] hover:border-indigo-400 dark:hover:border-[#7C5CFC]/40 rounded-lg text-xs text-slate-800 dark:text-[#E4E4E7] transition active:scale-95 cursor-pointer relative"
                title={user.isVip ? `👑 Hội Viên VIP: Còn ${formatVipTimeRemaining(user.vipUntil)} (Bấm để xem chi tiết tài khoản)` : 'Bấm để xem lịch sử nạp & tài khoản'}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name || 'User'} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-[#7C5CFC] flex-shrink-0" />
                )}
                <span className="font-semibold max-w-[60px] xs:max-w-[100px] sm:max-w-[140px] truncate" title={user.name || user.phone}>
                  {user.name || user.phone}
                </span>
                {user.isVip && (
                  <span 
                    className="flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 dark:text-[#F59E0B] dark:bg-[#F59E0B]/15 dark:border-[#F59E0B]/30 px-1 py-0.2 rounded"
                    title={`Hội Viên VIP: Còn ${formatVipTimeRemaining(user.vipUntil)}`}
                  >
                    <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-[#F59E0B]" />
                    <span>VIP</span>
                  </span>
                )}
              </button>

              {/* Nút Điểm Danh Nhận Xu */}
              <button
                type="button"
                onClick={() => setIsCheckInOpen(true)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs transition font-semibold active:scale-95 cursor-pointer relative ${
                  checkInState?.canCheckIn
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 dark:bg-gradient-to-r dark:from-amber-500/20 dark:via-orange-500/20 dark:to-amber-500/20 dark:hover:from-amber-500/30 dark:hover:to-orange-500/30 dark:border-amber-500/40 dark:text-amber-300 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#14141B] dark:hover:bg-[#1C1C26] border border-slate-300 dark:border-[#22222B] text-emerald-700 dark:text-emerald-400/90'
                }`}
                title={checkInState?.canCheckIn ? 'Điểm danh nhận xu hôm nay' : 'Hôm nay đã điểm danh (Bấm để xem chuỗi thưởng)'}
              >
                {checkInState?.canCheckIn ? (
                  <>
                    <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-bounce" />
                    <span className="hidden xs:inline">Điểm Danh</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping absolute -top-0.5 -right-0.5" />
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute -top-0.5 -right-0.5" />
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden sm:inline text-[11px]">Đã nhận</span>
                  </>
                )}
              </button>

              {/* Nút Vòng Quay May Mắn */}
              <button
                type="button"
                onClick={() => setIsLuckyWheelOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs transition font-semibold active:scale-95 cursor-pointer relative bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 dark:bg-gradient-to-r dark:from-purple-600/20 dark:via-pink-600/20 dark:to-amber-600/20 dark:hover:from-purple-600/30 dark:hover:to-amber-600/30 dark:border-purple-500/40 dark:text-purple-300 shadow-sm"
                title="Vòng Quay May Mắn (100% Trúng Quà)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="hidden sm:inline">Vòng Quay</span>
                <span className="sm:hidden text-[11px]">Quay</span>
                {luckyWheelState?.canFreeSpin && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 animate-ping" />
                )}
                {luckyWheelState?.canFreeSpin && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5" />
                )}
              </button>

              {/* Số dư Điểm Tri Ân / Nút Mời Cà Phê */}
              <button 
                onClick={() => {
                  setPendingOrder(null);
                  setIsRechargeOpen(true);
                }}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#181824] dark:hover:bg-[#222233] border border-slate-300 dark:border-[#2D2D3D] rounded-lg text-xs text-slate-900 dark:text-white transition font-medium active:scale-95 shadow-xs"
                title="Bấm để Mời Cà Phê / Ủng Hộ Tác Giả"
              >
                <Coins className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
                <span className="font-bold text-amber-600 dark:text-amber-300">{balance} <span className="text-[10px] font-normal text-amber-700 dark:text-amber-300/80">Điểm</span></span>
                <span className="text-slate-600 dark:text-[#A1A1AA] text-[10px] ml-0.5 hidden sm:inline">☕ Mời Cà Phê</span>
              </button>

              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-1.5 text-slate-500 hover:text-red-500 dark:text-[#71717A] dark:hover:text-red-400 rounded transition active:scale-90"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              {/* Nút Chuyển Đổi Giao Diện Sáng / Tối */}
              <ThemeToggle />
            </div>
          ) : isAdmin ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Link
                href="/admin"
                className="flex items-center gap-1 px-2 py-1 text-xs text-amber-800 bg-amber-100 border border-amber-300 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30 rounded-lg transition font-medium animate-fadeIn"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">👑 Quản Trị Viên</span>
                <span className="sm:hidden text-[11px]">Admin</span>
              </Link>
              <button
                onClick={() => {
                  sessionStorage.removeItem('hoidonho_admin_token');
                  setIsAdmin(false);
                  window.dispatchEvent(new Event('admin_auth_changed'));
                  router.push('/');
                }}
                title="Đăng xuất Quản trị"
                className="p-1.5 text-slate-500 hover:text-red-500 dark:text-[#71717A] dark:hover:text-red-400 rounded transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              {/* Nút Chuyển Đổi Giao Diện Sáng / Tối */}
              <ThemeToggle />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 dark:text-[#A1A1AA] dark:hover:text-white dark:bg-[#14141B] dark:hover:bg-[#1E1E28] border border-slate-300 dark:border-[#22222B] rounded-lg transition font-semibold active:scale-95 shadow-xs"
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-[#7C5CFC]" />
                <span>Đăng Nhập</span>
              </button>
              {/* Nút Chuyển Đổi Giao Diện Sáng / Tối */}
              <ThemeToggle />
            </div>
          )}

          {/* Phím Điểm Danh & Mời Cà Phê nhanh cho khách */}
          {!user && (
            <>
              <button
                onClick={() => setIsCheckInOpen(true)}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 dark:bg-gradient-to-r dark:from-amber-500/15 dark:to-orange-500/15 dark:hover:from-amber-500/25 dark:hover:to-orange-500/25 dark:border-amber-500/30 dark:text-amber-300 text-xs font-semibold rounded-lg transition active:scale-95 flex items-center gap-1 relative shadow-xs"
                title="Điểm danh nhận quà 7 ngày (+15 Điểm)"
              >
                <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden xs:inline">Điểm Danh</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute -top-0.5 -right-0.5" />
              </button>
              <button
                onClick={() => setIsLuckyWheelOpen(true)}
                className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 dark:bg-gradient-to-r dark:from-purple-500/15 dark:to-pink-500/15 dark:hover:from-purple-500/25 dark:hover:to-pink-500/25 dark:border-purple-500/30 dark:text-purple-300 text-xs font-semibold rounded-lg transition active:scale-95 flex items-center gap-1 relative shadow-xs"
                title="Vòng Quay May Mắn (100% Trúng Thưởng)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="hidden xs:inline">Vòng Quay</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5" />
              </button>
              <button
                onClick={() => setIsRechargeOpen(true)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#7C5CFC] dark:hover:bg-[#6D4CF0] text-white text-xs font-semibold rounded-lg transition shadow-xs active:scale-95 whitespace-nowrap flex items-center gap-1.5"
              >
                <span>☕</span>
                <span>Mời Cà Phê</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile search - Chỉ hiện ở các trang không phải là trang đọc truyện để tối đa không gian đọc */}
      {!isReaderPage && (
        <div className="sm:hidden px-4 pb-2.5 pt-0.5">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400 dark:text-[#52525B]" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Tìm theo mã tập (vd: 01, 02)..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-[#14141B] border border-slate-300 dark:border-[#22222B] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#52525B] focus:outline-none focus:border-indigo-500 dark:focus:border-[#7C5CFC]"
            />
          </form>
        </div>
      )}
    </header>
  );
}