import type { Metadata } from 'next';
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
