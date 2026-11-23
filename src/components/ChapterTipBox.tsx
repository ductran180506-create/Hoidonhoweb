'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Coffee, Heart, Sparkles, Send, Loader2, QrCode, Coins, CheckCircle2, Lock, Gift } from 'lucide-react';

interface ChapterTipBoxProps {
  storyId: string;
  storyTitle?: string;
  chapterIndex: number;
  chapterTitle?: string;
  onTipSuccess?: () => void;
}

interface TipItem {
  id: string;
  userName: string;
  userAvatar?: string;
  amountCoins: number;
  message?: string;
  isPrivate?: boolean;
  createdAt: string;
}

const PRESET_TIPS = [
  { coins: 2, label: 'Trà đá vỉa hè', icon: '🍵' },
  { coins: 5, label: 'Ly cà phê đen', icon: '☕' },
  { coins: 10, label: 'Cà phê sữa đá', icon: '🧋' },
];

export default function ChapterTipBox({
  storyId,
  storyTitle,
  chapterIndex,
  chapterTitle,
  onTipSuccess,
}: ChapterTipBoxProps) {
  const { user, balance, refreshBalance, setIsRechargeOpen, setIsAuthModalOpen } = useAuth();
  const [selectedCoins, setSelectedCoins] = useState<number>(5);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<string>('20');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [recentTips, setRecentTips] = useState<TipItem[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const effectiveCoins = isCustomMode ? (Math.max(1, parseInt(customAmount, 10) || 0)) : selectedCoins;

  useEffect(() => {
    fetchRecentTips();
  }, [storyId, chapterIndex]);

  const fetchRecentTips = async () => {
    try {
      const res = await fetch(`/api/tip?storyId=${storyId}&chapterIndex=${chapterIndex}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tips)) {
        setRecentTips(data.tips.slice(0, 6));
      }
    } catch (e) {}
  };

  const handleSendTip = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (effectiveCoins <= 0) {
      alert('Vui lòng nhập số điểm hợp lệ (tối thiểu 1 Điểm)');
      return;
    }

    if (balance < effectiveCoins) {
      setIsRechargeOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          storyId,
          chapterIndex,
          amountCoins: effectiveCoins,
          message,
          isPrivate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessToast(
          isPrivate
            ? `🎉 Cảm ơn bạn đã tặng riêng tác giả ${effectiveCoins} Điểm và gửi lời nhắn bí mật! 🔒❤️`
            : `🎉 ${data.message || `Cảm ơn bạn đã mời tác giả ${effectiveCoins} Điểm!`}`
        );
        setMessage('');
        refreshBalance();
        fetchRecentTips();
        if (onTipSuccess) onTipSuccess();
        setTimeout(() => setSuccessToast(null), 4500);
      } else {
        if (data.needCoins) {
          setIsRechargeOpen(true);
        } else {
          alert(data.message || 'Lỗi gửi tặng cà phê');
        }
      }
    } catch (e) {
      alert('Không thể gửi tặng cà phê. Vui lòng thử lại sau.');
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-gradient-to-b from-[#161622] via-[#111118] to-[#0D0D12] border border-amber-500/25 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-4">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#222230] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center text-lg shadow-md flex-shrink-0">
            ☕
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5 flex-wrap">
              <span>Mời Cà Phê Tác Giả @carrot.tia</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                Tiếp Lửa Sáng Tác
              </span>
            </h3>
            <p className="text-[11px] text-[#A1A1AA] mt-0.5">
              Thấy tập truyện này cuốn chứ? Mời tác giả một ly cà phê để có sức vẽ tiếp nha!
            </p>
          </div>
        </div>

        {/* Ví người dùng */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs bg-[#0E0E14] px-2.5 py-1 rounded-lg border border-[#242434]">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[#A1A1AA]">Ví của bạn:</span>
          <strong className="text-white font-mono">{balance} Điểm</strong>
        </div>
      </div>

      {/* Thông báo thành công */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Các lựa chọn tặng nhanh */}
      <div className="space-y-2">
        <div className="text-[11px] text-[#A1A1AA] font-medium flex items-center justify-between">
          <span>Chọn mức ủng hộ:</span>
          <span className="text-amber-400/90 text-[10px]">Tự động trừ từ ví điểm của bạn</span>
        </div>

        {/* 4 Khung chọn mức: 3 mức có sẵn + 1 mức Tặng Riêng (Tùy chọn) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_TIPS.map((preset) => {
            const isSelected = !isCustomMode && selectedCoins === preset.coins;
            return (
              <button
                key={preset.coins}
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedCoins(preset.coins);
                }}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-500/20 to-orange-500/20 text-white border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-[#14141C] border-[#222230] text-[#A1A1AA] hover:text-white hover:border-[#333346]'
                }`}
              >
                <span className="text-xl">{preset.icon}</span>
                <span className="font-bold text-xs font-mono text-amber-300">
                  {preset.coins} Điểm
                </span>
                <span className="text-[10px] text-[#71717A] leading-tight truncate w-full">
                  {preset.label}
                </span>
              </button>
            );
          })}

          {/* Ô thứ 4: Tặng Riêng / Tự nhập số điểm */}
          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
              isCustomMode
                ? 'bg-gradient-to-b from-amber-500/25 to-orange-500/25 text-white border-amber-400 shadow-lg shadow-amber-500/15'
                : 'bg-[#14141C] border-[#222230] text-[#A1A1AA] hover:text-white hover:border-[#333346]'
            }`}
          >
            <span className="text-xl">🎁</span>
            <span className="font-bold text-xs font-mono text-amber-300">
              Tặng Riêng
            </span>
            <span className="text-[10px] text-[#71717A] leading-tight truncate w-full">
              {isCustomMode && effectiveCoins > 0 ? `${effectiveCoins} Điểm` : 'Tùy chọn số điểm'}
            </span>
          </button>
        </div>

        {/* Khung nhập số điểm tùy chọn khi chọn Tặng Riêng */}
        {isCustomMode && (
          <div className="p-3 bg-[#0E0E16] border border-amber-500/40 rounded-xl space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Nhập số Điểm muốn tặng riêng:</span>
              </span>
              <span className="text-[11px] text-[#71717A]">Tối thiểu 1 Điểm</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Nhập số điểm (vd: 15, 20, 50, 100)..."
                  className="w-full bg-[#14141E] border border-[#2B2B3D] focus:border-amber-400 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-[#52525B] outline-none transition"
                />
                <span className="absolute right-3 top-2.5 text-xs text-amber-300 font-semibold pointer-events-none">
                  Điểm
                </span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                {[15, 20, 50, 100].map((quickVal) => (
                  <button
                    key={quickVal}
                    type="button"
                    onClick={() => setCustomAmount(quickVal.toString())}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition active:scale-95 ${
                      customAmount === quickVal.toString()
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-[#181824] hover:bg-[#222234] text-[#A1A1AA] hover:text-white border border-[#282838]'
                    }`}
                  >
                    +{quickVal}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ô nhập lời nhắn gửi gắm */}
      <div className="space-y-2">
        <input
          type="text"
          maxLength={120}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isPrivate ? "Nhập lời nhắn gửi riêng tác giả (chỉ tác giả thấy trong Quản Trị)..." : "Nhập lời nhắn gửi tác giả (vd: Tập này cười xỉu tác giả ơi...)"}
          className={`w-full bg-[#0E0E14] border focus:border-amber-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition ${
            isPrivate ? 'border-amber-500/40 bg-amber-500/5' : 'border-[#222230]'
          }`}
        />

        {/* Checkbox Tặng riêng tư cho tác giả */}
        <div className="flex items-center justify-between gap-2 px-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#A1A1AA] hover:text-[#E4E4E7] transition">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500 bg-[#0E0E14] border-[#2B2B3D] cursor-pointer"
            />
            <span className="flex items-center gap-1 font-medium">
              <Lock className={`w-3.5 h-3.5 ${isPrivate ? 'text-amber-400' : 'text-[#71717A]'}`} />
              <span>Gửi lời nhắn riêng tư (Chỉ tác giả thấy trong Quản Trị)</span>
            </span>
          </label>
          {isPrivate && (
            <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full hidden sm:inline">
              Không hiện công khai lên bình luận
            </span>
          )}
        </div>
      </div>

      {/* Hàng nút bấm Hành Động */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
        {/* Nút 1: Tặng bằng điểm ví */}
        <button
          type="button"
          onClick={handleSendTip}
          disabled={submitting || effectiveCoins <= 0}
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang gửi tặng...</span>
            </>
          ) : (
            <>
              {isPrivate ? <Lock className="w-4 h-4" /> : <Coffee className="w-4 h-4 fill-slate-950" />}
              <span>
                {isPrivate ? 'Gửi Tặng Riêng' : 'Gửi Tặng'}{' '}
                {effectiveCoins > 0 ? `${effectiveCoins} Điểm Cà Phê` : 'Cà Phê'}
              </span>
            </>
          )}
        </button>

        {/* Nút 2: Quét mã QR chuyển khoản trực tiếp */}
        <button
          type="button"
          onClick={() => setIsRechargeOpen(true)}
          className="px-3.5 py-2.5 rounded-xl bg-[#181824] hover:bg-[#202030] text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer flex-shrink-0"
          title="Bấm để quét mã QR chuyển khoản trực tiếp qua Ngân hàng / Momo"
        >
          <QrCode className="w-3.5 h-3.5 text-amber-400" />
          <span>Quét QR Mời Cà Phê (10k / 20k)</span>
        </button>
      </div>

      {/* Dải Bảng Vàng Tri Ân người vừa mời cà phê gần đây */}
      {recentTips.length > 0 && (
        <div className="pt-2 border-t border-[#1E1E28]/70 space-y-1.5">
          <div className="text-[10px] text-[#71717A] font-semibold flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
            <span>Độc giả vừa mời cà phê tập này:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
            {recentTips.map((tip) => (
              <div
                key={tip.id}
                className="inline-flex items-center gap-1.5 bg-[#0A0A0E] px-2.5 py-1 rounded-full border border-[#20202E] text-[10px] text-[#A1A1AA] flex-shrink-0"
              >
                <span className="font-semibold text-white">{tip.userName}</span>
                <span className="text-amber-400 font-bold font-mono">+{tip.amountCoins}đ</span>
                {tip.isPrivate ? (
                  <span className="text-amber-400/80 flex items-center gap-0.5 text-[9px] bg-amber-500/10 px-1.5 py-0.2 rounded">
                    <Lock className="w-2.5 h-2.5" /> Tặng riêng
                  </span>
                ) : tip.message ? (
                  <span className="text-[#71717A] truncate max-w-[120px]">
                    "{tip.message}"
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
