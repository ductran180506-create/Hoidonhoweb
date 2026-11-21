'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  X, 
  Gift, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Crown, 
  Coins, 
  Lock, 
  ArrowRight,
  PartyPopper
} from 'lucide-react';

export default function CheckInModal() {
  const { 
    user, 
    isCheckInOpen, 
    setIsCheckInOpen, 
    checkInState, 
    refreshCheckIn, 
    setIsAuthModalOpen 
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    reward: number;
    newStreak: number;
    isDay7Jackpot: boolean;
    message: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number }>>([]);

  // Lấy dữ liệu chuỗi và phần thưởng
  const rewards = checkInState?.rewards || [1, 1, 2, 2, 2, 2, 5];
  const streak = checkInState?.streak || 0;
  const canCheckIn = checkInState?.canCheckIn ?? true;

  // Khởi tạo và đếm ngược thời gian đến 00:00 ngày mai
  useEffect(() => {
    if (checkInState?.timeLeftMs) {
      setTimeLeft(checkInState.timeLeftMs);
    }
  }, [checkInState?.timeLeftMs]);

  useEffect(() => {
    if (!isCheckInOpen) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          refreshCheckIn();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isCheckInOpen, refreshCheckIn]);

  // Format mili-giây thành HH:MM:SS
  const formatCountdown = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Kích hoạt pháo hoa hạt ăn mừng
  const triggerCelebration = () => {
    const colors = ['#F59E0B', '#7C5CFC', '#10B981', '#EC4899', '#3B82F6', '#FBBF24'];
    const newParticles = Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 320,
      y: (Math.random() - 0.5) * 320,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 3500);
  };

  // Xử lý bấm Điểm Danh Nhận Quà
  const handleClaim = async () => {
    if (!user) {
      setIsCheckInOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    if (!canCheckIn || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessData({
          reward: data.reward,
          newStreak: data.newStreak,
          isDay7Jackpot: data.isDay7Jackpot,
          message: data.message,
        });
        triggerCelebration();
        await refreshCheckIn();
      } else {
        alert(data.message || 'Không thể điểm danh lúc này');
        await refreshCheckIn();
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi mạng khi điểm danh');
    } finally {
      setLoading(false);
    }
  };

  if (!isCheckInOpen) return null;

  // Xác định ngày hiện tại cần highlight
  // Nếu đã nhận hôm nay: streak là số ngày đã nhận.
  // Nếu chưa nhận hôm nay: ngày sắp nhận là streak + 1 (tối đa ngày 7).
  const currentClaimDay = canCheckIn ? Math.min(7, streak + 1) : Math.min(7, streak);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Pháo hoa hạt chúc mừng */}
      {particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full animate-ping"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                transform: `translate(${p.x}px, ${p.y}px)`,
                transition: 'all 1.5s ease-out',
              }}
            />
          ))}
        </div>
      )}

      <div 
        className="relative w-full max-w-lg bg-[#111116] border border-[#272733] rounded-2xl shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          onClick={() => {
            setIsCheckInOpen(false);
            setSuccessData(null);
          }}
          className="absolute right-3.5 top-3.5 p-1.5 text-[#71717A] hover:text-white bg-[#181822] hover:bg-[#252533] rounded-full transition z-10"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Banner Header */}
        <div className="relative px-5 pt-6 pb-4 bg-gradient-to-b from-[#7C5CFC]/20 via-[#181824] to-[#111116] border-b border-[#1E1E28] text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-[11px] font-bold text-amber-300 mb-2">
            <Gift className="w-3.5 h-3.5" />
            <span>CHUỖI ĐIỂM DANH 7 NGÀY</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>Tích Điểm Nhận Cà Phê</span>
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </h2>

          <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm mx-auto">
            Điểm danh 7 ngày liên tiếp để nhận trọn <span className="font-bold text-amber-300">15 Điểm Tri Ân</span> (= 1 Ly Cà Phê 10.000đ mở đọc truyện thả ga)!
          </p>

          {/* Thanh đo Chuỗi Liên Tiếp */}
          <div className="mt-4 px-3 py-2 bg-[#0C0C10]/80 border border-[#22222E] rounded-xl flex items-center justify-between gap-3 max-w-sm mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-[#71717A] uppercase font-bold tracking-wider">Chuỗi Liên Tiếp</div>
                <div className="text-sm font-black text-white flex items-center gap-1">
                  <span>{streak} / 7 Ngày</span>
                  {streak >= 7 && <span className="text-[10px] text-amber-400 font-normal">(Hoàn tất 👑)</span>}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex-1 max-w-[120px]">
              <div className="w-full bg-[#1C1C26] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((streak / 7) * 100))}%` }}
                />
              </div>
              <div className="text-[9px] text-[#71717A] text-right mt-0.5">
                {7 - Math.min(7, streak)} ngày nữa tới Rương
              </div>
            </div>
          </div>
        </div>

        {/* Thông báo chúc mừng khi vừa nhận quà */}
        {successData && (
          <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-emerald-950/80 to-amber-950/60 border border-emerald-500/40 rounded-xl text-center animate-bounce">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-sm">
              <PartyPopper className="w-4 h-4 text-amber-400" />
              <span>+{successData.reward} Điểm Tri Ân Đã Cộng Vào Ví!</span>
            </div>
            <p className="text-xs text-[#E4E4E7] mt-0.5">{successData.message}</p>
          </div>
        )}

        {/* Bảng Lưới 7 Ngày */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 mb-2">
            {/* 6 ngày đầu */}
            {rewards.slice(0, 6).map((coin, index) => {
              const dayNum = index + 1;
              const isClaimed = canCheckIn ? dayNum <= streak : dayNum <= streak;
              const isToday = canCheckIn ? dayNum === streak + 1 : false;
              const isLocked = !isClaimed && !isToday;

              return (
                <div
                  key={dayNum}
                  className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition select-none ${
                    isClaimed
                      ? 'bg-[#12161A] border-emerald-500/30 text-emerald-400 shadow-sm'
                      : isToday
                      ? 'bg-gradient-to-b from-amber-500/15 to-[#1A1824] border-amber-500/60 ring-2 ring-amber-500/30 text-white animate-pulse'
                      : 'bg-[#14141B] border-[#22222E] text-[#71717A] opacity-80'
                  }`}
                >
                  {/* Tag trạng thái */}
                  <div className="text-[10px] font-bold tracking-tight mb-1">
                    Ngày {dayNum}
                  </div>

                  {/* Icon quà */}
                  <div className="my-1">
                    {isClaimed ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-amber-500/20 text-amber-400' : 'bg-[#1C1C26] text-[#52525B]'
                      }`}>
                        <Coins className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Số xu thưởng */}
                  <div className={`text-xs font-black ${
                    isClaimed ? 'text-emerald-400' : isToday ? 'text-amber-300' : 'text-[#A1A1AA]'
                  }`}>
                    +{coin} đ
                  </div>

                  {/* Nhãn dưới */}
                  <div className="text-[9px] mt-1">
                    {isClaimed ? (
                      <span className="text-emerald-400 font-semibold">Đã nhận</span>
                    ) : isToday ? (
                      <span className="text-amber-400 font-bold">Hôm nay</span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[#52525B]">
                        <Lock className="w-2.5 h-2.5" /> Chờ
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Ngày 7: Rương Hoàng Gia (chiếm 2 ô) */}
            {(() => {
              const dayNum = 7;
              const coin = rewards[6] || 5;
              const isClaimed = canCheckIn ? dayNum <= streak : dayNum <= streak;
              const isToday = canCheckIn ? dayNum === streak + 1 : false;

              return (
                <div
                  className={`col-span-2 relative p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition select-none ${
                    isClaimed
                      ? 'bg-[#12161A] border-emerald-500/30 text-emerald-400 shadow-sm'
                      : isToday
                      ? 'bg-gradient-to-br from-amber-500/25 via-[#221A30] to-[#161424] border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20 animate-pulse'
                      : 'bg-gradient-to-br from-[#1C1726] to-[#14141B] border-amber-500/30 text-[#A1A1AA]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full px-1">
                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" /> Ngày 7
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                      Rương Vàng
                    </span>
                  </div>

                  <div className="flex items-center gap-2 my-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-black flex items-center justify-center shadow-md">
                      🎁
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-black text-amber-300">+{coin} Điểm</div>
                      <div className="text-[9px] text-amber-200/80 font-medium">Jackpot Hoàng Gia</div>
                    </div>
                  </div>

                  <div className="text-[9px] font-semibold">
                    {isClaimed ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Đã mở rương
                      </span>
                    ) : isToday ? (
                      <span className="text-amber-300 font-bold">✨ Sẵn sàng mở!</span>
                    ) : (
                      <span className="text-[#71717A]">Chờ ngày thứ 7</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Khu vực Nút Bấm Hành Động */}
          <div className="mt-4 pt-3 border-t border-[#1E1E28]">
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  setIsCheckInOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-[#7C5CFC] to-[#6344E8] hover:from-[#6D4CF0] hover:to-[#5535D8] text-white font-bold text-sm rounded-xl transition shadow-lg shadow-[#7C5CFC]/25 flex items-center justify-center gap-2 active:scale-98"
              >
                <span>🔑 Đăng Nhập / Tạo Tài Khoản Để Nhận Quà</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : canCheckIn ? (
              <button
                type="button"
                onClick={handleClaim}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>
                      {currentClaimDay === 7
                        ? '👑 MỞ RƯƠNG HOÀNG GIA NGAY (+5 ĐIỂM)'
                        : `✨ ĐIỂM DANH NGÀY ${currentClaimDay} (+${rewards[Math.min(5, currentClaimDay - 1)]} ĐIỂM)`}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 bg-[#181822] border border-[#272736] text-[#71717A] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Hôm nay bạn đã điểm danh thành công!</span>
                </button>

                <div className="text-center text-[11px] text-[#A1A1AA] flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quà ngày mai sẽ mở sau:</span>
                  <span className="font-mono font-bold text-amber-300 text-xs bg-[#1A1824] px-2 py-0.5 rounded border border-[#2B263D]">
                    {formatCountdown(timeLeft)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Lời khuyên động viên */}
          <div className="mt-3 p-2.5 bg-[#0C0C10] border border-[#1E1E26] rounded-xl text-[11px] text-[#71717A] leading-relaxed">
            <span className="font-bold text-[#A1A1AA]">💡 Mẹo nhỏ:</span> Điểm danh đều đặn mỗi ngày không ngắt quãng để nhận đủ 15 Điểm và mở Rương Hoàng Gia vào Ngày 7. Nếu lỡ quên 1 ngày, chuỗi sẽ quay về Ngày 1 nhé!
          </div>
        </div>
      </div>
    </div>
  );
}
