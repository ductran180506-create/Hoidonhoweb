'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-8 h-8 rounded-lg bg-[#14141B] border border-[#22222B] opacity-0 ${className}`} />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
        isDark
          ? 'bg-[#161622] hover:bg-[#1E1E2A] text-amber-300 border-[#272738] hover:text-amber-200'
          : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-indigo-600 border-[#CBD5E1] hover:text-indigo-800'
      } ${className}`}
      title={isDark ? 'Chuyển sang giao diện Sáng (Light Mode)' : 'Chuyển sang giao diện Tối (Dark Mode)'}
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-fadeIn" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 animate-fadeIn" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
        </span>
      )}
    </button>
  );
}
