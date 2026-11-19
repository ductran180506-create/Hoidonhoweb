'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  X, 
  Receipt, 
  Coins, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  QrCode, 
  RefreshCw, 
  ExternalLink,
  Trash2,
  Coffee,
  Crown
} from 'lucide-react';

interface TransactionItem {
  id: string;
  orderCode: string;
  amountVnd: number;
  coinsReceived: number;
  packageType: string;
  packageName: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
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
    setIsRechargeOpen, 
    resumePayment,
    setPendingOrder
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<TransactionItem[]>([]);
  const [activePendingOrder, setActivePendingOrder] = useState<TransactionItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeCountdown, setActiveCountdown] = useState<number>(0);

  // Tải danh sách đơn hàng của người dùng
  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payment/my-orders?userId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setActivePendingOrder(data.activePendingOrder || null);
        if (data.activePendingOrder) {
          setActiveCountdown(data.activePendingOrder.remainingSec || 0);
        }
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

  // Đếm ngược thời gian thực cho đơn đang chờ
  useEffect(() => {
    if (!activePendingOrder || activeCountdown <= 0) return;

    const timer = setInterval(() => {
      setActiveCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Tải lại khi hết hạn
          fetchOrders();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePendingOrder, activeCountdown]);

  if (!isHistoryOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCancelActiveOrder = () => {
    try {
      localStorage.removeItem('hdn_pending_order');
    } catch (e) {}
    setPendingOrder(null);
    setActivePendingOrder(null);
    if (user?.id) fetchOrders();
  };

  const handleResume = (ord: TransactionItem) => {
    resumePayment({
      id: ord.id,
      orderCode: ord.orderCode,
      amountVnd: ord.amountVnd,
      coinsReceived: ord.coinsReceived,
      packageType: ord.packageType,
      packageName: ord.packageName,
      createdAt: ord.createdAt,
      qrUrl: ord.qrUrl,
    });
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'pending') return o.status === 'pending';
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
            <h3 className="font-semibold text-base text-white">Lịch Sử Nạp & Đơn Hàng</h3>
            <p className="text-[11px] text-[#71717A]">
              Theo dõi biến động điểm và tiếp tục đơn chờ thanh toán
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

          <button
            onClick={() => {
              setIsHistoryOpen(false);
              setIsRechargeOpen(true);
            }}
            className="py-1.5 px-3 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white text-[11px] font-semibold rounded-lg transition shadow flex items-center gap-1 active:scale-95"
          >
            <span>+ Nạp Điểm</span>
          </button>
        </div>

        {/* Cuộn nội dung */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 -mr-1">
          {/* ========================================================= */}
          {/* 1. KHỐI GHIM NỔI BẬT: ĐƠN HÀNG ĐANG CHỜ CÒN HIỆU LỰC     */}
          {/* ========================================================= */}
          {activePendingOrder && (
            <div className="p-3.5 bg-gradient-to-br from-amber-950/40 via-[#181824] to-[#12121A] border border-amber-500/40 rounded-xl space-y-3 shadow-lg animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Đơn hàng đang chờ thanh toán</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-md">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{formatCountdown(activeCountdown)}</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#0B0B0F]/80 border border-[#22222E] rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#A1A1AA] text-[11px]">Gói nạp:</span>
                  <span className="font-semibold text-white">{activePendingOrder.packageName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#A1A1AA] text-[11px]">Số tiền chuyển:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {activePendingOrder.amountVnd.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-[#1C1C26]">
                  <span className="text-[#A1A1AA] text-[11px]">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[#F59E0B] font-bold bg-[#1A1A24] px-1.5 py-0.5 rounded text-xs">
                      {activePendingOrder.orderCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(activePendingOrder.orderCode)}
                      className="p-1 text-[#71717A] hover:text-white"
                      title="Sao chép nội dung"
                    >
                      {copiedCode === activePendingOrder.orderCode ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <button
                  onClick={() => handleResume(activePendingOrder)}
                  className="w-full py-2 px-3 bg-gradient-to-r from-[#7C5CFC] to-[#906CFF] hover:from-[#6D4CF0] hover:to-[#7E57E8] text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow active:scale-98"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Tiếp Tục Thanh Toán (Mở QR)</span>
                </button>
                <button
                  onClick={handleCancelActiveOrder}
                  className="w-full py-2 px-3 bg-[#181822] hover:bg-[#222230] border border-[#2B2B3C] text-[#A1A1AA] hover:text-white text-xs font-medium rounded-lg transition flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hủy để tạo mã khác</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. BỘ LỌC VÀ LỊCH SỬ GIAO DỊCH                           */}
          {/* ========================================================= */}
          <div className="space-y-2.5">
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
                  Đang chờ ({orders.filter(o => o.status === 'pending').length})
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

            {/* Danh sách các đơn */}
            <div className="space-y-2">
              {filteredOrders.length === 0 ? (
                <div className="py-8 text-center text-[#71717A] text-xs">
                  {loading ? 'Đang tải lịch sử giao dịch...' : 'Chưa có giao dịch nào trong mục này.'}
                </div>
              ) : (
                filteredOrders.map(item => {
                  const isCompleted = item.status === 'completed';
                  const isPending = item.status === 'pending';
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
                      className="p-3 bg-[#0E0E14] border border-[#1E1E28] hover:border-[#2C2C3C] rounded-xl flex items-center justify-between text-xs transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                            : isPending
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                            : 'bg-[#1C1C26] text-[#71717A]'
                        }`}>
                          {item.packageType === 'VIP_39K' ? (
                            <Crown className="w-3.5 h-3.5" />
                          ) : (
                            <Coffee className="w-3.5 h-3.5" />
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
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-medium text-white font-mono">
                          {item.amountVnd.toLocaleString('vi-VN')} đ
                        </div>
                        <div className="mt-0.5">
                          {isCompleted ? (
                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                              Thành công ✅
                            </span>
                          ) : isPending ? (
                            <button
                              onClick={() => handleResume(item)}
                              className="text-[10px] font-medium text-amber-400 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/50 px-1.5 py-0.5 rounded transition flex items-center gap-1"
                            >
                              <span>Chờ quét QR</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
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
