import { NextRequest, NextResponse } from 'next/server';
import { getUserBalanceAndVip } from '@/lib/vip-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, message: 'Thiếu userId' }, { status: 400 });
  }

  const { balance, isVip, vipUntil } = await getUserBalanceAndVip(userId);

  return NextResponse.json({
    success: true,
    balance,
    isVip,
    vipUntil,
  });
}
