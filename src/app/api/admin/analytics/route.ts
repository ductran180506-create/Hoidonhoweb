import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthorizedAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function calculateTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return 'Vừa truy cập xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} ngày trước`;
  } catch {
    return 'Vừa xong';
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ success: false, message: 'Yêu cầu quyền quản trị viên' }, { status: 401 });
  }

  try {
    // 1. Lấy danh sách máy từ Supabase Analytics (1 Hàng = 1 Máy duy nhất)
    let sbEvents: any[] | null = null;
    let exactTotalCount = 0;
    try {
      // Tải song song nhiều trang để vượt qua giới hạn 1000 dòng mặc định của Supabase PostgREST
      const { data: firstBatch, count, error: err1 } = await supabaseAdmin
        .from('analytics')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(0, 999);

      if (!err1 && firstBatch && firstBatch.length > 0) {
        exactTotalCount = count || firstBatch.length;
        const allFetched: any[] = [...firstBatch];

        // Nếu tổng số máy lớn hơn 1000, tải tiếp các trang còn lại (tối đa đến 10.000 máy)
        if (exactTotalCount > 1000) {
          const promises = [];
          for (let start = 1000; start < Math.min(exactTotalCount, 10000); start += 1000) {
            promises.push(
              supabaseAdmin
                .from('analytics')
                .select('*')
                .order('created_at', { ascending: false })
                .range(start, start + 999)
            );
          }
          const results = await Promise.all(promises);
          results.forEach((r) => {
            if (r.data && Array.isArray(r.data)) {
              allFetched.push(...r.data);
            }
          });
        }

        sbEvents = allFetched;
      }
    } catch (e) {}

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (sbEvents && sbEvents.length > 0) {
      // 1 Máy = 1 Hàng duy nhất trong bảng, ưu tiên lấy count chính xác từ DB
      const totalMachines = exactTotalCount || sbEvents.length;
      const todayActiveMachines = sbEvents.filter(e => e.created_at && e.created_at.startsWith(todayStr)).length;

      const sources: Record<string, number> = {};
      const devices: Record<string, number> = {};
      const storyViews: Record<string, { title: string; count: number }> = {};

      sbEvents.forEach(e => {
        const src = e.referrer || 'Truy cập trực tiếp';
        sources[src] = (sources[src] || 0) + 1;

        const dev = e.device || 'Khác';
        devices[dev] = (devices[dev] || 0) + 1;

        if (e.story_id) {
          const sId = e.story_id;
          const title = e.story_title || sId;
          if (!storyViews[sId]) {
            storyViews[sId] = { title, count: 0 };
          }
          storyViews[sId].count += 1;
        }
      });

      // Danh sách chi tiết từng máy cùng thời gian cách đây bao lâu
      const machineList = sbEvents.map(e => ({
        id: e.id,
        device: e.device || 'Không xác định',
        referrer: e.referrer || 'Truy cập trực tiếp',
        path: e.path || '/',
        storyTitle: e.story_title || (e.path === '/' ? 'Trang chủ kho truyện' : e.path),
        lastActive: e.created_at,
        timeAgo: calculateTimeAgo(e.created_at),
      }));

      return NextResponse.json({
        success: true,
        analytics: {
          totalMachines,
          todayActiveMachines,
          totalViews: totalMachines, // 1 máy = 1 lượt khách thực tế
          todayViews: todayActiveMachines,
          sources,
          devices,
          topStories: Object.values(storyViews).sort((a, b) => b.count - a.count).slice(0, 5),
          machineList: machineList,
          recentEvents: machineList.slice(0, 50),
        },
      });
    }

    // 2. Fallback Local DB
    const summary = db.getAnalyticsSummary();
    const localEvents = summary.recentEvents || [];
    const localMachines = localEvents.map((e: any) => ({
      id: e.id,
      device: e.device || 'Không xác định',
      referrer: e.referrer || 'Truy cập trực tiếp',
      path: e.path || '/',
      storyTitle: e.storyTitle || (e.path === '/' ? 'Trang chủ kho truyện' : e.path),
      lastActive: e.createdAt,
      timeAgo: calculateTimeAgo(e.createdAt),
    }));

    return NextResponse.json({
      success: true,
      analytics: {
        totalMachines: summary.totalViews,
        todayActiveMachines: summary.todayViews,
        totalViews: summary.totalViews,
        todayViews: summary.todayViews,
        sources: summary.sources,
        devices: summary.devices,
        topStories: summary.topStories,
        machineList: localMachines,
        recentEvents: localMachines,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
