import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authenticated = isAuthorizedAdmin(req);
  return NextResponse.json({
    success: true,
    authenticated,
  });
}
