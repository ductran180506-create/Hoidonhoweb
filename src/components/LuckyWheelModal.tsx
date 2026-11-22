'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { X, Sparkles, Trophy, Gift, Coins, AlertCircle, Clock, Volume2, VolumeX, ShieldCheck, Coffee } from 'lucide-react';

interface PrizeItem {
  id: number;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  textColor: string;
  type: 'coins' | 'vip' | 'none';
  value: number;
}

const DEFAULT_PRIZES: PrizeItem[] = [
  { id: 0, label: '+2 Điểm', sublabel: 'Thưởng xu', icon: '🎁', color: '#4F46E5', textColor: '#FFFFFF', type: 'coins', value: 2 },
  { id: 1, label: '+5 Điểm', sublabel: 'Mở 1 tập', icon: '💎', color: '#2563EB', textColor: '#FFFFFF', type: 'coins', value: 5 },
  { id: 2, label: '1 Ngày VIP', sublabel: 'Đọc Full', icon: '👑', color: '#D97706', textColor: '#FFFFFF', type: 'vip', value: 1 },
  { id: 3, label: '+10 Điểm', sublabel: 'Gấp đôi vui', icon: '🔥', color: '#059669', textColor: '#FFFFFF', type: 'coins', value: 10 },
  { id: 4, label: 'Thêm May Mắn', sublabel: 'Cố lên nhé', icon: '🍀', color: '#374151', textColor: '#D1D5DB', type: 'none', value: 0 },
  { id: 5, label: '+3 Điểm', sublabel: 'Thưởng xu', icon: '⭐', color: '#DB2777', textColor: '#FFFFFF', type: 'coins', value: 3 },
  { id: 6, label: '3 Ngày VIP', sublabel: 'Siêu giải', icon: '🏆', color: '#EA580C', textColor: '#FFFFFF', type: 'vip', value: 3 },
  { id: 7, label: '+1 Điểm', sublabel: 'Thưởng nhẹ', icon: '🪙', color: '#7C3AED', textColor: '#FFFFFF', type: 'coins', value: 1 },
];

export default function LuckyWheelModal() {
  const {
    user,
    balance,
    isLuckyWheelOpen,
    setIsLuckyWheelOpen,
    setIsAuthModalOpen,
    setIsRechargeOpen,
    refreshLuckyWheel,
    refreshBalance,
  } = useAuth();

  const [prizes, setPrizes] = useState<PrizeItem[]>(DEFAULT_PRIZES);
  const [canFreeSpin, setCanFreeSpin] = useState<boolean>(true);
  const [costCoins, setCostCoins] = useState<number>(3);
  const [recentWinners, setRecentWinners] = useState<any[]>([]);
  const [recentUserSpins, setRecentUserSpins] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'wheel' | 'prizes' | 'history'>('wheel');

  const [spinning, setSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [wonPrize, setWonPrize] = useState<PrizeItem | null>(null);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Âm thanh Web Audio API (Tự tạo, không cần file bên ngoài)
  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  };

  const playWinFanfare = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch (e) {}
  };

  // Hiệu ứng pháo hoa giấy Confetti (Canvas)
  const triggerConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 360;
    canvas.height = canvas.parentElement?.clientHeight || 480;

    const particles: any[] = [];
    const colors = ['#7C5CFC', '#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#FFFFFF'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        gravity: 0.35,
        alpha: 1,
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.vr;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animId = requestAnimationFrame(render);
  };

  // Tải trạng thái khi mở modal
  useEffect(() => {
    if (!isLuckyWheelOpen) return;
    const fetchData = async () => {
      try {
        const url = user?.id ? `/api/lucky-wheel?userId=${user.id}` : '/api/lucky-wheel';
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          if (data.prizes?.length) setPrizes(data.prizes);
          setCanFreeSpin(data.canFreeSpin);
          setCostCoins(data.costCoins || 3);
          if (data.recentWinners) setRecentWinners(data.recentWinners);
          if (data.recentUserSpins) setRecentUserSpins(data.recentUserSpins);
        }
      } catch (e) {}
    };
    fetchData();
  }, [isLuckyWheelOpen, user?.id]);

  if (!isLuckyWheelOpen) return null;

  // Xử lý quay thưởng
  const handleSpin = async (spinType: 'free' | 'coins') => {
    if (spinning) return;
    setErrorMessage('');

    if (!user) {
      setIsLuckyWheelOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    if (spinType === 'coins' && balance < costCoins) {
      setErrorMessage(`Bạn cần tối thiểu ${costCoins} Điểm để quay. Hãy mời cà phê để nhận thêm điểm nhé!`);
      return;
    }

    setSpinning(true);
    setWonPrize(null);
    setShowResultModal(false);

    try {
      const res = await fetch('/api/lucky-wheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, spinType }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMessage(data.message || 'Có lỗi xảy ra, vui lòng thử lại');
        setSpinning(false);
        return;
      }

      const winningIndex = data.prizeIndex;
      const prize = prizes[winningIndex] || data.prize;

      // Tính góc dừng chính xác ở đỉnh (Kim chỉ hướng 12h)
      // Mỗi ô 45 độ. Ô 0 nằm ở [ -22.5 độ, +22.5 độ ].
      // Để ô `winningIndex` dừng ở 12h, cần quay (360 - winningIndex * 45) độ.
      const sliceAngle = 360 / prizes.length;
      const targetSliceAngle = (360 - winningIndex * sliceAngle) % 360;
      const extraSpins = 360 * (5 + Math.floor(Math.random() * 2)); // 5-6 vòng quay tít
      const newTargetRotation = rotation + extraSpins + ((targetSliceAngle - (rotation % 360) + 360) % 360);

      // Mô phỏng âm thanh tick tick lúc quay
      let tickInterval: any;
      let tickCount = 0;
      tickInterval = setInterval(() => {
        tickCount++;
        playTickSound();
        if (tickCount > 25) clearInterval(tickInterval);
      }, 120);

      setRotation(newTargetRotation);

      // Đợi 4 giây cho vòng quay dừng hẳn
      setTimeout(async () => {
        clearInterval(tickInterval);
        setSpinning(false);
        setWonPrize(prize);
        setShowResultModal(true);

        if (prize.type !== 'none') {
          playWinFanfare();
          triggerConfetti();
        }

        if (spinType === 'free') {
          setCanFreeSpin(false);
        }

        await refreshBalance();
        await refreshLuckyWheel();
      }, 4200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối mạng');
      setSpinning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Canvas pháo hoa */}
      <canvas
        ref={confettiCanvasRef}
        className="absolute inset-0 pointer-events-none z-50"
      />

      <div className="relative w-full max-w-md bg-[#111116] border border-[#2B2B3D] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#1E1E28] bg-gradient-to-r from-[#171426] via-[#151322] to-[#111116]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>VÒNG QUAY MAY MẮN</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                  HOT
                </span>
              </h3>
              <p className="text-[10px] text-[#A1A1AA]">
                100% người quay đều có quà • Cơ hội rinh gói VIP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-[#71717A] hover:text-white rounded-lg hover:bg-[#1E1E28] transition"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsLuckyWheelOpen(false)}
              className="p-1.5 text-[#71717A] hover:text-white rounded-lg hover:bg-[#1E1E28] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dòng ticker tin trúng thưởng thời gian thực */}
        <div className="bg-[#0A0A0E] border-b border-[#1C1C26] px-3 py-1.5 text-[11px] text-[#A1A1AA] flex items-center gap-2 overflow-hidden select-none">
          <span className="text-amber-400 flex-shrink-0 font-bold flex items-center gap-1 text-[10px] uppercase">
            <Trophy className="w-3 h-3 text-amber-400" /> Vừa trúng:
          </span>
          <div className="overflow-x-auto no-scrollbar whitespace-nowrap flex items-center gap-4 text-[10px]">
            {recentWinners.slice(0, 4).map((w, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 text-[#D4D4D8]">
                <strong className="text-white font-medium">{w.name}</strong>
                <span>trúng</span>
                <span className="text-amber-300 font-bold">{w.prize}</span>
                <span className="text-[#52525B]">({w.timeAgo})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Nội dung cuộn */}
        <div className="p-3.5 sm:p-5 overflow-y-auto no-scrollbar space-y-4 flex-1">
          {/* VÒNG QUAY CANVAS / SVG */}
          <div className="relative flex flex-col items-center justify-center py-2">
            {/* Kim chỉ 12h (Pointer) */}
            <div className="absolute top-0 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
              <div className="w-5 h-7 bg-gradient-to-b from-amber-300 to-amber-500 clip-pointer rounded-t-sm border border-amber-200"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm -mt-1 border border-amber-600"></div>
            </div>

            {/* Khung viền ngoài vòng quay có bóng sáng */}
            <div className="relative p-2.5 rounded-full bg-gradient-to-br from-amber-500/30 via-[#27273A] to-purple-600/30 border-2 border-amber-400/40 shadow-xl shadow-amber-500/10">
              {/* Vòng quay SVG xoay động */}
              <div
                className="w-64 h-64 sm:w-72 sm:h-72 rounded-full relative overflow-hidden select-none"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
                }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full transform">
                  {prizes.map((p, i) => {
                    const angle = 360 / prizes.length;
                    // Bắt đầu từ -22.5 độ để ô 0 nằm chính giữa đỉnh 12h
                    const startAngle = i * angle - 90 - angle / 2;
                    const endAngle = startAngle + angle;
                    const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

                    const textAngle = startAngle + angle / 2;
                    const textRad = (Math.PI * textAngle) / 180;
                    const textX = 50 + 32 * Math.cos(textRad);
                    const textY = 50 + 32 * Math.sin(textRad);

                    return (
                      <g key={p.id}>
                        <path
                          d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                          fill={p.color}
                          stroke="#111116"
                          strokeWidth="0.8"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill={p.textColor}
                          fontSize="4"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                          className="font-sans"
                        >
                          {p.icon} {p.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Tâm vòng quay (Pin Center) */}
              <button
                disabled={spinning}
                onClick={() => handleSpin(canFreeSpin ? 'free' : 'coins')}
                className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 border-2 border-white shadow-xl flex flex-col items-center justify-center text-white font-extrabold cursor-pointer active:scale-95 transition hover:brightness-110 z-20 group"
              >
                <span className="text-[11px] sm:text-xs tracking-wider uppercase drop-shadow-md">
                  {spinning ? 'Đang...' : 'QUAY'}
                </span>
                <span className="text-[9px] font-normal text-amber-100">
                  {spinning ? '🍀' : canFreeSpin ? 'Miễn phí' : `${costCoins} Điểm`}
                </span>
              </button>
            </div>
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-300 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* KHU VỰC NÚT ĐIỀU KHIỂN QUAY */}
          <div className="space-y-2.5">
            {canFreeSpin ? (
              <button
                disabled={spinning}
                onClick={() => handleSpin('free')}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-98 disabled:opacity-50"
              >
                <Gift className="w-4 h-4 animate-bounce" />
                <span>QUAY MIỄN PHÍ HÔM NAY (1/1)</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={spinning || balance < costCoins}
                  onClick={() => handleSpin('coins')}
                  className="py-2.5 px-3 bg-[#7C5CFC] hover:bg-[#6D4CF0] disabled:bg-[#1E1E28] text-white disabled:text-[#71717A] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-[#7C5CFC]/20 active:scale-98"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  <span>Quay (Dùng {costCoins} Điểm)</span>
                </button>

                <button
                  onClick={() => {
                    setIsLuckyWheelOpen(false);
                    setIsRechargeOpen(true);
                  }}
                  className="py-2.5 px-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mời Cà Phê</span>
                </button>
              </div>
            )}

            {/* Thông tin số dư và lượt quay miễn phí */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#0A0A0E] rounded-xl border border-[#1E1E28] text-[11px]">
              <div className="flex items-center gap-1.5 text-[#A1A1AA]">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Ví của bạn:</span>
                <strong className="text-white font-mono">{balance} Điểm</strong>
              </div>

              <div className="flex items-center gap-1.5 text-[#A1A1AA]">
                <Clock className="w-3.5 h-3.5 text-[#7C5CFC]" />
                {canFreeSpin ? (
                  <span className="text-emerald-400 font-semibold">Có 1 lượt miễn phí</span>
                ) : (
                  <span className="text-[#71717A]">Lượt free hồi vào 00:00</span>
                )}
              </div>
            </div>
          </div>

          {/* TAB ĐỔI XEM GIẢI THƯỞNG HOẶC LỊCH SỬ */}
          <div className="pt-2 border-t border-[#1C1C26]">
            <div className="flex items-center justify-center gap-4 text-xs">
              <button
                onClick={() => setActiveTab('wheel')}
                className={`pb-1 transition font-medium ${
                  activeTab === 'wheel' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-[#71717A] hover:text-white'
                }`}
              >
                Vòng quay
              </button>
              <button
                onClick={() => setActiveTab('prizes')}
                className={`pb-1 transition font-medium ${
                  activeTab === 'prizes' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-[#71717A] hover:text-white'
                }`}
              >
                Cơ cấu {prizes.length} giải thưởng
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-1 transition font-medium ${
                  activeTab === 'history' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-[#71717A] hover:text-white'
                }`}
              >
                Lịch sử quay của bạn
              </button>
            </div>

            {activeTab === 'prizes' && (
              <div className="grid grid-cols-2 gap-2 mt-3 animate-fadeIn">
                {prizes.map((p) => (
                  <div key={p.id} className="p-2 bg-[#0E0E14] border border-[#1E1E28] rounded-lg flex items-center gap-2">
                    <span className="text-base">{p.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.label}</div>
                      <div className="text-[10px] text-[#71717A]">{p.sublabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto no-scrollbar animate-fadeIn">
                {recentUserSpins.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[#71717A]">
                    Bạn chưa có lượt quay nào. Hãy thử vận may nhé!
                  </div>
                ) : (
                  recentUserSpins.map((s, idx) => (
                    <div key={idx} className="p-2 bg-[#0E0E14] border border-[#1E1E28] rounded-lg flex items-center justify-between text-xs">
                      <span className="text-[#A1A1AA] font-mono text-[11px]">{s.payment_code}</span>
                      <span className="font-semibold text-emerald-400 font-mono">
                        {s.coins > 0 ? `+${s.coins} Điểm` : s.coins < 0 ? `${s.coins} Điểm` : 'Lượt Free'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer bảo đảm */}
        <div className="p-2.5 bg-[#0D0D12] border-t border-[#1C1C26] text-center text-[10px] text-[#71717A] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hệ thống đối soát ngẫu nhiên tự động • Uy tín 100%</span>
        </div>
      </div>

      {/* MODAL BÁO KẾT QUẢ TRÚNG THƯỞNG */}
      {showResultModal && wonPrize && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs bg-[#14141E] border border-amber-500/50 rounded-2xl p-5 text-center space-y-3.5 shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30">
              {wonPrize.icon}
            </div>

            <div>
              <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-widest">
                {wonPrize.type !== 'none' ? '🎉 CHÚC MỪNG BẠN!' : '🍀 TIẾC QUÁ!'}
              </div>
              <h4 className="text-lg font-extrabold text-white mt-1">
                {wonPrize.label}
              </h4>
              <p className="text-xs text-[#A1A1AA] mt-1">
                {wonPrize.type === 'coins'
                  ? `Đã cộng ngay ${wonPrize.value} Điểm vào ví tài khoản của bạn!`
                  : wonPrize.type === 'vip'
                  ? `Bạn đã nhận được ${wonPrize.value} Ngày đọc truyện VIP thả ga!`
                  : 'Hôm nay chưa may mắn, đừng nản lòng lượt quay sau nhé!'}
              </p>
            </div>

            <button
              onClick={() => setShowResultModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl text-xs transition shadow-md active:scale-95"
            >
              Nhận Quà & Tiếp Tục
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
