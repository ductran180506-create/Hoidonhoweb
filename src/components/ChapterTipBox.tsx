'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Coffee, Heart, Sparkles, Loader2, QrCode, 
  CheckCircle2, Lock, Copy, Check, X, Smartphone, Clock, ArrowRight, ShieldCheck 
} from 'lucide-react';

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
  amountVnd?: number;
  amountCoins?: number;
  message?: string;
  isPrivate?: boolean;
  createdAt: string;
}

const PRESET_VND = [
  { amount: 10000, label: 'Ly Cà Phê Đá', icon: '☕' },
  { amount: 20000, label: 'Ly Cà Phê Sữa', icon: '🧋' },
  { amount: 50000, label: 'Cà Phê + Bữa Sáng', icon: '🍰' },
];

export default function ChapterTipBox({
  storyId,
  storyTitle,
  chapterIndex,
  chapterTitle,
  onTipSuccess,
}: ChapterTipBoxProps) {
  const { user, refreshBalance, setIsAuthModalOpen } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(10000);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customVnd, setCustomVnd] = useState<string>('30000');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [donorName, setDonorName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [recentTips, setRecentTips] = useState<TipItem[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal QR chuyển khoản tiền thật
  const [qrModalOrder, setQrModalOrder] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 phút

  const effectiveAmount = isCustomMode 
    ? Math.max(5000, parseInt(customVnd.replace(/\D/g, ''), 10) || 10000) 
    : selectedAmount;

  useEffect(() => {
    fetchRecentTips();
  }, [storyId, chapterIndex]);

  const fetchRecentTips = async () => {
    try {
      const res = await fetch(`/api/tip?storyId=${storyId}&chapterIndex=${chapterIndex}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tips)) {
        setRecentTips(data.tips.slice(0, 8));
      }
    } catch (e) {}
  };

  // Tạo đơn mời cà phê bằng tiền thật (VND)
  const handleOpenQrModal = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setSubmitting(true);
    const effectiveUserId = user.id;

    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          packageType: 'TIP_COFFEE',
          customAmount: effectiveAmount,
          tipDetails: {
            storyId,
            chapterIndex,
            message: message.trim() || undefined,
            isPrivate: Boolean(isPrivate),
            donorName: donorName.trim() || user?.name || undefined,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        setQrModalOrder(data.order);
        setIsSuccess(false);
        setTimeLeft(600);
      } else {
        alert(data.message || 'Không thể tạo mã QR. Vui lòng thử lại sau.');
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ thanh toán');
    }
    setSubmitting(false);
  };

  // Đếm ngược 10 phút hiển thị
  useEffect(() => {
    if (!qrModalOrder || isSuccess) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrModalOrder, isSuccess]);

  // Polling kiểm tra tiền về tài khoản Sacombank thực tế
  useEffect(() => {
    if (!qrModalOrder || isSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/check-order?orderCode=${qrModalOrder.orderCode}`);
        const data = await res.json();

        if (data.success && data.completed) {
          setIsSuccess(true);
          setSuccessToast(`🎉 Cảm ơn bạn đã mời tác giả ${effectiveAmount.toLocaleString('vi-VN')}đ tiền cà phê! ❤️`);
          fetchRecentTips();
          refreshBalance();
          if (onTipSuccess) onTipSuccess();
          setTimeout(() => {
            setQrModalOrder(null);
            setIsSuccess(false);
          }, 3500);
        }
      } catch (e) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [qrModalOrder, isSuccess, effectiveAmount]);

  const handleCopy = (text: string, field: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {}
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-b from-amber-50/70 via-white to-amber-50/40 dark:from-[#181524] dark:via-[#12111A] dark:to-[#0D0D12] border border-amber-300 dark:border-amber-500/35 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden space-y-4">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-amber-200/80 dark:border-[#252336] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center text-xl shadow-lg shadow-amber-500/20 flex-shrink-0">
            ☕
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <span>Mời Cà Phê Tác Giả @carrot.tia</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-semibold flex items-center gap-1">
                <span>Chuyển Khoản Trực Tiếp</span>
              </span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-[#A1A1AA] mt-0.5">
              Ủng hộ tác giả ly cà phê để có thêm động lực vẽ các tập tiếp theo nhé!
            </p>
          </div>
        </div>

        {/* Huy hiệu tài khoản nhận */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs bg-white dark:bg-[#0F0E17] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#2B2840] text-slate-800 dark:text-[#D4D4D8] shadow-xs">
          <span className="text-amber-700 dark:text-amber-400 font-bold font-mono">Sacombank</span>
          <span className="text-slate-400 dark:text-[#71717A]">•</span>
          <span className="font-mono text-slate-900 dark:text-white text-[11px] font-bold">040121635056</span>
        </div>
      </div>

      {/* Thông báo thành công */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Các lựa chọn mức tiền thật (VND) */}
      <div className="space-y-2">
        <div className="text-[11px] text-slate-600 dark:text-[#A1A1AA] font-medium flex items-center justify-between">
          <span>Chọn mức mời cà phê (Tiền thật):</span>
          <span className="text-amber-700 dark:text-amber-400 text-[10px] font-bold">Quét mã QR Ngân Hàng / Momo</span>
        </div>

        {/* 4 Khung chọn mức tiền: 10k, 20k, 50k, Tặng Riêng */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_VND.map((preset) => {
            const isSelected = !isCustomMode && selectedAmount === preset.amount;
            return (
              <button
                key={preset.amount}
                type="button"
                onClick={() => {
                  setIsCustomMode(false);
                  setSelectedAmount(preset.amount);
                }}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-amber-100 border-2 border-amber-500 text-amber-950 font-bold shadow-md ring-1 ring-amber-400 dark:bg-gradient-to-b dark:from-amber-500/25 dark:to-orange-500/25 dark:text-white dark:border-amber-400'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-[#151322] dark:border-[#252336] dark:text-[#A1A1AA] dark:hover:text-white dark:hover:border-[#383550]'
                }`}
              >
                <span className="text-xl">{preset.icon}</span>
                <span className="font-bold text-xs sm:text-sm font-mono text-amber-700 dark:text-amber-300">
                  {preset.amount.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#71717A] leading-tight truncate w-full font-medium">
                  {preset.label}
                </span>
              </button>
            );
          })}

          {/* Ô thứ 4: Tặng Riêng (Tự nhập số tiền VND) */}
          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
              isCustomMode
                ? 'bg-amber-100 border-2 border-amber-500 text-amber-950 font-bold shadow-md ring-1 ring-amber-400 dark:bg-gradient-to-b dark:from-amber-500/25 dark:to-orange-500/25 dark:text-white dark:border-amber-400'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-[#151322] dark:border-[#252336] dark:text-[#A1A1AA] dark:hover:text-white dark:hover:border-[#383550]'
            }`}
          >
            <span className="text-xl">🎁</span>
            <span className="font-bold text-xs sm:text-sm font-mono text-amber-700 dark:text-amber-300">
              {isCustomMode && effectiveAmount > 0 ? `${effectiveAmount.toLocaleString('vi-VN')}đ` : 'Tặng Riêng'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-[#71717A] leading-tight truncate w-full font-medium">
              {isCustomMode ? 'Số tiền tùy chọn' : 'Tự nhập số tiền'}
            </span>
          </button>
        </div>

        {/* Khung nhập số tiền tùy chọn khi chọn Tặng Riêng */}
        {isCustomMode && (
          <div className="p-3 bg-white dark:bg-[#0E0D17] border border-amber-400 dark:border-amber-500/40 rounded-xl space-y-2 animate-fadeIn shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Nhập số tiền muốn tặng riêng cho tác giả:</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#71717A]">Tối thiểu 5.000 đ</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customVnd}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setCustomVnd(clean);
                  }}
                  placeholder="Nhập số tiền (vd: 30000, 100000, 200000)..."
                  className="w-full bg-slate-50 dark:bg-[#161426] border border-slate-300 dark:border-[#2B2842] focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-[#52525B] outline-none transition"
                />
                <span className="absolute right-3 top-2.5 text-xs text-amber-700 dark:text-amber-300 font-bold pointer-events-none">
                  VND
                </span>
              </div>
              <div className="flex items-center gap-1.5 justify-end flex-wrap">
                {[15000, 30000, 100000, 200000].map((quickVal) => (
                  <button
                    key={quickVal}
                    type="button"
                    onClick={() => setCustomVnd(quickVal.toString())}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition active:scale-95 ${
                      customVnd === quickVal.toString()
                        ? 'bg-amber-500 text-white font-bold shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-[#1C1A2E] dark:hover:bg-[#25223E] dark:text-[#A1A1AA] dark:hover:text-white dark:border-[#2D2A4A]'
                    }`}
                  >
                    {quickVal.toLocaleString('vi-VN')}đ
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ô nhập lời nhắn gửi gắm */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          {!user && (
            <input
              type="text"
              maxLength={30}
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Tên của bạn (vd: Bạn Đọc Ẩn Danh)"
              className="sm:w-44 bg-white dark:bg-[#0F0E17] border border-slate-300 dark:border-[#252336] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717A] outline-none shadow-xs"
            />
          )}
          <input
            type="text"
            maxLength={120}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isPrivate ? "Nhập lời nhắn gửi riêng tác giả (chỉ tác giả thấy trong Quản Trị)..." : "Nhập lời nhắn gửi tác giả (vd: Tập này cuốn xỉu tác giả ơi...)"}
            className={`flex-1 bg-white dark:bg-[#0F0E17] border focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717A] outline-none transition shadow-xs ${
              isPrivate ? 'border-amber-400 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/5' : 'border-slate-300 dark:border-[#252336]'
            }`}
          />
        </div>

        {/* Checkbox Tặng riêng tư cho tác giả */}
        <div className="flex items-center justify-between gap-2 px-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#E4E4E7] transition">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500 bg-white border-slate-300 dark:bg-[#0E0E14] dark:border-[#2B2B3D] cursor-pointer"
            />
            <span className="flex items-center gap-1 font-medium">
              <Lock className={`w-3.5 h-3.5 ${isPrivate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-[#71717A]'}`} />
              <span>Gửi lời nhắn riêng tư (Chỉ tác giả thấy trong Quản Trị)</span>
            </span>
          </label>
          {isPrivate && (
            <span className="text-[10px] text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 rounded-full hidden sm:inline font-semibold">
              Không hiện công khai lên bình luận
            </span>
          )}
        </div>
      </div>

      {/* Nút bấm Tạo mã QR Chuyển Tiền Thật */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={handleOpenQrModal}
          disabled={submitting || effectiveAmount <= 0}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg active:scale-98 transition disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Đang tạo mã VietQR...</span>
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4 text-white" />
              <span>Quét QR Mời Cà Phê {effectiveAmount.toLocaleString('vi-VN')} đ</span>
            </>
          )}
        </button>
      </div>

      {/* Dải Bảng Vàng Tri Ân người vừa mời cà phê bằng tiền thật */}
      {recentTips.length > 0 && (
        <div className="pt-2 border-t border-amber-200/80 dark:border-[#252336]/70 space-y-1.5">
          <div className="text-[10px] text-slate-600 dark:text-[#71717A] font-semibold flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            <span>Độc giả vừa mời cà phê tập này:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
            {recentTips.map((tip) => (
              <div
                key={tip.id}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-[#0D0C14] px-2.5 py-1 rounded-full border border-slate-200 dark:border-[#252336] text-[10px] text-slate-700 dark:text-[#A1A1AA] flex-shrink-0 shadow-xs"
              >
                <span className="font-bold text-slate-900 dark:text-white">{tip.userName}</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold font-mono">
                  +{tip.amountVnd ? `${tip.amountVnd.toLocaleString('vi-VN')}đ` : `${(tip.amountCoins || 5) * 2000}đ`}
                </span>
                {tip.isPrivate ? (
                  <span className="text-amber-800 dark:text-amber-400/80 flex items-center gap-0.5 text-[9px] bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0.2 rounded font-medium">
                    <Lock className="w-2.5 h-2.5" /> Tặng riêng
                  </span>
                ) : tip.message ? (
                  <span className="text-slate-500 dark:text-[#71717A] truncate max-w-[120px]">
                    "{tip.message}"
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* POPUP MÃ VIETQR CHUYỂN KHOẢN TIỀN THẬT TRỰC TIẾP          */}
      {/* ======================================================== */}
      {qrModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#12111A] border border-amber-400 dark:border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 text-slate-900 dark:text-white max-h-[95vh] overflow-y-auto no-scrollbar animate-scaleUp">
            
            {/* Nút đóng */}
            <button
              onClick={() => setQrModalOrder(null)}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:text-[#71717A] dark:hover:text-white dark:hover:bg-[#1E1C2C] rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Modal */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-xl">
                ☕
              </div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Mời Cà Phê Tác Giả @carrot.tia
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-[#A1A1AA]">
                Mở app ngân hàng bất kỳ hoặc Momo để quét mã QR bên dưới
              </p>
            </div>

            {/* Trạng thái thành công */}
            {isSuccess ? (
              <div className="py-8 text-center space-y-2 animate-fadeIn">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/50 flex items-center justify-center text-3xl">
                  🎉
                </div>
                <h5 className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                  Đã Nhận Được Tiền Cà Phê!
                </h5>
                <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
                  Tác giả @carrot.tia chân thành cảm ơn tấm lòng ủng hộ của bạn! ❤️
                </p>
              </div>
            ) : (
              <>
                {/* Ảnh VietQR chuẩn Sacombank */}
                <div className="bg-white p-3 rounded-2xl shadow-lg mx-auto w-fit border-2 border-amber-400 relative group">
                  <img
                    src={qrModalOrder.qrUrl}
                    alt="Mã VietQR Mời Cà Phê"
                    className="w-52 h-52 sm:w-56 sm:h-56 object-contain mx-auto"
                  />
                  <div className="absolute inset-x-0 bottom-1.5 text-center">
                    <span className="text-[9px] font-bold text-slate-900 bg-amber-300 px-2 py-0.5 rounded-full shadow">
                      Quét tự động điền STK & Số tiền
                    </span>
                  </div>
                </div>

                {/* Đồng hồ đếm ngược */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-mono bg-amber-100 dark:bg-amber-500/10 py-1 px-3 rounded-full border border-amber-300 dark:border-amber-500/20 w-fit mx-auto font-semibold">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Mã QR có hiệu lực: <strong>{formatCountdown(timeLeft)}</strong></span>
                </div>

                {/* Thông tin chuyển khoản chi tiết kèm nút Copy */}
                <div className="bg-slate-50 dark:bg-[#181624] border border-slate-200 dark:border-[#29263C] rounded-xl p-3 space-y-2 text-xs font-mono">
                  {/* Ngân hàng */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-[#71717A]">Ngân hàng:</span>
                    <span className="font-bold text-slate-900 dark:text-white">Sacombank</span>
                  </div>

                  {/* Số tài khoản */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-[#71717A]">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-700 dark:text-amber-300 font-mono">040121635056</span>
                      <button
                        onClick={() => handleCopy('040121635056', 'acc')}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-[#252238] rounded text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-white transition"
                        title="Copy STK"
                      >
                        {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Chủ tài khoản */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-[#71717A]">Chủ tài khoản:</span>
                    <span className="font-bold text-slate-900 dark:text-white">TRAN CONG DUC</span>
                  </div>

                  {/* Số tiền */}
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-[#242136] pt-1.5">
                    <span className="text-slate-500 dark:text-[#71717A]">Số tiền:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        {qrModalOrder.amountVnd.toLocaleString('vi-VN')} đ
                      </span>
                      <button
                        onClick={() => handleCopy(qrModalOrder.amountVnd.toString(), 'amount')}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-[#252238] rounded text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-white transition"
                        title="Copy số tiền"
                      >
                        {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Nội dung chuyển khoản */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-[#71717A]">Nội dung CK:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/30">
                        {qrModalOrder.orderCode}
                      </span>
                      <button
                        onClick={() => handleCopy(qrModalOrder.orderCode, 'code')}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-[#252238] rounded text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-white transition"
                        title="Copy mã đơn"
                      >
                        {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hướng dẫn và trạng thái tự động đối soát */}
                <div className="text-center text-[10px] text-slate-500 dark:text-[#71717A] flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Hệ thống tự động xác nhận sau 2-3 giây khi tiền vào tài khoản</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
