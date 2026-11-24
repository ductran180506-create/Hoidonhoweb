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
  MessageSquare,
  MessageCircle,
} from 'lucide-react';

export type AdminTab = 'stories' | 'customers' | 'revenue' | 'analytics' | 'feedback' | 'wheel' | 'chat';

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
    wheelSpins?: number;
    unreadChat?: number;
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

  const isRail = isCollapsed && !isMobileOpen;

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
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 flex flex-col justify-between bg-white dark:bg-[#111118] border-r border-slate-200 dark:border-[#1E1E2B] transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-[68px]' : 'lg:w-64'
        }`}
      >
        {/* KHU VỰC TRÊN CÙNG: LOGO & NÚT THU NHỎ */}
        <div className="flex flex-col flex-1 overflow-hidden">
          
          {/* Header Bar */}
          {isRail ? (
            /* TRẠNG THÁI THU NHỎ (68px): Căn giữa nút PanelLeft hoàn hảo, không che mất hay cấn logo */
            <div className="h-16 flex items-center justify-center border-b border-slate-200 dark:border-[#1E1E2B] flex-shrink-0">
              <button
                type="button"
                onClick={toggleCollapse}
                title="Mở rộng thanh điều hướng (256px)"
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A1A26] dark:hover:bg-[#222234] border border-slate-300 dark:border-[#2B2B3E] hover:border-indigo-400 dark:hover:border-[#7C5CFC]/50 text-indigo-600 dark:text-[#A78BFA] hover:text-indigo-900 dark:hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm group relative"
              >
                <PanelLeft className="w-5 h-5 text-indigo-600 dark:text-[#C4B5FD] group-hover:scale-110 transition-transform" />
                {/* Floating Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
                  Mở rộng thanh điều hướng (256px)
                </div>
              </button>
            </div>
          ) : (
            /* TRẠNG THÁI MỞ RỘNG (256px): Đầy đủ Logo + Tên Brand + Nút gập */
            <div className="h-16 px-3.5 flex items-center justify-between border-b border-slate-200 dark:border-[#1E1E2B] flex-shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C5CFC] to-[#F59E0B] flex items-center justify-center font-black text-white text-sm shadow-md flex-shrink-0 select-none">
                  💎
                </div>
                <div className="flex flex-col whitespace-nowrap overflow-hidden animate-fadeIn">
                  <span className="font-bold text-xs tracking-wider text-slate-900 dark:text-white">HỒI ĐÓ NHỎ</span>
                  <span className="text-[9px] text-slate-500 dark:text-[#A1A1AA] uppercase tracking-wider font-medium">Atelier Backoffice</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Thu nhỏ thanh điều hướng (68px)"
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#9CA3AF] dark:hover:text-white dark:hover:bg-[#1E1E2A] border border-transparent hover:border-slate-300 dark:hover:border-[#2C2C3C] transition active:scale-90 cursor-pointer flex-shrink-0"
                >
                  <PanelLeft className="w-4 h-4 text-indigo-600 dark:text-[#A78BFA]" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 dark:text-[#9CA3AF] dark:hover:text-white dark:hover:bg-[#1E1E2A] transition cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {/* Ô TÌM KIẾM NHANH */}
          <div className={`p-2.5 flex-shrink-0 ${isRail ? 'flex justify-center' : ''}`}>
            {!isRail ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#161622] border border-slate-200 dark:border-[#232332] text-slate-600 dark:text-[#71717A] text-xs focus-within:border-indigo-500 dark:focus-within:border-[#7C5CFC]/60 transition">
                <Search className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-[#9CA3AF]" />
                <span className="truncate text-[11px] select-none text-slate-500 dark:text-[#71717A]">Tìm truyện, SĐT, đơn...</span>
              </div>
            ) : (
              <div className="group relative">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#161622] border border-slate-200 dark:border-[#232332] flex items-center justify-center text-slate-500 dark:text-[#9CA3AF] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1E1E2A] cursor-pointer transition">
                  <Search className="w-4 h-4" />
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 top-2 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
                  Tìm kiếm nhanh
                </div>
              </div>
            )}
          </div>

          {/* DANH SÁCH MENU ĐIỀU HƯỚNG CHÍNH */}
          <nav className="flex-1 px-2 py-1 space-y-4 overflow-y-auto no-scrollbar text-xs">
            
            {/* NHÓM 1: VẬN HÀNH & NỘI DUNG */}
            <div>
              {!isRail && (
                <div className="px-2.5 pb-1.5 text-[10px] font-bold text-slate-500 dark:text-[#64748B] uppercase tracking-wider select-none">
                  Vận Hành & Nội Dung
                </div>
              )}
              <ul className="space-y-1">
                {/* 1.1 Kho Truyện & Tập */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('stories')}
                    className={`w-full flex items-center ${isRail ? 'justify-center px-0 h-10' : 'justify-between px-2.5 py-2'} rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'stories'
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-xs dark:bg-[#7C5CFC]/15 dark:text-[#C4B5FD] dark:border-[#7C5CFC]/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent dark:text-[#CBD5E1] dark:hover:bg-[#181824] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen className={`w-4 h-4 flex-shrink-0 ${activeTab === 'stories' ? 'text-indigo-600 dark:text-[#A78BFA]' : 'text-indigo-500 dark:text-[#818CF8]'}`} />
                      {!isRail && (
                        <span className="truncate">Kho Truyện & Tập</span>
                      )}
                    </div>
                    {!isRail ? (
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#222232] dark:text-[#94A3B8] dark:border-transparent rounded font-semibold flex-shrink-0">
                        {counts.stories}
                      </span>
                    ) : (
                      counts.stories > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                      )
                    )}

                    {isRail && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
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
                      className={`w-full flex items-center ${isRail ? 'justify-center px-0 h-10' : 'justify-between px-2.5 py-2'} rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:bg-[#181824] dark:hover:text-white transition group cursor-pointer border border-transparent relative`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlusCircle className="w-4 h-4 flex-shrink-0 text-sky-500 dark:text-[#38BDF8]" />
                        {!isRail && (
                          <span className="truncate">Thêm Truyện Mới</span>
                        )}
                      </div>
                      {!isRail && (
                        <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 rounded font-bold">
                          + Mới
                        </span>
                      )}

                      {isRail && (
                        <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
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
              {!isRail && (
                <div className="px-2.5 pb-1.5 text-[10px] font-bold text-slate-500 dark:text-[#64748B] uppercase tracking-wider select-none">
                  Kinh Doanh & Đơn Hàng
                </div>
              )}
              <ul className="space-y-1">
                {/* 2.1 Sổ Chuyển Khoản & Doanh Thu */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('revenue')}
                    className={`w-full flex items-center ${isRail ? 'justify-center px-0 h-10' : 'justify-between px-2.5 py-2'} rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'revenue'
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-xs dark:bg-[#7C5CFC]/15 dark:text-[#C4B5FD] dark:border-[#7C5CFC]/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent dark:text-[#CBD5E1] dark:hover:bg-[#181824] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Receipt className={`w-4 h-4 flex-shrink-0 ${activeTab === 'revenue' ? 'text-amber-500' : 'text-amber-500'}`} />
                      {!isRail && (
                        <span className="truncate">Sổ Chuyển Khoản</span>
                      )}
                    </div>
                    {!isRail ? (
                      counts.pendingOrders > 0 ? (
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 rounded font-bold animate-pulse">
                          {counts.pendingOrders} chờ
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-800 border border-slate-300 dark:bg-[#222232] dark:text-[#CBD5E1] dark:border-transparent rounded font-semibold">
                          {counts.totalOrders}
                        </span>
                      )
                    ) : (
                      counts.pendingOrders > 0 && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-red-500 text-white animate-bounce shadow">
                          {counts.pendingOrders}
                        </span>
                      )
                    )}

                    {isRail && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
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
                    className={`w-full flex items-center ${isRail ? 'justify-center px-0 h-10' : 'justify-between px-2.5 py-2'} rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'customers'
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-xs dark:bg-[#7C5CFC]/15 dark:text-[#C4B5FD] dark:border-[#7C5CFC]/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent dark:text-[#CBD5E1] dark:hover:bg-[#181824] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className={`w-4 h-4 flex-shrink-0 ${activeTab === 'customers' ? 'text-indigo-600 dark:text-[#A78BFA]' : 'text-blue-500 dark:text-[#60A5FA]'}`} />
                      {!isRail && (
                        <span className="truncate">Độc Giả & Khách</span>
                      )}
                    </div>
                    {!isRail ? (
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-800 border border-slate-300 dark:bg-[#222232] dark:text-[#CBD5E1] dark:border-transparent rounded font-semibold">
                        {counts.customers}
                      </span>
                    ) : (
                      counts.customers > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
                      )
                    )}

                    {isRail && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
                        Độc Giả & Khách Hàng ({counts.customers})
                      </div>
                    )}
                  </button>
                </li>

                {/* 2.3 Vòng Quay May Mắn (Quản Lý & Tỉ Lệ Giải Thưởng) */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('wheel')}
                    className={`w-full flex items-center ${isRail ? 'justify-center px-0 h-10' : 'justify-between px-2.5 py-2'} rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'wheel'
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-xs dark:bg-[#7C5CFC]/15 dark:text-[#C4B5FD] dark:border-[#7C5CFC]/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent dark:text-[#CBD5E1] dark:hover:bg-[#181824] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Sparkles className="w-4 h-4 flex-shrink-0 text-pink-500 dark:text-pink-400" />
                      {!isRail && (
                        <span className="truncate">Vòng Quay May Mắn</span>
                      )}
                    </div>
                    {!isRail ? (
                      <span className="text-[9px] px-1.5 py-0.2 bg-pink-100 text-pink-900 border border-pink-300 dark:bg-gradient-to-r dark:from-pink-500/20 dark:to-purple-500/20 dark:text-pink-300 dark:border-pink-500/30 rounded font-bold font-mono">
                        {counts.wheelSpins ? `${counts.wheelSpins} lượt` : 'Cấu hình'}
                      </span>
                    ) : (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500" />
                    )}

                    {isRail && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
                        Cài Đặt Vòng Quay May Mắn (Giải Thưởng & Tỉ Lệ)
                      </div>
                    )}
                  </button>
                </li>
              </ul>
            </div>

            {/* NHÓM 3: HỆ THỐNG & BÁO CÁO */}
            <div>
              {!isRail && (
                <div className="px-2.5 pb-1.5 text-[10px] font-bold text-slate-500 dark:text-[#64748B] uppercase tracking-wider select-none">
                  Hệ Thống & Báo Cáo
                </div>
              )}
              <ul className="space-y-1">
                {/* 3.1 Thống Kê & Traffic */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('analytics')}
                    className={`w-full flex items-center ${isRail ? 'justify-center px-0 h-10' : 'justify-between px-2.5 py-2'} rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'analytics'
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-xs dark:bg-[#7C5CFC]/15 dark:text-[#C4B5FD] dark:border-[#7C5CFC]/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent dark:text-[#CBD5E1] dark:hover:bg-[#181824] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BarChart3 className="w-4 h-4 flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
                      {!isRail && (
                        <span className="truncate">Thống Kê Traffic</span>
                      )}
                    </div>
                    {!isRail && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-800 border border-slate-300 dark:bg-[#222232] dark:text-[#CBD5E1] dark:border-transparent rounded font-semibold font-mono">
                        {counts.analytics}
                      </span>
                    )}

                    {isRail && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
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
                    className={`w-full flex items-center ${isRail ? 'justify-center px-0 h-10' : 'justify-between px-2.5 py-2'} rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'feedback'
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-xs dark:bg-[#7C5CFC]/15 dark:text-[#C4B5FD] dark:border-[#7C5CFC]/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent dark:text-[#CBD5E1] dark:hover:bg-[#181824] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Inbox className="w-4 h-4 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                      {!isRail && (
                        <span className="truncate">Hòm Thư Góp Ý</span>
                      )}
                    </div>
                    {!isRail ? (
                      counts.newFeedback > 0 ? (
                        <span className="text-[9px] px-1.5 py-0.2 bg-purple-600 text-white rounded font-bold animate-pulse shadow-xs">
                          {counts.newFeedback} mới
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-800 border border-slate-300 dark:bg-[#222232] dark:text-[#CBD5E1] dark:border-transparent rounded font-semibold font-mono">
                          {counts.feedback}
                        </span>
                      )
                    ) : (
                      counts.newFeedback > 0 && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-purple-600 text-white animate-pulse">
                          {counts.newFeedback}
                        </span>
                      )
                    )}

                    {isRail && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
                        Hòm Thư Góp Ý ({counts.feedback})
                      </div>
                    )}
                  </button>
                </li>

                {/* 3.3 Tin Nhắn Khách Hàng (Chat 1-1) */}
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('chat')}
                    className={`w-full flex items-center ${isRail ? 'justify-center px-0 h-10' : 'justify-between px-2.5 py-2'} rounded-lg transition group cursor-pointer relative ${
                      activeTab === 'chat'
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-xs dark:bg-[#7C5CFC]/15 dark:text-[#C4B5FD] dark:border-[#7C5CFC]/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent dark:text-[#CBD5E1] dark:hover:bg-[#181824] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageCircle className="w-4 h-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                      {!isRail && (
                        <span className="truncate">Tin Nhắn Khách Hàng</span>
                      )}
                    </div>
                    {!isRail ? (
                      counts.unreadChat && counts.unreadChat > 0 ? (
                        <span className="text-[9px] px-1.5 py-0.2 bg-rose-600 text-white rounded font-bold animate-pulse shadow-xs">
                          {counts.unreadChat} mới
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-800 border border-slate-300 dark:bg-[#222232] dark:text-[#CBD5E1] dark:border-transparent rounded font-semibold font-mono">
                          1-1
                        </span>
                      )
                    ) : (
                      counts.unreadChat && counts.unreadChat > 0 && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-600 text-white animate-pulse">
                          {counts.unreadChat}
                        </span>
                      )
                    )}

                    {isRail && (
                      <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-white text-[11px] rounded shadow-xl border border-slate-700 dark:border-[#2C2C3D] whitespace-nowrap z-50">
                        Tin Nhắn Khách Hàng {counts.unreadChat ? `(${counts.unreadChat} mới)` : ''}
                      </div>
                    )}
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* KHU VỰC CHÂN TRANG (FOOTER): PROFILE ADMIN & ĐĂNG XUẤT */}
        <div className="p-2 border-t border-slate-200 dark:border-[#1E1E2B] bg-slate-50 dark:bg-[#0E0E15] flex-shrink-0">
          {!isRail ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#161622] border border-slate-200 dark:border-[#222230]">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0 shadow">
                  A
                </div>
                <div className="overflow-hidden">
                  <div className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">admin@carrot.tia</div>
                  <div className="text-[9px] text-indigo-600 dark:text-[#A78BFA] font-medium tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 text-[#F59E0B]" />
                    <span>QUẢN TRỊ VIÊN</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Đăng xuất khỏi trang quản trị"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:text-[#9CA3AF] dark:hover:text-red-400 dark:hover:bg-[#20202E] rounded-md transition active:scale-90 cursor-pointer"
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
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs hover:ring-2 hover:ring-red-400 transition cursor-pointer shadow"
              >
                A
              </button>
              <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute left-full ml-3 top-2 px-2.5 py-1 bg-slate-900 dark:bg-[#1E1E2B] text-red-300 text-[11px] rounded shadow-xl border border-red-500/30 whitespace-nowrap z-50">
                Đăng xuất (admin@carrot.tia)
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 3. THANH ĐIỀU HƯỚNG ĐÁY MÀN HÌNH DI ĐỘNG (MOBILE BOTTOM NAVIGATION DÀNH RIÊNG CHO ĐIỆN THOẠI) */}
      <nav 
        aria-label="Thanh điều hướng di động"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#0C0C12]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[#1E1E2B] px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="grid grid-cols-5 gap-1 items-center max-w-md mx-auto">
          {/* Tab 1: Kho Truyện */}
          <button
            type="button"
            onClick={() => handleSelectTab('stories')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 relative ${
              activeTab === 'stories'
                ? 'text-indigo-600 dark:text-[#C4B5FD] font-bold bg-indigo-50 dark:bg-[#7C5CFC]/15'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <BookOpen className={`w-5 h-5 transition-transform ${activeTab === 'stories' ? 'scale-110 text-indigo-600 dark:text-[#A78BFA]' : ''}`} />
              <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-slate-100 dark:bg-[#1E1E2E] text-slate-700 dark:text-[#C4B5FD] border border-slate-200 dark:border-[#2F2F45]">
                {counts.stories}
              </span>
            </div>
            <span className="text-[10px] mt-1 leading-tight tracking-tight">Truyện</span>
            {activeTab === 'stories' && (
              <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-[#A78BFA] mt-0.5" />
            )}
          </button>

          {/* Tab 2: Sổ Đơn Hàng */}
          <button
            type="button"
            onClick={() => handleSelectTab('revenue')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 relative ${
              activeTab === 'revenue'
                ? 'text-amber-700 dark:text-[#FCD34D] font-bold bg-amber-50 dark:bg-amber-500/15'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <Receipt className={`w-5 h-5 transition-transform ${activeTab === 'revenue' ? 'scale-110 text-amber-500 dark:text-amber-400' : ''}`} />
              {counts.pendingOrders > 0 ? (
                <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-rose-500 text-white animate-pulse">
                  {counts.pendingOrders}
                </span>
              ) : (
                <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-slate-100 dark:bg-[#1E1E2E] text-amber-700 dark:text-amber-300 border border-slate-200 dark:border-[#2F2F45]">
                  {counts.totalOrders}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 leading-tight tracking-tight">Đơn Hàng</span>
            {activeTab === 'revenue' && (
              <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* Tab 3: Độc Giả */}
          <button
            type="button"
            onClick={() => handleSelectTab('customers')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 relative ${
              activeTab === 'customers'
                ? 'text-sky-700 dark:text-sky-300 font-bold bg-sky-50 dark:bg-sky-500/15'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <Users className={`w-5 h-5 transition-transform ${activeTab === 'customers' ? 'scale-110 text-sky-600 dark:text-sky-400' : ''}`} />
              <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-slate-100 dark:bg-[#1E1E2E] text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-[#2F2F45]">
                {counts.customers}
              </span>
            </div>
            <span className="text-[10px] mt-1 leading-tight tracking-tight">Độc Giả</span>
            {activeTab === 'customers' && (
              <span className="w-1 h-1 rounded-full bg-sky-500 dark:bg-sky-400 mt-0.5" />
            )}
          </button>

          {/* Tab 4: Vòng Quay */}
          <button
            type="button"
            onClick={() => handleSelectTab('wheel')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 relative ${
              activeTab === 'wheel'
                ? 'text-pink-700 dark:text-pink-300 font-bold bg-pink-50 dark:bg-pink-500/15'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <Sparkles className={`w-5 h-5 transition-transform ${activeTab === 'wheel' ? 'scale-110 text-pink-600 dark:text-pink-400' : ''}`} />
              <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-slate-100 dark:bg-[#1E1E2E] text-pink-700 dark:text-pink-300 border border-slate-200 dark:border-[#2F2F45]">
                {counts.wheelSpins || 0}
              </span>
            </div>
            <span className="text-[10px] mt-1 leading-tight tracking-tight">Vòng Quay</span>
            {activeTab === 'wheel' && (
              <span className="w-1 h-1 rounded-full bg-pink-500 dark:bg-pink-400 mt-0.5" />
            )}
          </button>

          {/* Tab 5: Menu Khác (Traffic, Góp Ý, Đăng Xuất) */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 relative ${
              activeTab === 'analytics' || activeTab === 'feedback'
                ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-500/15'
                : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <PanelLeft className="w-5 h-5 text-slate-500 dark:text-gray-300" />
              {counts.newFeedback > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-mono font-bold rounded-full bg-purple-600 text-white animate-pulse">
                  {counts.newFeedback}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 leading-tight tracking-tight">Thêm</span>
            {(activeTab === 'analytics' || activeTab === 'feedback') && (
              <span className="w-1 h-1 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-0.5" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
