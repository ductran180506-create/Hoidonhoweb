import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import RechargeModal from '@/components/RechargeModal';
import CheckInModal from '@/components/CheckInModal';
import FeedbackModal from '@/components/FeedbackModal';
import PaymentHistoryModal from '@/components/PaymentHistoryModal';

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

  // Khi đang bật chế độ bảo trì: Khóa hoàn toàn, ẩn sạch thanh Navbar (nút Đăng Nhập, Mời Cà Phê, Tìm kiếm), Footer và các Modal
  if (isMaintenance) {
    return (
      <html lang="vi" className="dark">
        <body className="bg-[#0B0B0E] text-slate-100 min-h-screen flex items-center justify-center p-4 selection:bg-carrot-500 selection:text-white font-sans antialiased">
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="vi" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-carrot-500 selection:text-white font-sans antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
            {children}
          </main>
          <Footer />
          <AuthModal />
          <RechargeModal />
          <CheckInModal />
          <PaymentHistoryModal />
          <FeedbackModal />
        </AuthProvider>
      </body>
    </html>
  );
}
