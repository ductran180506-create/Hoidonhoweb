'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  X, 
  Receipt, 
  Coins, 
  QrCode, 
  RefreshCw, 
  ExternalLink,
  Coffee,
  Crown,
  Clock,
  Sparkles,
  Gift
} from 'lucide-react';
import { formatVipTimeRemaining, formatVipExpireDate } from '@/lib/vip-utils';

interface TransactionItem {
  id: string;
  orderCode: string;
  amountVnd: number;
  coinsReceived: number;
  packageType: string;
  packageName: string;
  status: 'pending' | 'processing' | 'completed' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  remainingSec: number;
  qrUrl?: string;
}

export default function PaymentHistoryModal() {
  const { 
    isHistoryOpen, 
    setIsHistoryOpen, 
    user, 
    balance, 
    refreshBalance,
    setIsRechargeOpen, 
    resumePayment,
    setPendingOrder
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<TransactionItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'expired'>('all');

  // Tải danh sách đơn hàng của người dùng
  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payment/my-orders?userId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        await refreshBalance();
      }
    } catch (e) {
      console.warn('Lỗi lấy lịch sử giao dịch:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isHistoryOpen && user?.id) {
      fetchOrders();
    }
  }, [isHistoryOpen, user?.id]);

  // Cập nhật đếm ngược mỗi giây: hiển thị chuẩn 10 phút cho người dùng
  useEffect(() => {
    if (!isHistoryOpen) return;

    const timer = setInterval(() => {
      setOrders(prev =>
        prev.map(ord => {
          if (ord.status === 'pending') {
            const createdTime = new Date(ord.createdAt).getTime();
            const ageMs = Date.now() - createdTime;
            // Đếm ngược hiển thị 10 phút (600s)
            const remainingSec = Math.max(0, Math.floor((10 * 60 * 1000 - ageMs) / 1000));
            const isExpired = remainingSec <= 0;
            return {
              ...ord,
              remainingSec,
              isExpired,
              status: isExpired ? 'expired' : 'pending',
              qrUrl: isExpired ? '' : ord.qrUrl,
            };
          }
          return ord;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [isHistoryOpen]);

  // Tự động đồng bộ nếu có đơn đang chờ hoặc đang xử lý
  useEffect(() => {
    if (!isHistoryOpen || !user?.id) return;
    const hasActive = orders.some(o => o.status === 'pending' || o.status === 'processing');
    if (!hasActive) return;

    const poll = setInterval(() => {
      fetchOrders();
    }, 3000);

    return () => clearInterval(poll);
  }, [isHistoryOpen, user?.id, orders.some(o => o.status === 'pending' || o.status === 'processing')]);

  if (!isHistoryOpen) return null;

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleResume = (ord: TransactionItem) => {
    resumePayment({
      id: ord.id,
      orderCode: ord.orderCode,
      amountVnd: ord.amountVnd,
      coinsReceived: ord.coinsReceived,
      packageType: ord.packageType,
      packageName: ord.packageName,
      status: ord.status,
      createdAt: ord.createdAt,
      qrUrl: ord.qrUrl,
    });
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'pending') return o.status === 'pending' || o.status === 'processing';
    if (filter === 'expired') return o.status === 'expired';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-[510px] p-5 bg-white dark:bg-[#111116] border border-slate-200 dark:border-[#22222B] rounded-2xl shadow-2xl space-y-3.5 max-h-[92vh] flex flex-col text-slate-800 dark:text-white">
        {/* Nút đóng */}
        <button
          onClick={() => setIsHistoryOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:text-[#71717A] dark:hover:text-white dark:hover:bg-[#1C1C26] rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-2.5 pr-8 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-[#7C5CFC]/15 border border-indigo-200 dark:border-[#7C5CFC]/30 flex items-center justify-center text-indigo-600 dark:text-[#7C5CFC]">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">Tài Khoản & Lịch Sử Nạp</h3>
            <p className="text-[11px] text-slate-500 dark:text-[#71717A]">
              Thông tin hội viên, thời hạn VIP và biến động điểm nạp
            </p>
          </div>
        </div>

        {/* KHỐI HỒ SƠ TÀI KHOẢN & VIP TẬP TRUNG (KHÔNG BỊ CO CẮT, ĐẸP SANG TRỌNG) */}
        <div className={`p-3.5 sm:p-4 rounded-xl border flex-shrink-0 transition relative shadow-sm ${
          user?.isVip
            ? 'bg-gradient-to-b from-amber-50 to-amber-100/40 dark:from-[#1C1628] dark:via-[#161424] dark:to-[#12121A] border-amber-300 dark:border-amber-500/40 shadow-amber-950/20'
            : 'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#171722] dark:to-[#111116] border-slate-200 dark:border-[#252536]'
        }`}>
          {/* Hàng 1: Avatar, Tên & Nút Nạp Điểm */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C5CFC] to-purple-500 text-white font-bold text-sm flex items-center justify-center ring-2 ring-amber-500/40 shadow">
                    {user?.name ? user.name[0]?.toUpperCase() : 'U'}
                  </div>
                )}
                {user?.isVip && (
                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black shadow ring-2 ring-white dark:ring-[#12121A]">
                    <Crown className="w-2.5 h-2.5 fill-black text-black" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">
                    {user?.name || user?.phone || 'Độc Giả'}
                  </h4>
                  {user?.isVip ? (
                    <span className="flex-shrink-0 px-1.5 py-0.2 rounded text-[9px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-xs flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 fill-black" />
                      <span>VIP</span>
                    </span>
                  ) : (
                    <span className="flex-shrink-0 px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-200 dark:bg-[#222230] text-slate-700 dark:text-[#A1A1AA] border border-slate-300 dark:border-white/5">
                      Thường
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-amber-400 font-medium mt-0.5">
                  <Coins className="w-3 h-3 text-[#F59E0B]" />
                  <span>Số dư ví: <strong className="text-amber-600 dark:text-white font-mono font-bold">{balance}</strong> Điểm</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  setPendingOrder(null);
                  setIsHistoryOpen(false);
                  setIsRechargeOpen(true);
                }}
                className="py-1.5 px-3 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-[11px] font-bold rounded-lg transition shadow flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5 text-amber-300" />
                <span>Mời Cà Phê</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Trạng thái & Thời hạn Hội Viên VIP */}
          <div className="pt-2.5 flex items-center justify-between gap-2">
            {user?.isVip ? (
              <div className="flex items-center justify-between w-full bg-amber-100/50 dark:bg-black/40 border border-amber-300 dark:border-amber-500/30 rounded-lg p-2 px-3">
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    <span>Thời hạn VIP: <strong className="text-amber-900 dark:text-white font-extrabold">{formatVipTimeRemaining(user.vipUntil)}</strong></span>
                  </div>
                  {user.vipUntil && (
                    <div className="text-[10px] text-slate-600 dark:text-[#A1A1AA] font-mono mt-0.5 truncate">
                      Hết hạn lúc: {formatVipExpireDate(user.vipUntil)}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setPendingOrder(null);
                    setIsHistoryOpen(false);
                    setIsRechargeOpen(true);
                  }}
                  className="py-1 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black text-[11px] font-extrabold rounded-md transition shadow active:scale-95 flex-shrink-0 flex items-center gap-1"
                >
                  <Crown className="w-3 h-3 fill-black" />
                  <span>Gia hạn VIP</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full bg-white dark:bg-[#12121A] border border-slate-200 dark:border-[#222230] rounded-lg p-2 px-3">
                <div className="text-[11px] text-slate-600 dark:text-[#A1A1AA] pr-2">
                  Chưa có VIP • Mở khóa trọn bộ mọi truyện
                </div>
                <button
                  onClick={() => {
                    setPendingOrder(null);
                    setIsHistoryOpen(false);
                    setIsRechargeOpen(true);
                  }}
                  className="py-1 px-2.5 bg-amber-500 hover:bg-amber-600 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-orange-500/20 dark:hover:from-amber-500/30 dark:hover:to-orange-500/30 border border-amber-500/40 text-white dark:text-amber-300 text-[11px] font-bold rounded-md transition active:scale-95 flex-shrink-0 shadow-xs"
                >
                  Nâng VIP 39k
                </button>
              </div>
            )}
          </div>

          {/* Hàng 3: Ưu đãi đổi 40 Điểm = 7 Ngày VIP (nếu đủ số dư) */}
          {balance >= 40 && (
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs">
              <span className="text-[11px] text-amber-800 dark:text-amber-300/90 flex items-center gap-1 font-medium truncate pr-2">
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                <span>Ví đủ {balance}đ để đổi gói 7 Ngày VIP</span>
              </span>
              <button
                onClick={() => {
                  setPendingOrder(null);
                  setIsHistoryOpen(false);
                  setIsRechargeOpen(true);
                }}
                className="py-0.5 px-2 bg-amber-500 hover:bg-amber-600 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-orange-500/20 dark:hover:from-amber-500/30 dark:hover:to-orange-500/30 border border-amber-400 dark:border-amber-500/40 text-white dark:text-amber-300 text-[10px] font-bold rounded-md transition active:scale-95 cursor-pointer flex-shrink-0 shadow-xs"
              >
                Đổi ngay 40đ ➔ 7D VIP
              </button>
            </div>
          )}
        </div>

        {/* Cuộn nội dung danh sách */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1">
          {/* Bộ lọc tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1C1C26] pb-2">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs dark:bg-[#7C5CFC]/20 dark:text-[#A78BFA] dark:border dark:border-[#7C5CFC]/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#71717A] dark:hover:text-white dark:hover:bg-transparent'
                }`}
              >
                Tất cả ({orders.length})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === 'completed'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs dark:bg-emerald-500/15 dark:text-emerald-400 dark:border dark:border-emerald-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#71717A] dark:hover:text-white dark:hover:bg-transparent'
                }`}
              >
                Thành công ({orders.filter(o => o.status === 'completed').length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === 'pending'
                    ? 'bg-amber-600 text-white font-bold shadow-xs dark:bg-amber-500/15 dark:text-amber-400 dark:border dark:border-amber-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#71717A] dark:hover:text-white dark:hover:bg-transparent'
                }`}
              >
                Đang chờ ({orders.filter(o => o.status === 'pending' || o.status === 'processing').length})
              </button>
              <button
                onClick={() => setFilter('expired')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === 'expired'
                    ? 'bg-slate-700 text-white font-bold shadow-xs dark:bg-zinc-800/80 dark:text-zinc-300 dark:border dark:border-zinc-700/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-[#71717A] dark:hover:text-white dark:hover:bg-transparent'
                }`}
              >
                Đã hết hạn ({orders.filter(o => o.status === 'expired').length})
              </button>
            </div>

            <button
              onClick={fetchOrders}
              disabled={loading}
              className="p-1 text-slate-500 hover:text-slate-900 dark:text-[#71717A] dark:hover:text-white rounded transition"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600 dark:text-[#7C5CFC]' : ''}`} />
            </button>
          </div>

          {/* Danh sách các đơn (Đơn đang chờ / đang xử lý hiện ngay tại đây, click vào mở lại) */}
          <div className="space-y-2">
            {filteredOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-[#71717A] text-xs">
                {loading ? 'Đang tải lịch sử giao dịch...' : 'Chưa có giao dịch nào trong mục này.'}
              </div>
            ) : (
              filteredOrders.map(item => {
                const isCompleted = item.status === 'completed';
                const isProcessing = item.status === 'processing';
                const isPending = item.status === 'pending';
                const canResume = (isPending && !item.isExpired && item.remainingSec > 0) || isProcessing;
                const dateStr = item.createdAt 
                  ? new Date(item.createdAt).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })
                  : '—';

                return (
                  <div
                    key={item.id}
                    onClick={() => canResume && handleResume(item)}
                    className={`p-3 rounded-xl flex items-center justify-between text-xs transition ${
                      isProcessing
                        ? 'bg-indigo-50/70 dark:bg-[#161528] border-2 border-indigo-500 dark:border-[#7C5CFC]/70 hover:border-indigo-600 cursor-pointer shadow-md'
                        : canResume
                        ? 'bg-amber-50/70 dark:bg-[#181520] border-2 border-amber-500 dark:border-amber-500/60 hover:border-amber-600 hover:bg-amber-100/50 cursor-pointer shadow-md'
                        : 'bg-white dark:bg-[#0E0E14] border border-slate-200 dark:border-[#1E1E28] hover:border-slate-300 dark:hover:border-[#2C2C3C] shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40'
                          : isProcessing
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-[#7C5CFC]/20 dark:text-[#A78BFA] dark:border-[#7C5CFC]/40'
                          : canResume
                          ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-600/50'
                          : 'bg-slate-100 text-slate-600 dark:bg-[#1C1C26] dark:text-[#71717A]'
                      }`}>
                        {item.packageType === 'VIP_39K' || item.packageType === 'EXCHANGE_VIP' ? (
                          <Crown className="w-4 h-4 text-amber-500" />
                        ) : item.packageType === 'CHECKIN' ? (
                          <Gift className="w-4 h-4 text-amber-500" />
                        ) : item.packageType === 'LUCKY' ? (
                          <Sparkles className="w-4 h-4 text-purple-500" />
                        ) : (
                          <Coffee className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <span>{item.packageName}</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{item.coinsReceived} Điểm</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#71717A] mt-0.5 flex items-center gap-2">
                          <span>Mã: <strong className="font-mono text-slate-700 dark:text-[#D4D4D8]">{item.orderCode}</strong></span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </div>
                        {isProcessing ? (
                          <div className="text-[10px] text-indigo-600 dark:text-[#A78BFA] font-semibold mt-1 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-600 dark:text-[#A78BFA]" />
                            <span>Đang đối chiếu Gmail Sacombank để cộng điểm ↗</span>
                          </div>
                        ) : canResume ? (
                          <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mt-1 flex items-center gap-1">
                            <QrCode className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                            <span>Bấm vào đây để mở lại mã QR thanh toán ↗</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold ${canResume ? 'text-amber-600 dark:text-amber-300 text-sm' : 'text-slate-900 dark:text-white'}`}>
                        {item.amountVnd === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Miễn phí</span>
                        ) : (
                          `${item.amountVnd.toLocaleString('vi-VN')} đ`
                        )}
                      </div>
                      <div className="mt-1">
                        {isCompleted ? (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/40 px-2 py-0.5 rounded">
                            Thành công ✅
                          </span>
                        ) : isProcessing ? (
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-[#A78BFA] bg-indigo-100 dark:bg-[#7C5CFC]/20 border border-indigo-300 dark:border-[#7C5CFC]/40 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-600 dark:text-[#A78BFA]" />
                            <span>Đang xử lý...</span>
                          </span>
                        ) : canResume ? (
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Đang chờ ({formatCountdown(item.remainingSec)})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 dark:text-[#71717A] bg-slate-100 dark:bg-[#181822] px-1.5 py-0.5 rounded">
                            Đã hết hạn
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chân modal */}
        <div className="pt-2 border-t border-slate-200 dark:border-[#1C1C26] flex items-center justify-between text-[11px] text-slate-500 dark:text-[#71717A]">
          <span>Gặp sự cố chuyển tiền?</span>
          <a
            href="https://www.tiktok.com/@carrot.tia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-[#7C5CFC] hover:underline font-medium"
          >
            Nhắn hỗ trợ TikTok @carrot.tia ↗
          </a>
        </div>
      </div>
    </div>
  );
}
