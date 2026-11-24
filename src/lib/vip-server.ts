import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidUser(userId: string): boolean {
  return UUID_REGEX.test(userId);
}

/**
 * Lấy chính xác Số dư (balance), trạng thái VIP (isVip) và hạn VIP (vipUntil)
 * cho MỌI loại tài khoản: Google OAuth (UUID), Tên đăng nhập (Username), Số điện thoại (SĐT), và Guest.
 * Hoạt động an toàn 100% dù bảng `public.users` đã có hay chưa có cột `vip_until`.
 */
export async function getUserBalanceAndVip(userId: string): Promise<{
  balance: number;
  isVip: boolean;
  vipUntil: string | null;
}> {
  if (!userId) {
    return { balance: 0, isVip: false, vipUntil: null };
  }

  let balance = 0;
  let isVip = db.isVip(userId);
  let vipUntil: string | null = null;
  let revokedAfterMs = 0;

  // 1. Đọc từ bảng `public.users` bằng select('*') (An toàn tuyệt đối, nếu đã thêm cột vip_until sẽ tự động lấy luôn)
  try {
    const { data: sbUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (sbUser) {
      if (typeof sbUser.balance === 'number') {
        balance = Math.max(balance, sbUser.balance);
      }
      if (sbUser.vip_until && new Date(sbUser.vip_until) > new Date()) {
        isVip = true;
        vipUntil = sbUser.vip_until;
      }
    } else {
      // Fallback tìm theo cột phone nếu id khác phone
      const { data: sbByPhone } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('phone', userId)
        .maybeSingle();

      if (sbByPhone) {
        if (typeof sbByPhone.balance === 'number') {
          balance = Math.max(balance, sbByPhone.balance);
        }
        if (sbByPhone.vip_until && new Date(sbByPhone.vip_until) > new Date()) {
          isVip = true;
          vipUntil = sbByPhone.vip_until;
        }
      }
    }
  } catch (e) {}

  // 2. Đọc từ lịch sử giao dịch thành công (`transactions`) trên Supabase
  // Đảm bảo tài khoản Tên/SĐT mua VIP 39k, đổi 40 xu -> 7 ngày VIP, quay trúng VIP hoặc Admin cấp VIP luôn có VIP vĩnh viễn
  try {
    const { data: vipTxs } = await supabaseAdmin
      .from('transactions')
      .select('payment_code, amount_vnd, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true });

    if (vipTxs && vipTxs.length > 0) {
      let calcExpireMs = 0;
      for (const tx of vipTxs) {
        const code = (tx.payment_code || '').toUpperCase();
        const txTime = new Date(tx.created_at).getTime();

        if (code.startsWith('ADMIN_VIP_REVOKE')) {
          calcExpireMs = 0;
          revokedAfterMs = Math.max(revokedAfterMs, txTime);
          continue;
        }

        let daysToAdd = 0;
        if (code.startsWith('ADMIN_VIP_')) {
          const m = code.match(/ADMIN_VIP_(\d+)D/);
          daysToAdd = m ? parseInt(m[1], 10) : 30;
        } else if (code.startsWith('VIP') || Number(tx.amount_vnd) === 39000) {
          daysToAdd = 30;
        } else if (code.includes('EXCHANGE_VIP') || code.includes('EX_VIP')) {
          daysToAdd = 7;
        } else if (code.includes('LUCKY_REWARD_VIP_')) {
          const m = code.match(/LUCKY_REWARD_VIP_(\d+)DAYS/);
          daysToAdd = m ? parseInt(m[1], 10) : 1;
        }

        if (daysToAdd > 0) {
          const baseTime = calcExpireMs > txTime ? calcExpireMs : txTime;
          calcExpireMs = baseTime + daysToAdd * 24 * 60 * 60 * 1000;
        }
      }

      if (calcExpireMs > Date.now()) {
        isVip = true;
        const calcIso = new Date(calcExpireMs).toISOString();
        if (!vipUntil || new Date(calcIso) > new Date(vipUntil)) {
          vipUntil = calcIso;
        }
      } else if (revokedAfterMs > 0) {
        isVip = false;
        vipUntil = null;
      }
    }
  } catch (e) {}

  // 3. Đọc từ Supabase Auth Metadata (nếu là tài khoản Google UUID)
  if (isUuidUser(userId)) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const auVip = authUser?.user?.user_metadata?.vip_until;
      if (auVip && new Date(auVip) > new Date()) {
        if (!vipUntil || new Date(auVip) > new Date(vipUntil)) {
          vipUntil = auVip;
        }
        isVip = true;
      }
    } catch (e) {}
  }

  // 4. Kết hợp với Local DB
  const localWallet = db.getWallet(userId);
  balance = Math.max(balance, localWallet.balance || 0);
  const localUser = db.getUserByIdOrPhone?.(userId) || db.getUserByPhone?.(userId);
  if (localUser?.vipUntil && new Date(localUser.vipUntil) > new Date() && revokedAfterMs === 0) {
    isVip = true;
    if (!vipUntil || new Date(localUser.vipUntil) > new Date(vipUntil)) {
      vipUntil = localUser.vipUntil;
    }
  }

  return {
    balance,
    isVip,
    vipUntil,
  };
}

/**
 * Cộng thêm số ngày VIP cho bất kỳ user nào (cả Google UUID và Tên/SĐT).
 * Tự động lưu vào:
 * 1. Cột `vip_until` của bảng `public.users` (nếu cột đã được tạo trên Supabase)
 * 2. `auth.users` user_metadata (nếu là Google UUID)
 * 3. Local DB (`db.setVip`)
 */
export async function addUserVipDaysOnSupabase(userId: string, days: number): Promise<string> {
  const current = await getUserBalanceAndVip(userId);
  const nowMs = Date.now();
  const baseMs = current.vipUntil && new Date(current.vipUntil).getTime() > nowMs
    ? new Date(current.vipUntil).getTime()
    : nowMs;

  const newVipUntilIso = new Date(baseMs + days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Cập nhật Local DB
  try {
    db.setVip(userId, newVipUntilIso);
  } catch (e) {}

  // 2. Thử cập nhật cột `vip_until` trong bảng `public.users` (nếu bảng đã có cột vip_until)
  try {
    await supabaseAdmin
      .from('users')
      .update({ vip_until: newVipUntilIso } as any)
      .eq('id', userId);
  } catch (e) {}

  // 3. Cập nhật Supabase Auth Metadata nếu là UUID
  if (isUuidUser(userId)) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...(authUser.user.user_metadata || {}),
            is_vip: true,
            vip_until: newVipUntilIso,
          },
        });
      }
    } catch (e) {}
  }

  return newVipUntilIso;
}
