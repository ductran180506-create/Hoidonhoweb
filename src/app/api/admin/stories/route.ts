import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Story, Chapter } from '@/lib/types';
import { supabaseAdmin, toCdnUrl } from '@/lib/supabase';
import { isAuthorizedAdmin } from '@/lib/admin-auth';
import { syncGmailSacombankPayments } from '@/lib/gmail-payment';

export async function GET(req: NextRequest) {
  // KHÓA BẢO MẬT: Bắt buộc phải có phiên đăng nhập Admin hoặc Token bí mật
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối: Yêu cầu xác thực quyền Quản trị viên' },
      { status: 401 }
    );
  }

  try {
    // TỐI ƯU SIÊU TỐC: Bắn song song đồng thời 6 truy vấn bằng Promise.all với limit lớn để hiển thị FULL 100% dữ liệu
    const [
      storiesRes,
      chaptersRes,
      usersRes,
      txRes,
      unlockedRes,
      authRes
    ] = await Promise.all([
      supabaseAdmin.from('stories').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('chapters').select('*').order('chapter_number', { ascending: true }),
      supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }).limit(2000),
      supabaseAdmin.from('transactions').select('*').order('created_at', { ascending: false }).limit(2000),
      supabaseAdmin.from('unlocked_chapters').select('user_id').limit(5000),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: { users: [] }, error: null })),
    ]);

    const sbStories = storiesRes.data;
    const storyErr = storiesRes.error;
    const sbChapters = chaptersRes.data;
    const sbUsers = usersRes.data;
    const sbTx = txRes.data;
    const sbUnlocked = unlockedRes.data;

    // Lấy danh sách tài khoản xác thực Google/OAuth từ Supabase Auth
    const authUsersMap: Record<string, any> = {};
    if (authRes.data?.users) {
      authRes.data.users.forEach((au: any) => {
        authUsersMap[au.id] = au;
      });
    }

    if (!storyErr && sbStories !== null) {
      const stories: Story[] = sbStories.map(s => {
        const chaps = (sbChapters || []).filter(c => c.story_id === s.id);
        let storyStatus: 'ongoing' | 'completed' | 'upcoming' = 'completed';
        let cleanSummary = s.description || '';
        const match = cleanSummary.match(/<!--status:(ongoing|completed|upcoming)-->/);
        if (match) {
          storyStatus = match[1] as any;
          cleanSummary = cleanSummary.replace(/<!--status:(ongoing|completed|upcoming)-->/, '').trim();
        } else {
          const localSt = db.getStoryById(s.id);
          if (localSt?.status) storyStatus = localSt.status;
        }

        return {
          id: s.id,
          code: s.tiktok_code || '',
          title: s.title,
          slug: s.slug,
          coverImage: toCdnUrl(s.cover_image),
          genre: s.category || 'Tình cảm',
          summary: cleanSummary,
          views: s.views || 0,
          status: storyStatus,
          chaptersCount: chaps.length,
          createdAt: s.created_at,
        };
      });

      // Kết hợp dữ liệu tài khoản từ users table và Google auth
      const mergedUserMap: Record<string, any> = {};

      (sbUsers || []).forEach(u => {
        const au = authUsersMap[u.id];
        const unlockedCount = (sbUnlocked || []).filter(x => x.user_id === u.id).length;
        const name = au?.user_metadata?.full_name || au?.user_metadata?.name || u.name || '';
        const email = au?.email || u.email || '';
        const avatar = au?.user_metadata?.avatar_url || au?.user_metadata?.picture || u.avatar || '';
        const localWallet = db.getWallet(u.id);
        const bal = Math.max(u.balance || 0, localWallet.balance || 0);
        const vipUntil = au?.user_metadata?.vip_until || u.vip_until || null;
        const isVip = db.isVip(u.id) || Boolean(vipUntil && new Date(vipUntil) > new Date());

        mergedUserMap[u.id] = {
          id: u.id,
          phone: u.phone,
          name: name || u.phone || u.id,
          email,
          avatar,
          balance: bal,
          coins: bal,
          isVip,
          vipUntil,
          unlockedCount,
          createdAt: u.created_at,
        };
      });

      // Thêm các tài khoản Google đã đăng nhập qua Supabase Auth mà chưa có trong table users
      Object.values(authUsersMap).forEach(au => {
        if (!mergedUserMap[au.id]) {
          const unlockedCount = (sbUnlocked || []).filter(x => x.user_id === au.id).length;
          const name = au.user_metadata?.full_name || au.user_metadata?.name || au.email?.split('@')[0] || 'Google User';
          const localWallet = db.getWallet(au.id);
          const bal = localWallet.balance || 0;
          const vipUntil = au.user_metadata?.vip_until || null;
          const isVip = db.isVip(au.id) || Boolean(vipUntil && new Date(vipUntil) > new Date());

          mergedUserMap[au.id] = {
            id: au.id,
            phone: au.email || au.id,
            name,
            email: au.email || '',
            avatar: au.user_metadata?.avatar_url || au.user_metadata?.picture || '',
            balance: bal,
            coins: bal,
            isVip,
            vipUntil,
            unlockedCount,
            createdAt: au.created_at,
          };
        }
      });

      // Thêm các tài khoản từ giao dịch nạp tiền Supabase (nếu chưa có trong danh sách)
      (sbTx || []).forEach(t => {
        if (t.user_id && !mergedUserMap[t.user_id]) {
          const au = authUsersMap[t.user_id];
          const localWallet = db.getWallet(t.user_id);
          const bal = localWallet.balance || 0;
          mergedUserMap[t.user_id] = {
            id: t.user_id,
            phone: au?.email || t.user_id,
            name: au?.user_metadata?.full_name || au?.user_metadata?.name || (au?.email ? au.email.split('@')[0] : t.user_id),
            email: au?.email || '',
            avatar: au?.user_metadata?.avatar_url || '',
            balance: bal,
            coins: bal,
            isVip: false,
            vipUntil: null,
            unlockedCount: (sbUnlocked || []).filter(x => x.user_id === t.user_id).length,
            createdAt: t.created_at,
          };
        }
      });

      const isUuidStr = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(str));

      const knownAccounts: Record<string, { name: string; email: string }> = {
        '196cd142-a1d6-485b-bddb-1bce5ca2472b': { name: 'Đức Công', email: 'congducc2k6@gmail.com' },
        '3637e437-b9a4-47aa-bda7-d6c1140a234a': { name: 'Duc Tran', email: 'ductran.180506@gmail.com' },
        'a6599dfe-0bea-4345-9070-ad2ac38672cc': { name: 'Phạm Trần Anh Phúc', email: 'phamtrananhphuc1442006@gmail.com' },
      };

      // Thêm các tài khoản đăng ký cục bộ từ Local DB
      db.getAllUsersWithWallets().forEach((u: any) => {
        if (!mergedUserMap[u.id]) {
          const au = authUsersMap[u.id];
          const known = knownAccounts[u.id];
          mergedUserMap[u.id] = {
            id: u.id,
            phone: u.phone,
            name: known?.name || au?.user_metadata?.full_name || u.name || u.phone,
            email: known?.email || au?.email || u.email || '',
            avatar: au?.user_metadata?.avatar_url || '',
            balance: u.balance || 0,
            coins: u.coins || 0,
            isVip: u.isVip,
            vipUntil: u.vipUntil || null,
            unlockedCount: u.unlockedCount || 0,
            createdAt: u.createdAt,
          };
        }
      });

      // Đọc các đơn từ Local DB trước để tính toán nạp tiền
      const localOrders = db.getAllOrders();

      // Đưa thêm tất cả độc giả đã nạp tiền từ localOrders vào mergedUserMap nếu chưa có
      localOrders.forEach(lo => {
        if (!lo.userId) return;
        if (!mergedUserMap[lo.userId]) {
          const w = db.getWallet(lo.userId);
          const bal = (w && w.balance > 0) ? w.balance : (lo.status === 'completed' ? (lo.coinsReceived || 0) : 0);
          const known = knownAccounts[lo.userId];
          mergedUserMap[lo.userId] = {
            id: lo.userId,
            phone: lo.userPhone || (lo.userEmail ? lo.userEmail : lo.userId),
            name: known?.name || lo.userName || lo.userId,
            email: known?.email || lo.userEmail || '',
            avatar: '',
            balance: bal,
            coins: bal,
            isVip: Boolean(lo.vipDaysReceived && lo.vipDaysReceived > 0),
            vipUntil: lo.vipDaysReceived ? new Date(new Date(lo.createdAt).getTime() + lo.vipDaysReceived * 86400000).toISOString() : null,
            unlockedCount: 0,
            createdAt: lo.createdAt,
          };
        }
      });

      // Tính toán chi tiết số tiền nạp & phương thức đăng nhập cho từng độc giả
      Object.values(mergedUserMap).forEach((u: any) => {
        const userTxs = (sbTx || []).filter(t => t.user_id === u.id && t.status === 'completed');
        const userLocalOrders = localOrders.filter(lo => lo.userId === u.id && lo.status === 'completed');
        
        let totalPaid = 0;
        let totalCoinsFromOrders = 0;
        userTxs.forEach(t => { totalPaid += Number(t.amount_vnd) || 0; });
        userLocalOrders.forEach(lo => {
          if (!userTxs.some(t => t.payment_code === lo.orderCode)) {
            totalPaid += Number(lo.amountVnd) || 0;
          }
          totalCoinsFromOrders += Number(lo.coinsReceived) || 0;
        });

        u.totalRechargedVnd = totalPaid;
        u.hasRecharged = totalPaid > 0;
        u.isGoogle = Boolean(knownAccounts[u.id] || authUsersMap[u.id] || (u.email && u.email.includes('@')));

        // Chuẩn hóa tên hiển thị: Nếu là tài khoản đã biết hoặc có tên từ đơn chuyển khoản
        if (knownAccounts[u.id]) {
          u.name = knownAccounts[u.id].name;
          u.email = knownAccounts[u.id].email;
          u.isGoogle = true;
        } else if (!u.name || u.name === u.id || isUuidStr(u.name) || u.name.startsWith('customer-')) {
          const matchingOrder = userLocalOrders.find(lo => lo.userName && !lo.userName.startsWith('customer-') && !isUuidStr(lo.userName));
          if (matchingOrder?.userName) {
            u.name = matchingOrder.userName;
          }
          if (matchingOrder?.userEmail && !u.email) {
            u.email = matchingOrder.userEmail;
          }
          if (matchingOrder?.userPhone && (!u.phone || u.phone === u.id)) {
            u.phone = matchingOrder.userPhone;
          }
        }

        // Đảm bảo số dư điểm hiển thị đúng số điểm tích lũy của khách hàng
        if ((!u.coins || u.coins === 0) && totalCoinsFromOrders > 0) {
          u.coins = totalCoinsFromOrders;
          u.balance = totalCoinsFromOrders;
        }

        // TỰ ĐỘNG ĐỒNG BỘ VIP ĐẦY ĐỦ (Gói VIP 39k, Đổi 40 Điểm 7 Ngày, Vòng Quay VIP, Admin Cấp/Thu Hồi VIP)
        const sortedUserTxs = [...userTxs].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        let calcExpireMs = 0;
        let revokedAfterMs = 0;
        for (const tx of sortedUserTxs) {
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
          u.isVip = true;
          const calcIso = new Date(calcExpireMs).toISOString();
          if (!u.vipUntil || new Date(u.vipUntil) < new Date(calcIso)) {
            u.vipUntil = calcIso;
          }
        } else if (u.vipUntil && new Date(u.vipUntil) > new Date() && revokedAfterMs === 0) {
          u.isVip = true;
        } else if (revokedAfterMs > 0) {
          u.isVip = false;
          u.vipUntil = null;
        }
      });

      // Loại bỏ các tài khoản khách vãng lai rác (guest-...) chưa từng nạp tiền, 0 điểm, 0 tập mở
      const users = Object.values(mergedUserMap)
        .filter((u: any) => {
          const idStr = String(u.id || '');
          if (idStr.startsWith('guest-') && (u.coins || 0) <= 0 && (u.totalRechargedVnd || 0) <= 0 && (u.unlockedCount || 0) <= 0 && !u.isVip) {
            return false;
          }
          return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Hàm kiểm tra các giao dịch nội bộ hệ thống (Điểm danh / Vòng quay) để tách riêng khỏi Sổ Chuyển Khoản
      const isInternalNonOrderTx = (code?: string) => {
        if (!code) return false;
        return code.startsWith('CHECKIN_') || code.startsWith('LUCKY_') || code.startsWith('FREE_SPIN_');
      };

      const orderMap: Record<string, any> = {};

      // 1. Thêm đơn từ Local DB
      localOrders.filter(lo => !isInternalNonOrderTx(lo.orderCode)).forEach(lo => {
        const u = mergedUserMap[lo.userId];
        orderMap[lo.orderCode] = {
          ...lo,
                    userName: lo.userName || u?.name || u?.email || (lo.userId && !lo.userId.startsWith("customer-") ? lo.userId : "Độc giả chuyển khoản"),
          userEmail: u?.email || lo.userEmail || '',
          userPhone: lo.userPhone || u?.phone || '',
        };
      });

      // Tự động quét Gmail Sacombank nếu đang có đơn pending hoặc processing trong 48 giờ gần nhất
      let newlyMatched: string[] = [];
      if ((sbTx || []).some(t => (t.status === 'pending' || t.status === 'processing') && (Date.now() - new Date(t.created_at).getTime() <= 48 * 60 * 60 * 1000))) {
        try {
          const syncRes = await syncGmailSacombankPayments();
          newlyMatched = syncRes.matchedOrders;
        } catch {}
      }

      // 2. Gộp với giao dịch nạp tiền từ Supabase (loại trừ các giao dịch tặng điểm danh và quay thưởng)
      (sbTx || []).filter(t => !isInternalNonOrderTx(t.payment_code)).forEach(t => {
        const u = mergedUserMap[t.user_id];
        const existing = orderMap[t.payment_code];
        const status = (t.status === 'completed' || existing?.status === 'completed' || newlyMatched.includes(t.payment_code))
          ? 'completed'
          : (t.status === 'processing' || existing?.status === 'processing')
          ? 'processing'
          : (t.status || existing?.status || 'pending');
        const isVip = t.payment_code?.startsWith('VIP');
        const sbFinalName = (existing?.userName && !isUuidStr(existing.userName))
          ? existing.userName
          : (u?.name && !isUuidStr(u.name))
          ? u.name
          : (u?.email ? u.email.split('@')[0] : 'Độc giả chuyển khoản');
        orderMap[t.payment_code] = {
          id: t.id || existing?.id,
          orderCode: t.payment_code,
          userId: t.user_id,
          userName: sbFinalName,
          userEmail: u?.email || existing?.userEmail || '',
          userPhone: u?.phone || existing?.userPhone || '',
          packageType: existing?.packageType || (isVip ? 'VIP_39K' : 'COIN'),
          amountVnd: Number(t.amount_vnd) || existing?.amountVnd || 0,
          coinsReceived: Number(t.coins) || existing?.coinsReceived || 0,
          vipDaysReceived: existing?.vipDaysReceived || (isVip ? 30 : 0),
          status,
          createdAt: t.created_at || existing?.createdAt,
        };
      });

      // Phân loại đơn: thành công, đang xử lý / đang chờ (chưa quá 15p), và đã hết hạn (quá 15p)
      const orders = Object.values(orderMap).map(o => {
        if (o.status === 'completed') return o;
        const createdTime = new Date(o.createdAt || Date.now()).getTime();
        const ageMs = Date.now() - createdTime;
        if (ageMs > 15 * 60 * 1000) {
          return { ...o, status: 'expired' };
        }
        return { ...o, status: o.status === 'processing' ? 'processing' : 'pending' };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // TÁCH VÀ CHUYỂN HẾT TOÀN BỘ DỮ LIỆU NGƯỜI DÙNG QUAY THƯỞNG SANG MỤC VÒNG QUAY MAY MẮN
      const localSpinLogs = db.getLuckyWheelHistory();
      const existingSpinLogCodes = new Set(localSpinLogs.map(l => l.prizeSublabel || l.id));

      const luckyTxs = (sbTx || []).filter(t => t.payment_code && (t.payment_code.startsWith('LUCKY_') || t.payment_code.startsWith('FREE_SPIN_')));
      
      const mappedSbSpins = luckyTxs.map(t => {
        const u = mergedUserMap[t.user_id];
        const code = t.payment_code || '';
        let spinType: 'free' | 'coins' = code.startsWith('FREE_SPIN_') ? 'free' : 'coins';
        let prizeType: 'coins' | 'vip' | 'none' = 'none';
        let prizeLabel = 'Lượt quay thưởng';
        let prizeIcon = '🎡';
        let prizeValue = 0;
        let costCoins = 0;

        if (code.startsWith('LUCKY_SPIN_')) {
          costCoins = Math.abs(Number(t.coins) || 3);
          prizeLabel = 'Quay bằng điểm';
          prizeIcon = '🪙';
        } else if (code.startsWith('FREE_SPIN_')) {
          prizeLabel = 'Lượt quay miễn phí';
          prizeIcon = '🎁';
        } else if (code.startsWith('LUCKY_REWARD_VIP_')) {
          prizeType = 'vip';
          const match = code.match(/VIP_(\d+)DAYS/);
          prizeValue = match ? parseInt(match[1]) : 1;
          prizeLabel = `+${prizeValue} Ngày VIP`;
          prizeIcon = '👑';
        } else if (code.startsWith('LUCKY_REWARD_')) {
          prizeType = 'coins';
          prizeValue = Math.max(0, Number(t.coins) || 0);
          prizeLabel = `+${prizeValue} Điểm Xu`;
          prizeIcon = '💎';
        }

        return {
          id: t.id || `tx-${t.created_at}`,
          userId: t.user_id,
          userName: u?.name || u?.email || t.user_id,
          userPhone: u?.phone || '',
          userEmail: u?.email || '',
          userAvatar: u?.avatar || '',
          spinType,
          costCoins,
          prizeId: 0,
          prizeLabel,
          prizeSublabel: code,
          prizeIcon,
          prizeType,
          prizeValue,
          createdAt: t.created_at,
        };
      });

      const allLuckySpins = [
        ...localSpinLogs,
        ...mappedSbSpins.filter(s => !existingSpinLogCodes.has(s.prizeSublabel) && !existingSpinLogCodes.has(s.id))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((acc, o) => acc + (Number(o.amountVnd) || 0), 0);

      return NextResponse.json({
        success: true,
        source: 'supabase',
        stories,
        users,
        stats: {
          totalStories: stories.length,
          totalOrders: orders.length,
          completedOrders: orders.filter(o => o.status === 'completed').length,
          pendingOrders: orders.filter(o => o.status === 'pending').length,
          expiredOrders: orders.filter(o => o.status === 'expired').length,
          totalRevenue,
          totalUsers: users.length,
          totalLuckySpins: allLuckySpins.length,
        },
        orders,
        luckySpins: allLuckySpins,
        chapterTips: db.getChapterTips(),
      });
    }
  } catch (err) {
    console.warn('Lỗi đọc Supabase, fallback sang local:', err);
  }

  const stories = db.getStories();
  const rawOrders = db.getAllOrders();
  const orders = rawOrders.map(o => {
    if (o.status === 'completed') return o;
    const ageMs = Date.now() - new Date(o.createdAt).getTime();
    if (ageMs > 15 * 60 * 1000) return { ...o, status: 'expired' };
    return { ...o, status: 'pending' };
  });
  const users = db.getAllUsersWithWallets();
  
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((acc, o) => acc + o.amountVnd, 0);

  return NextResponse.json({
    success: true,
    source: 'local',
    stories,
    users,
    stats: {
      totalStories: stories.length,
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      expiredOrders: orders.filter(o => o.status === 'expired').length,
      totalRevenue,
      totalUsers: users.length,
    },
    orders: orders.slice(0, 50),
    luckySpins: db.getLuckyWheelHistory(),
    chapterTips: db.getChapterTips(),
  });
}

export async function POST(req: NextRequest) {
  // KHÓA BẢO MẬT: Bắt buộc phải có quyền Admin mới được thêm/xóa truyện hoặc điều chỉnh tiền
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối: Yêu cầu xác thực quyền Quản trị viên' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_story') {
      const { code, title, coverImage, genre, summary, chapters, status } = body;
      const storyStatus: 'ongoing' | 'completed' | 'upcoming' =
        status === 'ongoing' || status === 'upcoming' ? status : 'completed';
      const cleanSummary = (summary || '').replace(/<!--status:(ongoing|completed|upcoming)-->/g, '').trim();
      const packedSummary = `<!--status:${storyStatus}-->${cleanSummary}`;

      if (!code || !title) {
        return NextResponse.json({ success: false, message: 'Thiếu mã hoặc tiêu đề truyện' }, { status: 400 });
      }

      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      const storyId = `story-${Date.now()}`;

      // Lọc và lưu các tập: Nếu tập sắp ra mắt chưa có ảnh riêng nhưng truyện có ảnh bìa, tự động dùng ảnh bìa làm preview
      const validChapters = Array.isArray(chapters)
        ? chapters.map((chap: any) => {
            let imgs: string[] = [];
            if (Array.isArray(chap.images) && chap.images.length > 0) {
              imgs = chap.images;
            } else if (typeof chap.imageLinks === 'string' && chap.imageLinks.trim().length > 0) {
              imgs = chap.imageLinks.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
            }
            if (imgs.length === 0 && coverImage) {
              imgs = [coverImage];
            }
            return {
              ...chap,
              images: imgs,
            };
          }).filter((chap: any) => {
            const hasImages = Array.isArray(chap.images) && chap.images.length > 0;
            const hasContent = typeof chap.content === 'string' && chap.content.trim().length > 0;
            return hasImages || hasContent;
          })
        : [];

      const newStory: Story = {
        id: storyId,
        code: code.replace('#', '').trim(),
        title,
        slug,
        coverImage: coverImage || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop",
        genre: genre || "Kinh Dị",
        summary: cleanSummary,
        views: 1,
        status: storyStatus,
        chaptersCount: validChapters.length,
        createdAt: new Date().toISOString(),
      };

      try {
        await supabaseAdmin.from('stories').upsert({
          id: newStory.id,
          title: newStory.title,
          slug: newStory.slug,
          tiktok_code: newStory.code,
          description: packedSummary,
          cover_image: newStory.coverImage,
          category: newStory.genre,
          is_hot: false,
          views: 1,
          created_at: newStory.createdAt
        });

        for (let idx = 0; idx < validChapters.length; idx++) {
          const chap = validChapters[idx];
          let images: string[] = [];
          if (Array.isArray(chap.images)) {
            images = chap.images;
          } else if (typeof chap.imageLinks === 'string' && chap.imageLinks.trim()) {
            images = chap.imageLinks.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
          }

          await supabaseAdmin.from('chapters').upsert({
            id: `chap-${storyId}-${idx + 1}`,
            story_id: storyId,
            chapter_number: idx + 1,
            title: chap.title || `Tập ${idx + 1}`,
            price: typeof chap.priceCoins === 'number' ? chap.priceCoins : (idx === 0 ? 0 : 5),
            images,
            created_at: new Date().toISOString()
          });
        }
      } catch (sbErr) {
        console.warn('Lỗi lưu Supabase:', sbErr);
      }

      db.addStory(newStory);
      validChapters.forEach((chap: any, idx: number) => {
        let images: string[] = [];
        if (Array.isArray(chap.images)) {
          images = chap.images;
        } else if (typeof chap.imageLinks === 'string' && chap.imageLinks.trim()) {
          images = chap.imageLinks.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
        }

        db.addChapter({
          id: `chap-${newStory.id}-${idx + 1}`,
          storyId: newStory.id,
          chapterIndex: idx + 1,
          title: chap.title || `Tập ${idx + 1}`,
          content: chap.content || "",
          images,
          priceCoins: typeof chap.priceCoins === 'number' ? chap.priceCoins : (idx === 0 ? 0 : 5),
          createdAt: new Date().toISOString(),
        });
      });

      return NextResponse.json({ success: true, story: newStory });
    }

    if (action === 'update_story') {
      const { storyId, code, title, coverImage, genre, summary, chapters, status } = body;
      const storyStatus: 'ongoing' | 'completed' | 'upcoming' =
        status === 'ongoing' || status === 'upcoming' ? status : 'completed';
      const cleanSummary = (summary || '').replace(/<!--status:(ongoing|completed|upcoming)-->/g, '').trim();
      const packedSummary = `<!--status:${storyStatus}-->${cleanSummary}`;

      if (!storyId || !code || !title) {
        return NextResponse.json({ success: false, message: 'Thiếu mã hoặc tiêu đề bộ truyện' }, { status: 400 });
      }

      const slug = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      const cleanCode = code.replace('#', '').trim();

      // Lọc và lưu các tập: Nếu tập sắp ra mắt chưa có ảnh riêng nhưng truyện có ảnh bìa, tự động dùng ảnh bìa làm preview
      const validChapters = Array.isArray(chapters)
        ? chapters.map((chap: any) => {
            let imgs: string[] = [];
            if (Array.isArray(chap.images) && chap.images.length > 0) {
              imgs = chap.images;
            } else if (typeof chap.imageLinks === 'string' && chap.imageLinks.trim().length > 0) {
              imgs = chap.imageLinks.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
            }
            if (imgs.length === 0 && coverImage) {
              imgs = [coverImage];
            }
            return {
              ...chap,
              images: imgs,
            };
          }).filter((chap: any) => {
            const hasImages = Array.isArray(chap.images) && chap.images.length > 0;
            const hasContent = typeof chap.content === 'string' && chap.content.trim().length > 0;
            return hasImages || hasContent;
          })
        : [];

      // 1. Cập nhật Supabase
      try {
        await supabaseAdmin.from('stories').update({
          title,
          slug,
          tiktok_code: cleanCode,
          description: packedSummary,
          cover_image: coverImage || '',
          category: genre || 'Tình cảm',
          updated_at: new Date().toISOString()
        }).eq('id', storyId);

        // Xóa các tập cũ và ghi lại danh sách tập mới đã lọc
        await supabaseAdmin.from('chapters').delete().eq('story_id', storyId);

        for (let idx = 0; idx < validChapters.length; idx++) {
          const chap = validChapters[idx];
          let images: string[] = [];
          if (Array.isArray(chap.images)) {
            images = chap.images;
          } else if (typeof chap.imageLinks === 'string' && chap.imageLinks.trim()) {
            images = chap.imageLinks.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
          }

          await supabaseAdmin.from('chapters').upsert({
            id: `chap-${storyId}-${idx + 1}`,
            story_id: storyId,
            chapter_number: idx + 1,
            title: chap.title || `Tập ${idx + 1}`,
            price: typeof chap.priceCoins === 'number' ? chap.priceCoins : (idx === 0 ? 0 : 5),
            images,
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('Lỗi update story Supabase:', err);
      }

      // 2. Cập nhật Local DB
      const validChaptersLocal = validChapters;

      db.updateStory(storyId, {
        code: cleanCode,
        title,
        slug,
        coverImage,
        genre,
        summary: cleanSummary,
        status: storyStatus,
        chaptersCount: validChaptersLocal.length,
      });

      const newLocalChapters: Chapter[] = validChaptersLocal.map((chap: any, idx: number) => {
        let images: string[] = [];
        if (Array.isArray(chap.images)) {
          images = chap.images;
        } else if (typeof chap.imageLinks === 'string' && chap.imageLinks.trim()) {
          images = chap.imageLinks.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
        }
        return {
          id: `chap-${storyId}-${idx + 1}`,
          storyId,
          chapterIndex: idx + 1,
          title: chap.title || `Tập ${idx + 1}`,
          content: chap.content || "",
          images,
          priceCoins: typeof chap.priceCoins === 'number' ? chap.priceCoins : (idx === 0 ? 0 : 5),
          createdAt: new Date().toISOString(),
        };
      });
      db.replaceChaptersForStory(storyId, newLocalChapters);

      return NextResponse.json({ success: true, message: 'Đã cập nhật bộ truyện thành công' });
    }

    if (action === 'quick_update_status') {
      const { storyId, status } = body;
      if (!storyId || !status) {
        return NextResponse.json({ success: false, message: 'Thiếu thông tin cập nhật' }, { status: 400 });
      }
      const validStatus: 'ongoing' | 'completed' | 'upcoming' =
        status === 'ongoing' || status === 'upcoming' ? status : 'completed';

      try {
        const { data: currentStory } = await supabaseAdmin.from('stories').select('description').eq('id', storyId).single();
        const cleanDesc = (currentStory?.description || '').replace(/<!--status:(ongoing|completed|upcoming)-->/g, '').trim();
        const packedDesc = `<!--status:${validStatus}-->${cleanDesc}`;
        await supabaseAdmin.from('stories').update({
          description: packedDesc,
          updated_at: new Date().toISOString(),
        }).eq('id', storyId);
      } catch (sbErr) {
        console.warn('Lỗi update status Supabase:', sbErr);
      }

      db.updateStory(storyId, { status: validStatus });
      return NextResponse.json({ success: true, status: validStatus });
    }

    if (action === 'delete_story') {
      const { storyId } = body;
      try {
        await supabaseAdmin.from('stories').delete().eq('id', storyId);
      } catch (err) {
        console.warn('Lỗi xóa Supabase:', err);
      }
      db.deleteStory(storyId);
      return NextResponse.json({ success: true });
    }

    if (action === 'adjust_coins') {
      const { userId, amount } = body;
      try {
        const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', userId).maybeSingle();
        if (user) {
          const newBal = Math.max(0, (user?.balance || 0) + Number(amount));
          await supabaseAdmin.from('users').update({ balance: newBal }).eq('id', userId);
        } else {
          // Người dùng Google chưa có hàng trong public.users
          const localBal = db.getWallet(userId).balance;
          const newBal = Math.max(0, localBal + Number(amount));
          await supabaseAdmin.from('users').insert({
            id: userId,
            phone: userId,
            balance: newBal,
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('Lỗi điều chỉnh coin Supabase:', err);
      }
      const updated = db.adjustCoins(userId, Number(amount));
      return NextResponse.json({ success: true, wallet: updated });
    }

    if (action === 'toggle_vip') {
      const { userId, days = 30 } = body;
      const { getUserBalanceAndVip, addUserVipDaysOnSupabase } = await import('@/lib/vip-server');
      const currentStatus = await getUserBalanceAndVip(userId);
      const isCurrentlyVip = currentStatus.isVip;
      let newVipUntil: string | null = null;

      if (!isCurrentlyVip) {
        newVipUntil = await addUserVipDaysOnSupabase(userId, Number(days));
        try {
          await supabaseAdmin.from('transactions').insert({
            id: `adm-vip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            user_id: userId,
            amount_vnd: 0,
            coins: 0,
            payment_code: `ADMIN_VIP_${Number(days)}D_${Date.now()}`,
            status: 'completed',
            created_at: new Date().toISOString(),
          });
        } catch (e) {}
      } else {
        // Hủy VIP trên cả Local DB, Supabase users, Auth Metadata và Transactions
        db.setVip(userId, null);
        try {
          await supabaseAdmin.from('users').update({ vip_until: null } as any).eq('id', userId);
        } catch (e) {}
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (authUser?.user) {
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: {
                ...(authUser.user.user_metadata || {}),
                is_vip: false,
                vip_until: null,
              },
            });
          }
        } catch (e) {}
        try {
          await supabaseAdmin.from('transactions').insert({
            id: `adm-rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            user_id: userId,
            amount_vnd: 0,
            coins: 0,
            payment_code: `ADMIN_VIP_REVOKE_${Date.now()}`,
            status: 'completed',
            created_at: new Date().toISOString(),
          });
        } catch (e) {}
      }

      return NextResponse.json({ success: true, isVip: Boolean(newVipUntil), vipUntil: newVipUntil });
    }

    if (action === 'compensate_all_users') {
      const { amount = 5, target = 'all' } = body;
      const bonusCoins = Math.max(1, Math.min(500, Number(amount) || 5));

      try {
        const [{ data: sbUsers }, { data: authList }, { data: sbTxs }] = await Promise.all([
          supabaseAdmin.from('users').select('id, phone, balance').limit(5000),
          supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
          supabaseAdmin.from('transactions').select('user_id, amount_vnd, status').eq('status', 'completed').gt('amount_vnd', 0),
        ]);

        const rechargedSet = new Set((sbTxs || []).map((t: any) => t.user_id));
        const userRowsMap = new Map<string, { id: string; phone: string; balance: number; existsInTable: boolean }>();

        (sbUsers || []).forEach((u: any) => {
          if (String(u.id).startsWith('guest-') && (u.balance || 0) <= 0 && !rechargedSet.has(u.id)) {
            return;
          }
          userRowsMap.set(u.id, {
            id: u.id,
            phone: u.phone || u.id,
            balance: Number(u.balance) || 0,
            existsInTable: true,
          });
        });

        (authList?.users || []).forEach((au: any) => {
          if (!userRowsMap.has(au.id)) {
            userRowsMap.set(au.id, {
              id: au.id,
              phone: au.email || au.id,
              balance: 0,
              existsInTable: false,
            });
          }
        });

        const targets = Array.from(userRowsMap.values()).filter((u) => {
          if (target === 'recharged') return rechargedSet.has(u.id);
          return true;
        });

        // Cập nhật theo batch 30 người/lần để cực nhanh và không nghẽn kết nối
        const BATCH_SIZE = 30;
        let updatedCount = 0;
        for (let i = 0; i < targets.length; i += BATCH_SIZE) {
          const chunk = targets.slice(i, i + BATCH_SIZE);
          await Promise.all(
            chunk.map(async (u) => {
              const newBal = u.balance + bonusCoins;
              if (u.existsInTable) {
                await supabaseAdmin.from('users').update({ balance: newBal }).eq('id', u.id);
              } else {
                await supabaseAdmin.from('users').insert({
                  id: u.id,
                  phone: u.phone,
                  balance: newBal,
                  created_at: new Date().toISOString(),
                });
              }
              db.adjustCoins(u.id, bonusCoins);
              updatedCount++;
            })
          );
        }

        return NextResponse.json({
          success: true,
          count: updatedCount,
          amount: bonusCoins,
          message: `🎁 Đã phát quà đền bù +${bonusCoins} Điểm cho ${updatedCount} độc giả thành công!`,
        });
      } catch (err: any) {
        return NextResponse.json(
          { success: false, message: 'Lỗi phát quà đền bù: ' + err.message },
          { status: 500 }
        );
      }
    }

    if (action === 'cleanup_test_data') {
      const { clearAllOrders = false } = body;
      // 1. Dọn dẹp Local DB
      db.cleanupTestData(clearAllOrders);

      // 2. Dọn dẹp Supabase transactions & test users
      try {
        if (clearAllOrders) {
          await supabaseAdmin.from('transactions').delete().neq('id', 'keep_none');
        } else {
          await supabaseAdmin.from('transactions').delete().like('user_id', 'audit_user_%');
          await supabaseAdmin.from('transactions').delete().like('user_id', 'test_truth_%');
        }
        await supabaseAdmin.from('users').delete().like('id', 'audit_user_%');
        await supabaseAdmin.from('users').delete().like('id', 'test_truth_%');
      } catch (sbCleanErr) {
        console.warn('Lỗi dọn test Supabase:', sbCleanErr);
      }

      return NextResponse.json({ success: true, message: 'Đã dọn dẹp sạch sẽ tài khoản và đơn hàng test' });
    }

    if (action === 'approve_order') {
      const { orderCode } = body;
      if (!orderCode) {
        return NextResponse.json({ success: false, message: 'Thiếu mã đơn cần duyệt' }, { status: 400 });
      }

      // 1. Tìm thông tin đơn hàng trong Supabase transactions TRƯỚC
      let targetOrder: any = null;
      try {
        const { data: sbTx } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('payment_code', orderCode)
          .maybeSingle();

        if (sbTx) {
          const isVip = sbTx.payment_code.startsWith('VIP');
          targetOrder = {
            id: sbTx.id,
            orderCode: sbTx.payment_code,
            userId: sbTx.user_id,
            amountVnd: sbTx.amount_vnd,
            coins: sbTx.coins || (isVip ? 50 : 20),
            isVip,
            vipDays: isVip ? 30 : 0,
          };
        }
      } catch (sbErr) {
        console.warn('Lỗi query Supabase transactions:', sbErr);
      }

      // Fallback sang local DB nếu Supabase không thấy
      if (!targetOrder) {
        const localOrder = db.getOrderByCode(orderCode);
        if (localOrder) {
          const isVip = localOrder.packageType === 'VIP_39K' || (localOrder.vipDaysReceived || 0) > 0;
          targetOrder = {
            id: localOrder.id,
            orderCode: localOrder.orderCode,
            userId: localOrder.userId,
            amountVnd: localOrder.amountVnd,
            coins: localOrder.coinsReceived,
            isVip,
            vipDays: localOrder.vipDaysReceived || 0,
          };
        }
      }

      if (!targetOrder) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy thông tin đơn hàng' }, { status: 404 });
      }

      // 2. Cập nhật transaction thành completed và cộng tiền user trong Supabase (chống cộng trùng 100%)
      try {
        const { data: updatedRows, error: updateErr } = await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed' })
          .eq('payment_code', orderCode)
          .in('status', ['pending', 'processing', 'expired', 'cancelled'])
          .select('id');

        if (!updateErr && (!updatedRows || updatedRows.length === 0)) {
          return NextResponse.json({
            success: true,
            message: `Đơn hàng ${orderCode} đã được cộng điểm hoàn tất trước đó!`,
          });
        }

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', targetOrder.userId)
          .maybeSingle();

        const newBal = (user?.balance || 0) + (targetOrder.coins || 0);

        if (user) {
          await supabaseAdmin.from('users').update({ balance: newBal, last_active: new Date().toISOString() }).eq('id', targetOrder.userId);
        } else {
          await supabaseAdmin.from('users').insert({
            id: targetOrder.userId,
            phone: targetOrder.userId,
            balance: newBal,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
          });
        }

        if (targetOrder.isVip) {
          const { addUserVipDaysOnSupabase } = await import('@/lib/vip-server');
          await addUserVipDaysOnSupabase(targetOrder.userId, targetOrder.vipDays || 30);
        }
      } catch (err) {
        console.warn('Lỗi duyệt đơn Supabase:', err);
      }

      // 3. Đồng bộ local DB
      try {
        db.completeOrder(orderCode);
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Đã duyệt thành công đơn ${orderCode}, đã cộng ${targetOrder.coins} điểm cho ${targetOrder.userId}`,
      });
    }

    if (action === 'get_lucky_wheel_settings') {
      const settings = db.getLuckyWheelSettings();
      return NextResponse.json({ success: true, settings });
    }

    if (action === 'update_lucky_wheel_settings') {
      const { settings } = body;
      if (!settings || !Array.isArray(settings.prizes) || settings.prizes.length < 2 || settings.prizes.length > 24) {
        return NextResponse.json({ success: false, message: 'Cấu hình giải thưởng không hợp lệ (cần từ 2 đến 24 giải thưởng)' }, { status: 400 });
      }

      const updated = db.saveLuckyWheelSettings(settings);
      return NextResponse.json({
        success: true,
        message: 'Đã lưu cấu hình giải thưởng & tỉ lệ vòng quay thành công!',
        settings: updated,
      });
    }

    return NextResponse.json({ success: false, message: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
