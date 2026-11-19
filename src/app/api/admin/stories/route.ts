import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Story, Chapter } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthorizedAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  // KHÓA BẢO MẬT: Bắt buộc phải có phiên đăng nhập Admin hoặc Token bí mật
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối: Yêu cầu xác thực quyền Quản trị viên' },
      { status: 401 }
    );
  }

  try {
    // TỐI ƯU SIÊU TỐC: Bắn song song đồng thời 6 truy vấn bằng Promise.all thay vì đợi tuần tự
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
      supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('transactions').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('unlocked_chapters').select('user_id'),
      supabaseAdmin.auth.admin.listUsers().catch(() => ({ data: { users: [] }, error: null })),
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
        return {
          id: s.id,
          code: s.tiktok_code || '',
          title: s.title,
          slug: s.slug,
          coverImage: s.cover_image,
          genre: s.category || 'Tình cảm',
          summary: s.description || '',
          views: s.views || 0,
          status: 'completed',
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

      const users = Object.values(mergedUserMap).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Kết hợp đơn hàng từ cả Supabase transactions và Local DB orders
      const localOrders = db.getAllOrders();
      const orderMap: Record<string, any> = {};

      // 1. Thêm đơn từ Local DB
      localOrders.forEach(lo => {
        const u = mergedUserMap[lo.userId];
        orderMap[lo.orderCode] = {
          ...lo,
          userName: u?.name || u?.email || lo.userId,
          userEmail: u?.email || '',
          userPhone: u?.phone || '',
        };
      });

      // 2. Gộp với giao dịch từ Supabase
      (sbTx || []).forEach(t => {
        const u = mergedUserMap[t.user_id];
        const existing = orderMap[t.payment_code];
        const status = (t.status === 'completed' || existing?.status === 'completed') ? 'completed' : (t.status || existing?.status || 'pending');
        const isVip = t.payment_code?.startsWith('VIP');
        orderMap[t.payment_code] = {
          id: t.id || existing?.id,
          orderCode: t.payment_code,
          userId: t.user_id,
          userName: u?.name || u?.email || existing?.userName || t.user_id,
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

      const orders = Object.values(orderMap).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

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
          totalRevenue,
          totalUsers: users.length,
        },
        orders: orders.slice(0, 100),
      });
    }
  } catch (err) {
    console.warn('Lỗi đọc Supabase, fallback sang local:', err);
  }

  const stories = db.getStories();
  const orders = db.getAllOrders();
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
      totalRevenue,
      totalUsers: users.length,
    },
    orders: orders.slice(0, 50),
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
      const { code, title, coverImage, genre, summary, chapters } = body;

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

      // Lọc CHỈ LƯU các tập ĐÃ CÓ NỘI DUNG (ảnh hoặc chữ). Tập trống chưa ra mắt sẽ không được lưu.
      const validChapters = Array.isArray(chapters)
        ? chapters.filter((chap: any) => {
            const hasImages = (Array.isArray(chap.images) && chap.images.length > 0) ||
              (typeof chap.imageLinks === 'string' && chap.imageLinks.trim().length > 0);
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
        summary: summary || "",
        views: 1,
        status: 'completed',
        chaptersCount: validChapters.length,
        createdAt: new Date().toISOString(),
      };

      try {
        await supabaseAdmin.from('stories').upsert({
          id: newStory.id,
          title: newStory.title,
          slug: newStory.slug,
          tiktok_code: newStory.code,
          description: newStory.summary,
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
      const { storyId, code, title, coverImage, genre, summary, chapters } = body;

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

      // 1. Cập nhật Supabase
      try {
        await supabaseAdmin.from('stories').update({
          title,
          slug,
          tiktok_code: cleanCode,
          description: summary || '',
          cover_image: coverImage || '',
          category: genre || 'Tình cảm',
          updated_at: new Date().toISOString()
        }).eq('id', storyId);

        // Lọc CHỈ LƯU các tập ĐÃ CÓ NỘI DUNG
        const validChapters = Array.isArray(chapters)
          ? chapters.filter((chap: any) => {
              const hasImages = (Array.isArray(chap.images) && chap.images.length > 0) ||
                (typeof chap.imageLinks === 'string' && chap.imageLinks.trim().length > 0);
              const hasContent = typeof chap.content === 'string' && chap.content.trim().length > 0;
              return hasImages || hasContent;
            })
          : [];

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
      const validChaptersLocal = Array.isArray(chapters)
        ? chapters.filter((chap: any) => {
            const hasImages = (Array.isArray(chap.images) && chap.images.length > 0) ||
              (typeof chap.imageLinks === 'string' && chap.imageLinks.trim().length > 0);
            const hasContent = typeof chap.content === 'string' && chap.content.trim().length > 0;
            return hasImages || hasContent;
          })
        : [];

      db.updateStory(storyId, {
        code: cleanCode,
        title,
        slug,
        coverImage,
        genre,
        summary,
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
      const isCurrentlyVip = db.isVip(userId);
      let newVipUntil: string | null = null;
      if (!isCurrentlyVip) {
        const exp = new Date();
        exp.setDate(exp.getDate() + Number(days));
        newVipUntil = exp.toISOString();
      }

      // Cập nhật Local DB
      db.setVip(userId, newVipUntil);

      // Cập nhật Supabase Auth nếu có
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUser?.user) {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...(authUser.user.user_metadata || {}),
              vip_until: newVipUntil
            }
          });
        }
      } catch (e) {}

      return NextResponse.json({ success: true, isVip: Boolean(newVipUntil), vipUntil: newVipUntil });
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

      // 2. Cập nhật transaction thành completed và cộng tiền user trong Supabase
      try {
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed' })
          .eq('payment_code', orderCode);

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
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetOrder.userId);
            if (authUser?.user) {
              const currentVipUntil = authUser.user.user_metadata?.vip_until;
              const now = new Date();
              let exp = now;
              if (currentVipUntil && new Date(currentVipUntil) > now) {
                exp = new Date(currentVipUntil);
              }
              exp.setDate(exp.getDate() + (targetOrder.vipDays || 30));
              await supabaseAdmin.auth.admin.updateUserById(targetOrder.userId, {
                user_metadata: {
                  ...(authUser.user.user_metadata || {}),
                  vip_until: exp.toISOString(),
                },
              });
            }
          } catch (e) {}
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

    return NextResponse.json({ success: false, message: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
