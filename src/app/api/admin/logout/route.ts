import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Đã đăng xuất trang quản trị',
  });

  response.cookies.set({
    name: 'admin_session',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
