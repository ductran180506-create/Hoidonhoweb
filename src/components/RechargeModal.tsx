'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, Check, Loader2, Copy, QrCode, Download, Smartphone, ArrowRight, ShieldCheck, Clock, AlertCircle, RefreshCw, Crown } from 'lucide-react';
import { formatVipTimeRemaining } from '@/lib/vip-utils';

interface OrderResponse {
  id: string;
  orderCode: string;
  amountVnd: number;
  packageType: string;
  packageName: string;
  coinsReceived: number;
  vipDaysReceived: number;
  qrUrl: string;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  displayExpiresAt?: string;
  bankInfo?: {
    bankId: string;
    accountNo: string;
    accountName: string;
  };
}

export default function RechargeModal() {
  const { isRechargeOpen, setIsRechargeOpen, user, setIsAuthModalOpen, refreshBalance, loginWithGoogle, pendingOrder, setPendingOrder, balance } = useAuth();
  const [selectedPkg, setSelectedPkg] = useState<'COIN_10K' | 'COIN_20K' | 'COIN_50K' | 'VIP_39K'>('COIN_10K');
  const [loading, setLoading] = useState(false);
  const [exchangingVip, setExchangingVip] = useState(false);
  const [exchangeMsg, setExchangeMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 phút đếm ngược hiển thị (600s)

  const handleExchangeVip = async () => {
    if (!user) {
      loginWithGoogle();
      return;
    }
    if (balance < 40) {
      setExchangeMsg({ success: false, text: `Số dư hiện tại (${balance} Điểm) chưa đủ 40 Điểm để đổi VIP!` });
      setTimeout(() => setExchangeMsg(null), 4000);
      return;
    }

    try {
      setExchangingVip(true);
      setExchangeMsg(null);
      const res = await fetch('/api/wallet/exchange-vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setExchangeMsg({ success: true, text: data.message || 'Chúc mừng bạn đã kích hoạt 7 Ngày VIP thành công!' });
        await refreshBalance();
      } else {
        setExchangeMsg({ success: false, text: data.message || 'Lỗi khi đổi điểm VIP' });
      }
    } catch (e: any) {
      setExchangeMsg({ success: false, text: e.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setExchangingVip(false);
    }
  };

  // Chỉ mở đơn hàng cụ thể khi người dùng bấm vào đơn chờ trong Lịch Sử
  useEffect(() => {
    if (isRechargeOpen) {
      if (pendingOrder) {
        setOrder(pendingOrder);
        setIsProcessing(pendingOrder.status === 'processing');
      } else {
        setOrder(null);
        setIsProcessing(false);
      }
    } else {
      setIsSuccess(false);
      setNotice(null);
    }
  }, [isRechargeOpen, pendingOrder]);

  // Đồng hồ đếm ngược hiển thị 10 phút (tính chính xác theo mốc tạo đơn)
  useEffect(() => {
    if (!order) {
      setTimeLeft(600);
      return;
    }

    const createdTime = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
    const displayTarget = createdTime + 10 * 60 * 1000;
    const initialSec = Math.max(0, Math.ceil((displayTarget - Date.now()) / 1000));
    setTimeLeft(initialSec);

    const timer = setInterval(() => {
      const remainingSec = Math.max(0, Math.ceil((displayTarget - Date.now()) / 1000));
      setTimeLeft(remainingSec);
      if (remainingSec <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order?.orderCode, order?.createdAt]);

  // Polling kiểm tra trạng thái chuyển khoản trong 15 phút thực tế
  useEffect(() => {
    if (!order || isSuccess) return;

    const startPoll = Date.now();
    const MAX_POLL_TIME = 15 * 60 * 1000; // 15 phút thực tế

    const interval = setInterval(async () => {
      if (Date.now() - startPoll > MAX_POLL_TIME) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/payment/check-order?orderCode=${order.orderCode}`);
        const data = await res.json();

        if (data.success && data.completed) {
          setIsSuccess(true);
          setPendingOrder(null);
          try {
            localStorage.removeItem('hdn_pending_order');
          } catch (e) {}
          await refreshBalance();
          clearInterval(interval);
        }
      } catch (e) {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [order, isSuccess]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCancelOrder = () => {
    setOrder(null);
    setPendingOrder(null);
    try {
      localStorage.removeItem('hdn_pending_order');
    } catch (e) {}
  };

  if (!isRechargeOpen) return null;

  const handleCreateOrder = async (pkgType: 'COIN_10K' | 'COIN_20K' | 'COIN_50K' | 'VIP_39K') => {
    if (!user) {
      setIsRechargeOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          packageType: pkgType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        setIsProcessing(false);
        setPendingOrder(data.order);
        try {
          localStorage.setItem('hdn_pending_order', JSON.stringify(data.order));
        } catch (e) {}
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleConfirmTransferred = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      const res = await fetch('/api/payment/confirm-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCode: order.orderCode,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.completed) {
        setIsSuccess(true);
        setIsProcessing(false);
        setPendingOrder(null);
        try {
          localStorage.removeItem('hdn_pending_order');
        } catch (e) {}
        await refreshBalance();
      } else {
        setIsProcessing(true);
        const updated = { ...order, status: 'processing' };
        setOrder(updated);
        setPendingOrder(updated);
        try {
          localStorage.setItem('hdn_pending_order', JSON.stringify(updated));
        } catch (e) {}
      }
    } catch (e) {
      setIsProcessing(true);
    }
    setConfirming(false);
  };

  const copyToClipboard = (text: string, type: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setNotice(`Đã sao chép ${label}!`);
    setTimeout(() => {
      setCopiedType(null);
      setNotice(null);
    }, 2500);
  };

  const handleDownloadQr = async () => {
    if (!order) return;
    const targetQr = `https://img.vietqr.io/image/Sacombank-040121635056-compact.png?amount=${order.amountVnd}&addInfo=${encodeURIComponent(order.orderCode)}&accountName=TRAN%20CONG%20DUC`;
    try {
      const response = await fetch(targetQr);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VietQR-Sacombank-${order.orderCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setNotice('Đã tải mã QR về máy! Hãy mở App Ngân Hàng chọn "Quét từ album".');
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      window.open(targetQr, '_blank');
    }
  };

  const packages = [
    { 
      type: 'COIN_10K', 
      name: '10.000đ', 
      coins: '☕ 1 Ly Cà Phê (10k)', 
      note: 'Nhận 15 Điểm đọc truyện', 
    },
    { 
      type: 'COIN_20K', 
      name: '20.000đ', 
      coins: '🥤 1 Ly Trà Sữa (20k)', 
      note: 'Nhận 25 Điểm đọc truyện', 
    },
    { 
      type: 'COIN_50K', 
      name: '50.000đ', 
      coins: '🍕 Bữa Ăn Sáng (50k)', 
      note: 'Nhận 75 Điểm đọc truyện', 
    },
    { 
      type: 'VIP_39K', 
      name: '39.000đ/tháng', 
      coins: '👑 Gói VIP 30 Ngày', 
      note: 'Đọc full toàn bộ kho truyện + 30 Điểm', 
    },
  ];

  const bankAccount = '040121635056';
  const bankName = 'Sacombank';
  const accountHolder = 'TRAN CONG DUC';
  const qrImageUrl = order
    ? `https://img.vietqr.io/image/Sacombank-040121635056-compact.png?amount=${order.amountVnd}&addInfo=${encodeURIComponent(order.orderCode)}&accountName=TRAN%20CONG%20DUC`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm p-5 bg-[#111116] border border-[#22222B] rounded-xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <button
          onClick={() => setIsRechargeOpen(false)}
          className="absolute top-4 right-4 p-1 text-[#71717A] hover:text-white rounded transition"
        >
          <X className="w-4 h-4" />
        </button>

        {!order ? (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-mono text-[#71717A] uppercase mb-1">VietQR • Tự Động 24/7</div>
              <h3 className="font-semibold text-base text-white">Mời Cà Phê • Ủng Hộ Tác Giả ☕</h3>
              <p className="text-xs text-[#71717A] mt-0.5">
                Ủng hộ kênh ra tiếp tập mới. Hệ thống tự động cộng điểm sau 3s.
              </p>
            </div>

            {!user && (
              <div className="p-3 bg-[#161622] border border-[#7C5CFC]/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-medium">Chưa đăng nhập</span>
                  <span className="text-[10px] text-[#A1A1AA]">Để lưu Điểm vĩnh viễn</span>
                </div>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="w-full py-2 px-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow active:scale-98"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Tiếp tục với tài khoản Google</span>
                </button>
              </div>
            )}

            {/* ĐẶC QUYỀN ĐỔI ĐIỂM: 40 Điểm = 7 Ngày VIP */}
            <div className="p-3 bg-gradient-to-br from-amber-500/15 via-[#181624] to-purple-500/15 border border-amber-500/30 rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>Đổi 40 Điểm = 7 Ngày VIP</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-black font-extrabold uppercase">
                        HOT
                      </span>
                    </div>
                    <div className="text-[10px] text-[#A1A1AA] mt-0.5">
                      {user?.isVip ? `Đang là VIP (Còn ${formatVipTimeRemaining(user.vipUntil)} • Đổi để gia hạn +7 ngày)` : 'Đọc không giới hạn toàn bộ kho truyện trong 7 ngày'}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-amber-300 font-mono">40 Điểm</div>
                  {user && <div className="text-[9px] text-[#71717A]">Ví: {balance}đ</div>}
                </div>
              </div>

              {exchangeMsg && (
                <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${exchangeMsg.success ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-red-950/60 border border-red-500/40 text-red-300'}`}>
                  {exchangeMsg.success ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="text-[11px] leading-tight">{exchangeMsg.text}</span>
                </div>
              )}

              {user ? (
                balance >= 40 ? (
                  <button
                    type="button"
                    onClick={handleExchangeVip}
                    disabled={exchangingVip}
                    className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow active:scale-98"
                  >
                    {exchangingVip ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang kích hoạt VIP...</span>
                      </>
                    ) : (
                      <>
                        <Crown className="w-3.5 h-3.5 text-black" />
                        <span>Đổi Ngay 7 Ngày VIP (Trừ 40 Điểm)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center justify-between text-[11px] bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                    <span className="text-[#A1A1AA]">
                      Cần thêm <strong className="text-amber-300 font-mono">{40 - balance} Điểm</strong> nữa
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium">
                      Chọn gói nạp bên dưới ↓
                    </span>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="w-full py-1.5 px-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-1"
                >
                  <span>Đăng nhập để đổi 40 Điểm lấy VIP</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="h-px flex-1 bg-[#22222B]" />
              <span className="text-[10px] font-mono text-[#71717A] uppercase">Hoặc Mời Cà Phê Qua VietQR</span>
              <div className="h-px flex-1 bg-[#22222B]" />
            </div>

            <div className="space-y-1.5">
              {packages.map((pkg) => {
                const isSelected = selectedPkg === pkg.type;

                return (
                  <div
                    key={pkg.type}
                    onClick={() => setSelectedPkg(pkg.type as any)}
                    className={`px-3 py-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition ${
                      isSelected
                        ? 'border-[#7C5CFC] bg-[#1A1A26] shadow-sm'
                        : 'border-[#22222B] bg-[#0A0A0D] hover:border-[#2E2E3C]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white text-xs">
                        {pkg.coins}
                      </div>
                      <div className="text-[11px] text-[#71717A] mt-0.5">{pkg.note}</div>
                    </div>
                    <div className="text-right font-medium text-white">
                      {pkg.name}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => handleCreateOrder(selectedPkg)}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tạo mã chuyển khoản...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Tạo Mã Chuyển Khoản</span>
                </>
              )}
            </button>
          </div>
        ) : isSuccess ? (
          <div className="text-center py-6 space-y-3 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-white">Mời Cà Phê Thành Công ☕</h3>
            <p className="text-xs text-[#71717A] max-w-xs mx-auto">
              {order.packageType === 'VIP_39K'
                ? 'Đã kích hoạt gói VIP thành công.'
                : `Đã cộng ${order.coinsReceived} Điểm vào ví của bạn.`}
            </p>
            <button
              onClick={() => setIsRechargeOpen(false)}
              className="py-2 px-5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-xs font-medium rounded-lg transition"
            >
              Đóng & Đọc Tiếp
            </button>
          </div>
        ) : (
          <div className="text-center space-y-3.5 animate-fadeIn">
            <div>
              <h3 className="font-semibold text-sm text-white">Thanh Toán Chuyển Khoản</h3>
              <p className="text-[11px] text-[#71717A] mt-0.5">
                Quét mã VietQR hoặc copy thông tin bên dưới:
              </p>
            </div>

            {/* Đồng hồ đếm ngược hiển thị 10 phút */}
            <div className="bg-[#14141D] border border-[#262636] rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <Clock className="w-4 h-4 text-[#F59E0B]" />
                <div>
                  <div className="text-[11px] font-medium text-[#D4D4D8]">Thời gian thanh toán:</div>
                  <div className="text-[9px] text-[#71717A]">Mã QR sẽ hết hạn sau thời gian này</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono text-base font-bold tracking-wider ${timeLeft <= 120 ? 'text-[#F43F5E] animate-pulse' : 'text-[#F59E0B]'}`}>
                  {formatCountdown(timeLeft)}
                </div>
                <div className="text-[9px] text-[#71717A]">
                  {timeLeft > 0 ? '(10:00)' : 'Hết hạn hiển thị'}
                </div>
              </div>
            </div>

            {/* Khi hết 10 phút hiển thị mà khách chưa bấm Đã chuyển khoản: Ẩn mã QR, chỉ báo hết hạn & tạo mã mới */}
            {timeLeft === 0 && !isProcessing ? (
              <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-center space-y-3 animate-fadeIn my-3">
                <div className="w-10 h-10 rounded-full bg-red-900/40 border border-red-700/50 text-red-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Mã Chuyển Khoản Đã Hết Hạn</h4>
                  <p className="text-[11px] text-[#A1A1AA] mt-1 leading-relaxed">
                    Mã đã hết thời gian hiệu lực (10 phút). Đơn hàng đã được đóng lại để đảm bảo an toàn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateOrder(order.packageType as any)}
                  className="w-full py-2.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tạo Mã Chuyển Khoản Mới</span>
                </button>
              </div>
            ) : isProcessing ? (
              <div className="p-4 bg-[#141422] border-2 border-[#7C5CFC]/50 rounded-xl text-center space-y-3.5 animate-fadeIn my-2 shadow-lg">
                <div className="w-12 h-12 rounded-full bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 text-[#A78BFA] mx-auto flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>Đang xử lý giao dịch</span>
                  </div>
                  <h4 className="font-semibold text-white text-sm pt-1">
                    Đang chờ thông báo từ Gmail Sacombank...
                  </h4>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Hệ thống đang tự động đọc thư báo biến động số dư, đối chiếu <strong className="text-white">số tiền</strong> và <strong className="text-amber-300">mã nội dung</strong> để cộng điểm cho bạn.
                  </p>
                </div>

                {/* Bảng thông tin đang đối soát */}
                <div className="bg-[#0B0B10] border border-[#222230] rounded-lg p-2.5 text-left text-[11px] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Trạng thái đơn:</span>
                    <span className="text-amber-300 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Đang xử lý...
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Số tiền đối chiếu:</span>
                    <span className="text-white font-mono font-bold">{order.amountVnd.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#71717A]">Mã nội dung CK:</span>
                    <span className="font-mono text-[#F59E0B] font-bold bg-[#1C1C26] px-1.5 py-0.5 rounded">{order.orderCode}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#1C1C26]">
                    <span className="text-[#71717A]">Điểm nhận tự động:</span>
                    <span className="text-emerald-400 font-bold">+{order.coinsReceived} Điểm</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmTransferred}
                    disabled={confirming}
                    className="w-full py-2 px-3 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow active:scale-98"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${confirming ? 'animate-spin' : ''}`} />
                    <span>{confirming ? 'Đang kiểm tra hòm thư...' : 'Kiểm Tra Lại Ngay'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProcessing(false)}
                    className="text-[11px] text-[#A1A1AA] hover:text-white underline transition py-1"
                  >
                    ← Xem lại mã QR chuyển khoản
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Mã QR */}
                <div className="relative p-2.5 bg-white rounded-xl inline-block border border-gray-200">
                  <img
                    src={qrImageUrl}
                    alt="VietQR Sacombank"
                    className="w-40 h-40 mx-auto object-contain"
                  />
                </div>

                {/* Trạng thái chờ */}
                <div className="text-[11px] text-[#A1A1AA] flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Quét mã xong hãy bấm nút &ldquo;Tôi Đã Chuyển Khoản&rdquo; bên dưới</span>
                </div>

                {/* Nút hỗ trợ Mobile: Tải QR về máy */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadQr}
                    className="py-1.5 px-2 bg-[#1A1A24] hover:bg-[#252533] border border-[#2B2B38] text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-[#7C5CFC]" />
                    <span>Lưu QR về máy</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(order.orderCode, 'content', 'nội dung chuyển khoản')}
                    className="py-1.5 px-2 bg-[#1A1A24] hover:bg-[#252533] border border-[#2B2B38] text-white text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedType === 'content' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#F59E0B]" />
                    )}
                    <span>Copy Nội dung CK</span>
                  </button>
                </div>

                {notice && (
                  <div className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 py-1 px-2 rounded-md animate-fadeIn">
                    {notice}
                  </div>
                )}

                {/* Khối Copy 1 chạm thông tin ngân hàng */}
                <div className="bg-[#0A0A0D] border border-[#22222B] rounded-lg p-2.5 text-left text-xs space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#71717A]">Ngân hàng:</span>
                    <span className="text-white font-medium">{bankName} ({accountHolder})</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#71717A]">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-white font-semibold">{bankAccount}</span>
                      <button
                        onClick={() => copyToClipboard(bankAccount, 'stk', 'số tài khoản')}
                        className="p-1 text-[#71717A] hover:text-white transition"
                        title="Sao chép STK"
                      >
                        {copiedType === 'stk' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#71717A]">Số tiền:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-semibold">
                        {order.amountVnd.toLocaleString('vi-VN')} đ
                      </span>
                      <button
                        onClick={() => copyToClipboard(String(order.amountVnd), 'amount', 'số tiền')}
                        className="p-1 text-[#71717A] hover:text-white transition"
                        title="Sao chép số tiền"
                      >
                        {copiedType === 'amount' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[#1C1C24]">
                    <span className="text-[#71717A]">Nội dung CK:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[#F59E0B] font-bold text-xs bg-[#1C1C24] px-1.5 py-0.5 rounded">
                        {order.orderCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(order.orderCode, 'content', 'nội dung chuyển khoản')}
                        className="p-1 text-[#71717A] hover:text-white transition"
                        title="Sao chép nội dung"
                      >
                        {copiedType === 'content' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nút nổi bật: NGƯỜI DÙNG BẤM XÁC NHẬN ĐÃ CHUYỂN KHOẢN */}
                <button
                  type="button"
                  onClick={handleConfirmTransferred}
                  disabled={confirming}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-98"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang chuyển sang trạng thái xử lý...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Tôi Đã Chuyển Khoản</span>
                    </>
                  )}
                </button>
              </>
            )}

            <div className="text-[10px] text-[#71717A] text-center px-1">
              🛡️ Hệ thống tự động lưu giữ hiệu lực giao dịch trong <span className="text-[#D4D4D8] font-medium">15 phút</span> phòng trường hợp mạng hoặc ngân hàng bị chậm.
            </div>

            <div className="pt-1">
              <button
                onClick={handleCancelOrder}
                className="w-full py-2.5 text-xs text-[#A1A1AA] hover:text-white bg-[#14141B] hover:bg-[#1E1E28] border border-[#22222B] rounded-lg transition font-medium flex items-center justify-center gap-1.5"
              >
                <span>← Chọn Gói Nạp Khác (Hủy Đơn Này)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
