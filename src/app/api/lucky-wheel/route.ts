import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface LuckyPrize {
  id: number;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  textColor: string;
  type: 'coins' | 'vip' | 'none';
  value: number;
  weight: number;
}

const LUCKY_PRIZES: LuckyPrize[] = [
  { id: 0, label: '+2 Điểm', sublabel: 'Thưởng xu', icon: '🎁', color: '#4F46E5', textColor: '#FFFFFF', type: 'coins', value: 2, weight: 28 },
  { id: 1, label: '+5 Điểm', sublabel: 'Mở 1 tập', icon: '💎', color: '#2563EB', textColor: '#FFFFFF', type: 'coins', value: 5, weight: 20 },
  { id: 2, label: '1 Ngày VIP', sublabel: 'Đọc Full', icon: '👑', color: '#D97706', textColor: '#FFFFFF', type: 'vip', value: 1, weight: 8 },
  { id: 3, label: '+10 Điểm', sublabel: 'Gấp đôi vui', icon: '🔥', color: '#059669', textColor: '#FFFFFF', type: 'coins', value: 10, weight: 10 },
  { id: 4, label: 'May Mắn Lần Sau', sublabel: 'Cố lên nhé', icon: '🍀', color: '#374151', textColor: '#D1D5DB', type: 'none', value: 0, weight: 18 },
  { id: 5, label: '+3 Điểm', sublabel: 'Thưởng xu', icon: '⭐', color: '#DB2777', textColor: '#FFFFFF', type: 'coins', value: 3, weight: 11 },
  { id: 6, label: '3 Ngày VIP', sublabel: 'Siêu giải', icon: '🏆', color: '#EA580C', textColor: '#FFFFFF', type: 'vip', value: 3, weight: 3 },
  { id: 7, label: '+1 Điểm', sublabel: 'Thưởng nhẹ', icon: '🪙', color: '#7C3AED', textColor: '#FFFFFF', type: 'coins', value: 1, weight: 2 },
];

const SPIN_COST_COINS = 3;

function getVietnamDateStr(date: Date = new Date()): string {
  const vnDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const y = vnDate.getFullYear();
  const m = String(vnDate.getMonth() + 1).padStart(2, '0');
  const d = String(vnDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTimeUntilNextDayMs(): number {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const vnTomorrow = new Date(vnNow);
  vnTomorrow.setDate(vnTomorrow.getDate() + 1);
  vnTomorrow.setHours(0, 0, 0, 0);
  return Math.max(0, vnTomorrow.getTime() - vnNow.getTime());
}

// Danh sách trúng thưởng mẫu tạo hiệu ứng đám đông sinh động
const SAMPLE_WINNERS = [
  { name: '0347***847', prize: '10 Điểm', timeAgo: '2 phút trước' },
  { name: 'hoanggiatungchi', prize: '1 Ngày VIP', timeAgo: '5 phút trước' },
  { name: '0982***114', prize: '5 Điểm', timeAgo: '8 phút trước' },
  { name: 'Mai Dinh Dat', prize: '3 Ngày VIP', timeAgo: '14 phút trước' },
  { name: 'linhdan***', prize: '5 Điểm', timeAgo: '21 phút trước' },
  { name: '0915***662', prize: '10 Điểm', timeAgo: '35 phút trước' },
];

/**
 * GET /api/lucky-wheel?userId=...
 * Kiểm tra trạng thái lượt quay miễn phí hôm nay & danh sách giải thưởng
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const todayStr = getVietnamDateStr();
    const timeLeftMs = getTimeUntilNextDayMs();

    let canFreeSpin = true;
    let recentUserSpins: any[] = [];

    if (userId) {
      const todayFreeCode = `LUCKY_FREE_${todayStr}`;
      try {
        const { data: existingTx } = await supabaseAdmin
          .from('transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('payment_code', todayFreeCode)
          .maybeSingle();

        if (existingTx) {
          canFreeSpin = false;
        }

        // Lấy 5 lượt quay gần nhất của user
        const { data: userTxs } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .like('payment_code', 'LUCKY_%')
          .order('created_at', { ascending: false })
          .limit(5);

        if (userTxs) {
          recentUserSpins = userTxs;
        }
      } catch (err) {
        console.warn('Supabase check lucky wheel free spin error:', err);
      }
    }

    const wheelSettings = db.getLuckyWheelSettings();
    const currentPrizes = wheelSettings.prizes || LUCKY_PRIZES;
    const spinCost = wheelSettings.spinCostCoins || SPIN_COST_COINS;

    const publicPrizes = currentPrizes.map(({ weight, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      canFreeSpin,
      costCoins: spinCost,
      timeLeftMs,
      todayStr,
      prizes: publicPrizes,
      recentWinners: SAMPLE_WINNERS,
      recentUserSpins,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/lucky-wheel
 * Thực hiện quay vòng quay may mắn (server quyết định kết quả bảo mật)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, spinType = 'free' } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập để quay thưởng' }, { status: 401 });
    }

    const todayStr = getVietnamDateStr();
    const todayFreeCode = `LUCKY_FREE_${todayStr}`;

    const wheelSettings = db.getLuckyWheelSettings();
    const currentPrizes = wheelSettings.prizes || LUCKY_PRIZES;
    const spinCost = wheelSettings.spinCostCoins || SPIN_COST_COINS;

    // 1. Kiểm tra điều kiện lượt quay
    if (spinType === 'free') {
      try {
        const { data: existingTx } = await supabaseAdmin
          .from('transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('payment_code', todayFreeCode)
          .maybeSingle();

        if (existingTx) {
          return NextResponse.json({
            success: false,
            message: `Hôm nay bạn đã dùng lượt quay miễn phí rồi! Bạn có thể dùng ${spinCost} Điểm để quay tiếp.`,
            needCoins: true,
          }, { status: 400 });
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra free spin:', err);
      }
    } else {
      // Dùng điểm: kiểm tra số dư tối thiểu
      const localBal = db.getWallet(userId)?.balance || 0;
      let sbBal = 0;
      try {
        const { data: u } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', userId)
          .maybeSingle();
        sbBal = u?.balance || 0;
      } catch (e) {}

      const currentBal = Math.max(localBal, sbBal);
      if (currentBal < spinCost) {
        return NextResponse.json({
          success: false,
          message: `Bạn cần tối thiểu ${spinCost} Điểm để quay thưởng. Hãy mời cà phê để nhận thêm điểm nhé!`,
          insufficientBalance: true,
          balance: currentBal,
        }, { status: 400 });
      }
    }

    // 2. Server chọn giải thưởng ngẫu nhiên theo trọng số xác suất (Dữ liệu thật từ cấu hình Admin)
    const totalWeight = currentPrizes.reduce((sum, p) => sum + (Number(p.weight) || 0), 0) || 100;
    const rand = Math.random() * totalWeight;
    let accumulated = 0;
    let winningIndex = 0;

    for (let i = 0; i < currentPrizes.length; i++) {
      accumulated += Number(currentPrizes[i].weight) || 0;
      if (rand <= accumulated) {
        winningIndex = i;
        break;
      }
    }

    const prize = currentPrizes[winningIndex];

    // 3. Trừ phí quay (nếu là quay bằng coin)
    if (spinType === 'coins') {
      db.adjustCoins(userId, -spinCost);
      try {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', userId)
          .maybeSingle();
        const updatedBal = Math.max(0, (userRow?.balance || 0) - spinCost);
        await supabaseAdmin.from('users').update({ balance: updatedBal }).eq('id', userId);

        await supabaseAdmin.from('transactions').insert({
          id: `spin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          amount_vnd: 0,
          coins: -spinCost,
          payment_code: `LUCKY_SPIN_${Date.now()}`,
          status: 'completed',
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Lỗi trừ coin quay thưởng:', err);
      }
    } else {
      // Ghi nhận đã dùng free spin hôm nay
      try {
        await supabaseAdmin.from('transactions').insert({
          id: `free-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          amount_vnd: 0,
          coins: 0,
          payment_code: todayFreeCode,
          status: 'completed',
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Lỗi ghi nhận free spin:', err);
      }
    }

    // 4. Cộng giải thưởng vào tài khoản
    let newBalance = 0;
    let isVip = false;
    let vipUntil: string | null = null;

    if (prize.type === 'coins' && prize.value > 0) {
      db.adjustCoins(userId, prize.value);
      try {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', userId)
          .maybeSingle();
        newBalance = (userRow?.balance || 0) + prize.value;
        if (userRow) {
          await supabaseAdmin.from('users').update({ balance: newBalance, last_active: new Date().toISOString() }).eq('id', userId);
        } else {
          await supabaseAdmin.from('users').insert({
            id: userId,
            phone: userId,
            balance: newBalance,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          });
        }

        await supabaseAdmin.from('transactions').insert({
          id: `rew-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          amount_vnd: 0,
          coins: prize.value,
          payment_code: `LUCKY_REWARD_${prize.value}COINS_${Date.now()}`,
          status: 'completed',
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Lỗi cộng thưởng coin:', err);
      }
    } else if (prize.type === 'vip' && prize.value > 0) {
      isVip = true;
      const nowMs = Date.now();
      const addMs = prize.value * 24 * 60 * 60 * 1000;

      let currentVipExpire = 0;
      try {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', userId)
          .maybeSingle();
        newBalance = userRow?.balance || 0;
      } catch (e) {}

      // Lấy vip_until hiện tại nếu có
      try {
        const authRes = await supabaseAdmin.auth.admin.getUserById(userId);
        const auVip = authRes.data?.user?.user_metadata?.vip_until;
        if (auVip && new Date(auVip).getTime() > nowMs) {
          currentVipExpire = new Date(auVip).getTime();
        }
      } catch (e) {}

      const newVipTime = currentVipExpire > nowMs ? currentVipExpire + addMs : nowMs + addMs;
      vipUntil = new Date(newVipTime).toISOString();

      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { vip_until: vipUntil },
        });

        await supabaseAdmin.from('transactions').insert({
          id: `vip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          amount_vnd: 0,
          coins: 0,
          payment_code: `LUCKY_REWARD_VIP_${prize.value}DAYS_${Date.now()}`,
          status: 'completed',
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Lỗi kích hoạt VIP thưởng:', err);
      }
    } else {
      // Ô trượt / chúc may mắn
      try {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', userId)
          .maybeSingle();
        newBalance = userRow?.balance || 0;
      } catch (e) {}
    }

    // Ghi nhận vào sổ nhật ký vòng quay may mắn Real
    try {
      let uName = userId;
      let uPhone = '';
      let uEmail = '';
      let uAvatar = '';
      try {
        const { data: uData } = await supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle();
        if (uData) {
          uName = uData.name || uData.phone || uData.email || userId;
          uPhone = uData.phone || '';
          uEmail = uData.email || '';
          uAvatar = uData.avatar || '';
        }
      } catch (e) {}

      db.recordLuckyWheelSpin({
        id: `spin-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId,
        userName: uName,
        userPhone: uPhone,
        userEmail: uEmail,
        userAvatar: uAvatar,
        spinType,
        costCoins: spinType === 'coins' ? spinCost : 0,
        prizeId: prize.id,
        prizeLabel: prize.label,
        prizeSublabel: prize.sublabel,
        prizeIcon: prize.icon,
        prizeType: prize.type,
        prizeValue: prize.value,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      prizeIndex: winningIndex,
      prize: {
        id: prize.id,
        label: prize.label,
        sublabel: prize.sublabel,
        icon: prize.icon,
        type: prize.type,
        value: prize.value,
      },
      newBalance,
      isVip,
      vipUntil,
      spinType,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
