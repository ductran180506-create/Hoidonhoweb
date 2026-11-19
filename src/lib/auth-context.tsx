'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  avatar?: string;
  isVip: boolean;
  vipUntil: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  balance: number;
  loading: boolean;
  login: (phone: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  register: (phone: string, pin: string, confirmPin?: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshBalance: () => Promise<void>;
  isRechargeOpen: boolean;
  setIsRechargeOpen: (open: boolean) => void;
  selectedPackage: string | null;
  setSelectedPackage: (pkg: string | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRechargeOpen, setIsRechargeOpen] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const formatUser = (u: any): AuthUser => {
    const email = u.email || '';
    const name = u.name || u.user_metadata?.full_name || u.user_metadata?.name || (email ? email.split('@')[0] : (u.phone ? (u.phone.length >= 9 ? `${u.phone.slice(0, 3)}***${u.phone.slice(-3)}` : u.phone) : 'Độc Giả'));
    const avatar = u.avatar || u.user_metadata?.avatar_url || u.user_metadata?.picture;
    return {
      id: u.id,
      phone: u.phone || email || u.id,
      email: u.email,
      name,
      avatar,
      isVip: Boolean(u.isVip),
      vipUntil: u.vipUntil || null,
    };
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. TẢI NGAY LẬP TỨC TỪ LOCALSTORAGE (0ms phản hồi tức thì, không làm đơ trang)
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('carrot_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const formatted = formatUser(parsed);
            setUser(formatted);
            setLoading(false);
            fetchBalance(formatted.id);
          } catch (e) {
            localStorage.removeItem('carrot_user');
          }
        }
      }

      // 2. Xử lý Google OAuth Code nếu có trên URL (?code=...)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const errorDesc = urlParams.get('error_description') || urlParams.get('error');

        if (errorDesc) {
          console.error('Google OAuth URL Error:', errorDesc);
        }

        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session?.user) {
              const authUser = formatUser(data.session.user);
              setUser(authUser);
              setIsAuthModalOpen(false);
              localStorage.setItem('carrot_user', JSON.stringify(authUser));
              await fetchBalance(authUser.id);
              window.history.replaceState({}, document.title, window.location.pathname);
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Lỗi đổi mã OAuth code:', err);
          }
        }
      }

      // 3. Kiểm tra session Supabase OAuth ở chế độ nền ngầm
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const authUser = formatUser(session.user);
          setUser(authUser);
          setIsAuthModalOpen(false);
          localStorage.setItem('carrot_user', JSON.stringify(authUser));
          await fetchBalance(authUser.id);
          setLoading(false);
          return;
        }
      } catch (e) {
        // ignore
      }

      setLoading(false);
    };

    initAuth();

    // 3. Lắng nghe trạng thái đăng nhập từ Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser = formatUser(session.user);
        setUser(authUser);
        setIsAuthModalOpen(false);
        localStorage.setItem('carrot_user', JSON.stringify(authUser));
        await fetchBalance(authUser.id);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const fetchBalance = async (userId: string) => {
    try {
      const res = await fetch(`/api/wallet/balance?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
        setUser(prev => prev ? { ...prev, isVip: data.isVip } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const login = async (phone: string, pin: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, mode: 'login' }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setBalance(data.wallet.balance);
        localStorage.setItem('carrot_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const register = async (phone: string, pin: string, confirmPin?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, confirmPin, mode: 'register' }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setBalance(data.wallet.balance);
        localStorage.setItem('carrot_user', JSON.stringify(data.user));
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    setUser(null);
    setBalance(0);
    localStorage.removeItem('carrot_user');
    try {
      await supabase.auth.signOut();
    } catch (e) {}
  };

  const refreshBalance = async () => {
    if (user?.id) {
      await fetchBalance(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        balance,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshBalance,
        isRechargeOpen,
        setIsRechargeOpen,
        selectedPackage,
        setSelectedPackage,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
