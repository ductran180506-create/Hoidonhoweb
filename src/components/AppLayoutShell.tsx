'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AppLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin';

  if (isAdmin) {
    return (
      <div className="flex-1 w-full min-h-screen bg-[#0B0B10] flex flex-col overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
        {children}
      </main>
      <Footer />
    </>
  );
}
