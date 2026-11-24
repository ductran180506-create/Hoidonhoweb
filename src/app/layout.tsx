import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import AppLayoutShell from '@/components/AppLayoutShell';
import AuthModal from '@/components/AuthModal';
import RechargeModal from '@/components/RechargeModal';
import CheckInModal from '@/components/CheckInModal';
import PaymentHistoryModal from '@/components/PaymentHistoryModal';
import LuckyWheelModal from '@/components/LuckyWheelModal';
import LiveChatWidget from '@/components/LiveChatWidget';

export const metadata: Metadata = {
  title: 'Hồi Đó Nhỏ - Truyện Tranh AI (@carrot.tia)',
  description: 'Kho truyện tranh kỷ niệm, hồi ức và đời thực từ kênh TikTok @carrot.tia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const isMaintenance = headersList.get('x-is-maintenance') === '1';

  // Script khởi tạo theme ngay lập tức để chống chớp giật màn hình (No Flash of Unstyled Theme)
  const themeInitScript = `
    try {
      var saved = localStorage.getItem('hoidonho_theme');
      if (saved === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  `;

  // Khi đang bật chế độ bảo trì: Khóa hoàn toàn, ẩn sạch thanh Navbar (nút Đăng Nhập, Mời Cà Phê, Tìm kiếm), Footer và các Modal
  if (isMaintenance) {
    return (
      <html lang="vi" className="dark" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className="bg-[#0B0B0E] text-slate-100 min-h-screen flex items-center justify-center p-4 selection:bg-carrot-500 selection:text-white font-sans antialiased">
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-carrot-500 selection:text-white font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <AppLayoutShell>
              {children}
            </AppLayoutShell>
            <AuthModal />
            <RechargeModal />
            <CheckInModal />
            <PaymentHistoryModal />
            <LuckyWheelModal />
            <LiveChatWidget />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
