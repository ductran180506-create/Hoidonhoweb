import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      message: 'Tính năng đổi điểm sang VIP đang tạm ngưng để đảm bảo quyền lợi độc quyền cho độc giả nạp Gói VIP 39k. Bạn có thể dùng điểm để mở từng tập truyện!' 
    },
    { status: 403 }
  );
}
