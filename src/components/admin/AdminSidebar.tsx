'use client';

import React from 'react';
import Link from 'next/link';
import {
  PanelLeft,
  BookOpen,
  PlusCircle,
  Receipt,
  Users,
  Sparkles,
  BarChart3,
  Inbox,
  LogOut,
  X,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type AdminTab = 'stories' | 'customers' | 'revenue' | 'analytics' | 'feedback';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  counts: {
    stories: number;
    customers: number;
    pendingOrders: number;
    totalOrders: number;
    analytics: number;
    feedback: number;
    newFeedback: number;
  };
  onNewStoryClick?: () => void;
  onOpenLuckyWheel?: () => void;
  onLogout: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  counts,
  onNewStoryClick,
  onOpenLuckyWheel,
  onLogout,
}: AdminSidebarProps) {
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('hdn_admin_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* 1. LỚP PHỦ MỜ KHI MỞ TRÊN MOBILE (Backdrop Overlay) */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity animate-fadeIn"
          title="Bấm ra ngoài để đóng menu"
        />
      )}

      {/* 2. THANH SIDEBAR CHÍNH */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 flex flex-col justify-between bg-[#111118] border-r border-[#1E1E2B] transition-all duration-300 ease-in-out ${
          // Mobile: Drawer trượt từ mép trái
          isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop: Co giãn linh hoạt 68px <-> 256px
          isCollapsed ? 'lg:w-[68px]' : 'lg:w-64'
        }`}
      >
        {/* KHU VỰC TRÊN CÙNG: LOGO & NÚT THU NHỎ */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header Bar */}
          <div className="h-16 px-3.5 flex items-center justify-between border-b border-[#1E1E2B] flex-shrink-0">
            {/* Logo + Tên Brand */}
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C5CFC] to-[#F59E0B] flex items-center justify-center font-black text-white text-sm shadow-md flex-shrink-0 select-none">
                💎
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col whitespace-nowrap overflow-hidden animate-fadeIn">
                  <span className="font-bold text-xs tracking-wider text-white">HỒI ĐÓ NHỎ</span>
                  <span className="text-[9px] text-[#A1A1AA] uppercase tracking-wider font-medium">Atelier Backoffice</span>
                </div>
              )}
            </div>

            {/* Nút Thu Nhỏ / Mở Rộng Sidebar (Chuẩn theo Hình 3) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleCollapse}
                title={isCollapsed ? 'Mở rộng thanh điều hướng (256px)' : 'Thu nhỏ thanh điều hướng (68px)'}
                className="hidden lg:flex p-1.5 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1E1E2A] border border-transparent hover:border-[#2C2C3C] transition active:scale-90 cursor-pointer flex-shrink-0"
              >
                {/* Icon PanelLeft đặc trưng theo Hình 3 */}
                <PanelLeft className={`w-4 h-4 text-[#A78BFA] transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
              </button>

              {/* Nút đóng trên Mobile */}
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 text-[#9CA3AF] hover:text-white rounded-lg hover:bg-[#1E1E2A] transition cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Ô TÌM KIẾM NHANH */}
          <div className="p-2.5 flex-shrink-0">
            {(!isCollapsed || isMobileOpen) ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#161622] border border-[#232332] text-[#71717A] text-xs focus-within:border-[#7C5CFC]/60 transition">
                <Search className="w-3.5 h-3.5 flex-shrink-0 text-[#9CA3AF]" />
                <span className="truncate text-[11px] select-none text-[#71717A]">Tìm truyện, SĐT, đơn...</span>
              </div>
            ) : (
              <div className="flex justify-center group relative">
                <div className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1E1E2A] cursor-pointer transition">
                  <Search className="w-4 h-4" />
                </div>
                {/* Floating Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-2 top-1.5 px-2.5 py-1 bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-[#2C2C3D] whitespace-nowrap z-50">
                  Tìm kiếm nhanh
                </div>
              </div>
            )}
          </div>

          {/* DANH SÁCH MENU ĐIỀU HƯỚNG CHÍNH */}
          <nav className="flex-1 px-2 py-1 space-y-4 overflow-y-auto no-scrollbar text-xs">
            
            {/* NHÓM 1: VẬN HÀNH & NỘI DUNG */}
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-2.5 pb-1.5 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider select-none">
                  Vận Hành & Nội Dung
                </div>
              )}
              <ul className="space-y-1">
                {/* 1.1 Kho Truyện & Tập */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('stories')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'stories'
                        ? 'bg-[#7C5CFC]/15 text-[#C4B5FD] font-semibold border border-[#7C5CFC]/30 shadow-sm'
                        : 'text-[#CBD5E1] hover:bg-[#181824] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen className={`w-4 h-4 flex-shrink-0 ${activeTab === 'stories' ? 'text-[#A78BFA]' : 'text-[#818CF8]'}`} />
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate">Kho Truyện & Tập</span>
                      )}
                    </div>
                    {(!isCollapsed || isMobileOpen) ? (
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#222232] text-[#94A3B8] rounded font-semibold flex-shrink-0">
                        {counts.stories}
                      </span>
                    ) : (
                      /* Badge nhỏ nổi khi thu nhỏ */
                      counts.stories > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
                      )
                    )}

                    {/* Floating Tooltip khi thu nhỏ */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-[#2C2C3D] whitespace-nowrap z-50">
                        Kho Truyện & Tập ({counts.stories})
                      </div>
                    )}
                  </button>
                </li>

                {/* 1.2 Thêm Truyện Mới */}
                {onNewStoryClick && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectTab('stories');
                        onNewStoryClick();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[#94A3B8] hover:bg-[#181824] hover:text-white transition group cursor-pointer border border-transparent relative"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlusCircle className="w-4 h-4 flex-shrink-0 text-[#38BDF8]" />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate">Thêm Truyện Mới</span>
                        )}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded font-bold">
                          + Mới
                        </span>
                      )}

                      {/* Floating Tooltip khi thu nhỏ */}
                      {isCollapsed && !isMobileOpen && (
                        <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-[#2C2C3D] whitespace-nowrap z-50">
                          Thêm Truyện Mới (+)
                        </div>
                      )}
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* NHÓM 2: KINH DOANH & ĐƠN HÀNG */}
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-2.5 pb-1.5 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider select-none">
                  Kinh Doanh & Đơn Hàng
                </div>
              )}
              <ul className="space-y-1">
                {/* 2.1 Sổ Chuyển Khoản & Doanh Thu */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('revenue')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'revenue'
                        ? 'bg-[#7C5CFC]/15 text-[#C4B5FD] font-semibold border border-[#7C5CFC]/30 shadow-sm'
                        : 'text-[#CBD5E1] hover:bg-[#181824] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Receipt className={`w-4 h-4 flex-shrink-0 ${activeTab === 'revenue' ? 'text-amber-400' : 'text-[#F59E0B]'}`} />
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate">Sổ Chuyển Khoản</span>
                      )}
                    </div>
                    {(!isCollapsed || isMobileOpen) ? (
                      counts.pendingOrders > 0 ? (
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-bold animate-pulse">
                          {counts.pendingOrders} chờ
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#222232] text-[#94A3B8] rounded font-semibold">
                          {counts.totalOrders}
                        </span>
                      )
                    ) : (
                      /* Chấm đỏ nổi khi có đơn chờ duyệt (giống Hình 4) */
                      counts.pendingOrders > 0 && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.2 text-[9px] font-bold rounded-full bg-red-500 text-white animate-bounce shadow">
                          {counts.pendingOrders}
                        </span>
                      )
                    )}

                    {/* Floating Tooltip khi thu nhỏ */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-[#2C2C3D] whitespace-nowrap z-50">
                        Sổ Chuyển Khoản ({counts.pendingOrders > 0 ? `${counts.pendingOrders} chờ duyệt` : counts.totalOrders})
                      </div>
                    )}
                  </button>
                </li>

                {/* 2.2 Độc Giả & Khách Hàng */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('customers')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'customers'
                        ? 'bg-[#7C5CFC]/15 text-[#C4B5FD] font-semibold border border-[#7C5CFC]/30 shadow-sm'
                        : 'text-[#CBD5E1] hover:bg-[#181824] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className={`w-4 h-4 flex-shrink-0 ${activeTab === 'customers' ? 'text-[#A78BFA]' : 'text-[#60A5FA]'}`} />
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate">Độc Giả & Khách</span>
                      )}
                    </div>
                    {(!isCollapsed || isMobileOpen) ? (
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#222232] text-[#94A3B8] rounded font-semibold">
                        {counts.customers}
                      </span>
                    ) : (
                      counts.customers > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                      )
                    )}

                    {/* Floating Tooltip khi thu nhỏ */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-[#2C2C3D] whitespace-nowrap z-50">
                        Độc Giả & Khách Hàng ({counts.customers})
                      </div>
                    )}
                  </button>
                </li>

                {/* 2.3 Vòng Quay May Mắn */}
                {onOpenLuckyWheel && (
                  <li>
                    <button
                      type="button"
                      onClick={onOpenLuckyWheel}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[#CBD5E1] hover:bg-[#181824] hover:text-white transition group cursor-pointer border border-transparent relative"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Sparkles className="w-4 h-4 flex-shrink-0 text-pink-400" />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate">Vòng Quay May Mắn</span>
                        )}
                      </div>
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30 rounded font-bold">
                          HOT
                        </span>
                      )}

                      {/* Floating Tooltip khi thu nhỏ */}
                      {isCollapsed && !isMobileOpen && (
                        <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-[#2C2C3D] whitespace-nowrap z-50">
                          Vòng Quay May Mắn (HOT)
                        </div>
                      )}
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* NHÓM 3: HỆ THỐNG & BÁO CÁO */}
            <div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-2.5 pb-1.5 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider select-none">
                  Hệ Thống & Báo Cáo
                </div>
              )}
              <ul className="space-y-1">
                {/* 3.1 Thống Kê & Traffic */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('analytics')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'analytics'
                        ? 'bg-[#7C5CFC]/15 text-[#C4B5FD] font-semibold border border-[#7C5CFC]/30 shadow-sm'
                        : 'text-[#CBD5E1] hover:bg-[#181824] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BarChart3 className={`w-4 h-4 flex-shrink-0 ${activeTab === 'analytics' ? 'text-emerald-400' : 'text-emerald-400'}`} />
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate">Thống Kê Traffic</span>
                      )}
                    </div>
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#222232] text-[#94A3B8] rounded font-semibold">
                        {counts.analytics}
                      </span>
                    )}

                    {/* Floating Tooltip khi thu nhỏ */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-[#2C2C3D] whitespace-nowrap z-50">
                        Thống Kê Traffic ({counts.analytics} máy)
                      </div>
                    )}
                  </button>
                </li>

                {/* 3.2 Hòm Thư Góp Ý */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('feedback')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'feedback'
                        ? 'bg-[#7C5CFC]/15 text-[#C4B5FD] font-semibold border border-[#7C5CFC]/30 shadow-sm'
                        : 'text-[#CBD5E1] hover:bg-[#181824] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Inbox className={`w-4 h-4 flex-shrink-0 ${activeTab === 'feedback' ? 'text-blue-400' : 'text-blue-400'}`} />
                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate">Hòm Thư Góp Ý</span>
                      )}
                    </div>
                    {(!isCollapsed || isMobileOpen) ? (
                      counts.newFeedback > 0 ? (
                        <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/30 text-purple-200 border border-purple-500/50 rounded font-bold animate-pulse">
                          {counts.newFeedback} mới
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#222232] text-[#94A3B8] rounded font-semibold">
                          {counts.feedback}
                        </span>
                      )
                    ) : (
                      counts.newFeedback > 0 && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.2 text-[9px] font-bold rounded-full bg-purple-600 text-white animate-pulse">
                          {counts.newFeedback}
                        </span>
                      )
                    )}

                    {/* Floating Tooltip khi thu nhỏ */}
                    {isCollapsed && !isMobileOpen && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-[#2C2C3D] whitespace-nowrap z-50">
                        Hòm Thư Góp Ý ({counts.feedback})
                      </div>
                    )}
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* KHU VỰC CHÂN TRANG (FOOTER): PROFILE ADMIN & ĐĂNG XUẤT (Hình 2) */}
        <div className="p-2 border-t border-[#1E1E2B] bg-[#0E0E15] flex-shrink-0">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#161622] border border-[#222230]">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0 shadow">
                  A
                </div>
                <div className="overflow-hidden">
                  <div className="text-[11px] font-semibold text-white truncate">admin@carrot.tia</div>
                  <div className="text-[9px] text-[#A78BFA] font-medium tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 text-[#F59E0B]" />
                    <span>QUẢN TRỊ VIÊN</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Đăng xuất khỏi trang quản trị"
                className="p-1.5 text-[#9CA3AF] hover:text-red-400 hover:bg-[#20202E] rounded-md transition active:scale-90 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center group relative">
              <button
                type="button"
                onClick={onLogout}
                title="Đăng xuất"
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs hover:ring-2 hover:ring-red-400 transition cursor-pointer"
              >
                A
              </button>
              {/* Floating Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 top-1 px-2.5 py-1 bg-[#1E1E2B] text-red-300 text-[11px] rounded shadow-xl border border-red-500/30 whitespace-nowrap z-50">
                Đăng xuất (admin@carrot.tia)
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
