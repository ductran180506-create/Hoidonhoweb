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
  Sparkles
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md p-5 bg-[#111116] border border-[#22222B] rounded-2xl shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Nút đóng */}
        <button
          onClick={() => setIsHistoryOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-[#71717A] hover:text-white hover:bg-[#1C1C26] rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-2.5 pr-8">
          <div className="w-8 h-8 rounded-lg bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 flex items-center justify-center text-[#7C5CFC]">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">Tài Khoản & Lịch Sử Nạp</h3>
            <p className="text-[11px] text-[#71717A]">
              Thông tin hội viên, thời hạn VIP và biến động điểm nạp
            </p>
          </div>
        </div>

        {/* Thẻ tóm tắt thông tin người dùng */}
        <div className="p-3.5 bg-[#161622] border border-[#222233] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-[#7C5CFC]/30" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#7C5CFC]/20 text-[#7C5CFC] font-bold text-xs flex items-center justify-center border border-[#7C5CFC]/30">
                {user?.name ? user.name[0]?.toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <div className="font-semibold text-xs text-white truncate max-w-[150px]">
                {user?.name || user?.phone || 'Độc Giả'}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                <Coins className="w-3 h-3 text-[#F59E0B]" />
                <span>Số dư: <strong className="text-white font-mono">{balance}</strong> Điểm</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {balance >= 40 && (
              <button
                onClick={() => {
                  setPendingOrder(null);
                  setIsHistoryOpen(false);
                  setIsRechargeOpen(true);
                }}
                className="py-1.5 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black text-[11px] font-bold rounded-lg transition shadow flex items-center gap-1 active:scale-95 animate-pulse"
                title="Dùng 40 Điểm đổi 7 Ngày VIP"
              >
                <span>👑 Đổi VIP 7D</span>
              </button>
            )}
            <button
              onClick={() => {
                setPendingOrder(null);
                setIsHistoryOpen(false);
                setIsRechargeOpen(true);
              }}
              className="py-1.5 px-3 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-[11px] font-semibold rounded-lg transition shadow flex items-center gap-1 active:scale-95"
            >
              <span>☕ Mời Cà Phê</span>
            </button>
          </div>
        </div>

        {/* Thẻ Trạng Thái & Thời Hạn Hội Viên VIP */}
        {user?.isVip ? (
          <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-[#231A33] to-purple-500/15 border border-amber-500/40 rounded-xl relative overflow-hidden shadow-lg shadow-amber-950/20">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-start gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-black flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-amber-500/20 mt-0.5">
                  <Crown className="w-5 h-5 text-black" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Hội Viên VIP
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Đang Kích Hoạt
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Thời hạn: <span className="text-amber-300 font-extrabold">{formatVipTimeRemaining(user.vipUntil)}</span></span>
                  </div>

                  {user.vipUntil && (
                    <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1 font-mono">
                      <span>Hết hạn:</span>
                      <strong className="text-[#E4E4E7] font-semibold">{formatVipExpireDate(user.vipUntil)}</strong>
                    </div>
                  )}

                  <div className="text-[10px] text-amber-400/80 pt-0.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>Đặc quyền: Mở khóa full tất cả các tập truyện</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <button
                  onClick={() => {
                    setPendingOrder(null);
                    setIsHistoryOpen(false);
                    setIsRechargeOpen(true);
                  }}
                  className="py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black text-xs font-bold rounded-lg transition shadow-md shadow-amber-500/20 flex items-center gap-1 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Gia hạn VIP</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#151520] border border-[#232332] rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#20202E] border border-[#2E2E3E] text-[#71717A] flex items-center justify-center flex-shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#D4D4D8]">Chưa kích hoạt Hội Viên VIP</div>
                <div className="text-[10px] text-[#71717A]">
                  Đăng ký 39k/tháng hoặc đổi 40 Điểm = 7 Ngày để đọc Full truyện
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setPendingOrder(null);
                setIsHistoryOpen(false);
                setIsRechargeOpen(true);
              }}
              className="py-1.5 px-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-lg transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Nâng Cấp VIP
            </button>
          </div>
        )}

        {/* Cuộn nội dung danh sách */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1">
          {/* Bộ lọc tabs */}
          <div className="flex items-center justify-between border-b border-[#1C1C26] pb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === 'all'
                    ? 'bg-[#7C5CFC]/20 text-[#A78BFA] border border-[#7C5CFC]/40'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                Tất cả ({orders.length})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                Thành công ({orders.filter(o => o.status === 'completed').length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === 'pending'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                Đang chờ ({orders.filter(o => o.status === 'pending' || o.status === 'processing').length})
              </button>
              <button
                onClick={() => setFilter('expired')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === 'expired'
                    ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/80'
                    : 'text-[#71717A] hover:text-white'
                }`}
              >
                Đã hết hạn ({orders.filter(o => o.status === 'expired').length})
              </button>
            </div>

            <button
              onClick={fetchOrders}
              disabled={loading}
              className="p-1 text-[#71717A] hover:text-white rounded transition"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#7C5CFC]' : ''}`} />
            </button>
          </div>

          {/* Danh sách các đơn (Đơn đang chờ / đang xử lý hiện ngay tại đây, click vào mở lại) */}
          <div className="space-y-2">
            {filteredOrders.length === 0 ? (
              <div className="py-8 text-center text-[#71717A] text-xs">
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
                        ? 'bg-[#161528] border-2 border-[#7C5CFC]/70 hover:border-[#A78BFA] cursor-pointer shadow-md'
                        : canResume
                        ? 'bg-[#181520] border-2 border-amber-500/60 hover:border-amber-400 hover:bg-[#201B2B] cursor-pointer shadow-md'
                        : 'bg-[#0E0E14] border border-[#1E1E28] hover:border-[#2C2C3C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                          : isProcessing
                          ? 'bg-[#7C5CFC]/20 text-[#A78BFA] border border-[#7C5CFC]/40'
                          : canResume
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-600/50'
                          : 'bg-[#1C1C26] text-[#71717A]'
                      }`}>
                        {item.packageType === 'VIP_39K' ? (
                          <Crown className="w-4 h-4" />
                        ) : (
                          <Coffee className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                          <span>{item.packageName}</span>
                          <span className="font-mono text-emerald-400">+{item.coinsReceived} Điểm</span>
                        </div>
                        <div className="text-[10px] text-[#71717A] mt-0.5 flex items-center gap-2">
                          <span>Mã: <strong className="font-mono text-[#D4D4D8]">{item.orderCode}</strong></span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </div>
                        {isProcessing ? (
                          <div className="text-[10px] text-[#A78BFA] font-semibold mt-1 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-[#A78BFA]" />
                            <span>Đang đối chiếu Gmail Sacombank để cộng điểm ↗</span>
                          </div>
                        ) : canResume ? (
                          <div className="text-[10px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
                            <QrCode className="w-3 h-3 text-amber-400" />
                            <span>Bấm vào đây để mở lại mã QR thanh toán ↗</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold ${canResume ? 'text-amber-300 text-sm' : 'text-white'}`}>
                        {item.amountVnd.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="mt-1">
                        {isCompleted ? (
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                            Thành công ✅
                          </span>
                        ) : isProcessing ? (
                          <span className="text-[10px] font-bold text-[#A78BFA] bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#A78BFA]" />
                            <span>Đang xử lý...</span>
                          </span>
                        ) : canResume ? (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1 shadow-sm animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>Đang chờ ({formatCountdown(item.remainingSec)})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#71717A] bg-[#181822] px-1.5 py-0.5 rounded">
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
        <div className="pt-2 border-t border-[#1C1C26] flex items-center justify-between text-[11px] text-[#71717A]">
          <span>Gặp sự cố chuyển tiền?</span>
          <a
            href="https://www.tiktok.com/@carrot.tia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7C5CFC] hover:underline"
          >
            Nhắn hỗ trợ TikTok @carrot.tia ↗
          </a>
        </div>
      </div>
    </div>
  );
}
