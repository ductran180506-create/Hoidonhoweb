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
  isCheckInOpen: boolean;
  setIsCheckInOpen: (open: boolean) => void;
  checkInState: {
    canCheckIn: boolean;
    streak: number;
    nextReward: number;
    timeLeftMs: number;
    rewards: number[];
    todayStr?: string;
  } | null;
  refreshCheckIn: () => Promise<void>;
  isLuckyWheelOpen: boolean;
  setIsLuckyWheelOpen: (open: boolean) => void;
  luckyWheelState: {
    canFreeSpin: boolean;
    timeLeftMs: number;
    costCoins: number;
  } | null;
  refreshLuckyWheel: () => Promise<void>;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  pendingOrder: any | null;
  setPendingOrder: (order: any | null) => void;
  resumePayment: (order: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRechargeOpen, setIsRechargeOpen] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);
  const [checkInState, setCheckInState] = useState<{
    canCheckIn: boolean;
    streak: number;
    nextReward: number;
    timeLeftMs: number;
    rewards: number[];
    todayStr?: string;
  } | null>(null);
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState<boolean>(false);
  const [luckyWheelState, setLuckyWheelState] = useState<{
    canFreeSpin: boolean;
    timeLeftMs: number;
    costCoins: number;
  } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [pendingOrder, setPendingOrder] = useState<any | null>(null);

  // Khôi phục đơn hàng đang chờ từ localStorage khi khởi động
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hdn_pending_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        const ageMs = Date.now() - new Date(parsed.createdAt || Date.now()).getTime();
        if (ageMs < 15 * 60 * 1000) {
          setPendingOrder(parsed);
        } else {
          localStorage.removeItem('hdn_pending_order');
        }
      }
    } catch (e) {}
  }, []);

  const resumePayment = (orderToResume: any) => {
    setPendingOrder(orderToResume);
    try {
      localStorage.setItem('hdn_pending_order', JSON.stringify(orderToResume));
    } catch (e) {}
    setIsHistoryOpen(false);
    setIsRechargeOpen(true);
  };

  const formatUser = (u: any): AuthUser => {
    const email = u.email || '';
    const name = u.name || u.user_metadata?.full_name || u.user_metadata?.name || (email ? email.split('@')[0] : (u.phone ? (u.phone.length >= 9 ? `${u.phone.slice(0, 3)}***${u.phone.slice(-3)}` : u.phone) : 'Độc Giả'));
    const avatar = u.avatar || u.user_metadata?.avatar_url || u.user_metadata?.picture;
    const auVip = u.vipUntil || u.user_metadata?.vip_until || null;
    const isVip = Boolean(u.isVip || (auVip && new Date(auVip) > new Date()));
    return {
      id: u.id,
      phone: u.phone || email || u.id,
      email: u.email,
      name,
      avatar,
      isVip,
      vipUntil: auVip,
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
      const res = await fetch(`/api/wallet/balance?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
        setUser(prev => {
          if (!prev) return null;
          const updated: AuthUser = {
            ...prev,
            isVip: Boolean(data.isVip),
            vipUntil: data.vipUntil || prev.vipUntil || null,
          };
          try {
            localStorage.setItem('carrot_user', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCheckInStatus = async (userId?: string, force = false) => {
    if (!userId) {
      // Khách vãng lai: Cung cấp ngay dữ liệu mặc định tức thì (0ms, 0 tốn request)
      setCheckInState({
        canCheckIn: true,
        streak: 0,
        nextReward: 1,
        timeLeftMs: 0,
        rewards: [1, 1, 2, 2, 2, 2, 5],
      });
      return;
    }

    // Với tài khoản đã đăng nhập: Lưu cache trong sessionStorage 5 phút
    const cacheKey = `hdn_checkin_${userId}`;
    const cacheTimeKey = `hdn_checkin_time_${userId}`;
    if (!force && typeof window !== 'undefined') {
      try {
        const last = parseInt(sessionStorage.getItem(cacheTimeKey) || '0', 10);
        if (Date.now() - last < 5 * 60 * 1000) {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            setCheckInState(JSON.parse(cached));
            return;
          }
        }
      } catch (e) {}
    }

    try {
      const res = await fetch(`/api/checkin?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success) {
        const state = {
          canCheckIn: data.canCheckIn,
          streak: data.streak,
          nextReward: data.nextReward,
          timeLeftMs: data.timeLeftMs,
          rewards: data.rewards || [1, 1, 2, 2, 2, 2, 5],
          todayStr: data.todayStr,
        };
        setCheckInState(state);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(state));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {}
      }
    } catch (err) {
      console.error('Lỗi kiểm tra điểm danh:', err);
    }
  };

  const fetchLuckyWheelStatus = async (userId?: string, force = false) => {
    if (!userId) {
      // Khách vãng lai: Cung cấp ngay dữ liệu mặc định tức thì (0ms, 0 tốn request)
      setLuckyWheelState({
        canFreeSpin: true,
        timeLeftMs: 0,
        costCoins: 3,
      });
      return;
    }

    // Với tài khoản đã đăng nhập: Lưu cache trong sessionStorage 5 phút
    const cacheKey = `hdn_lucky_${userId}`;
    const cacheTimeKey = `hdn_lucky_time_${userId}`;
    if (!force && typeof window !== 'undefined') {
      try {
        const last = parseInt(sessionStorage.getItem(cacheTimeKey) || '0', 10);
        if (Date.now() - last < 5 * 60 * 1000) {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            setLuckyWheelState(JSON.parse(cached));
            return;
          }
        }
      } catch (e) {}
    }

    try {
      const res = await fetch(`/api/lucky-wheel?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success) {
        const state = {
          canFreeSpin: data.canFreeSpin,
          timeLeftMs: data.timeLeftMs,
          costCoins: data.costCoins || 3,
        };
        setLuckyWheelState(state);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(state));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {}
      }
    } catch (err) {
      console.error('Lỗi kiểm tra vòng quay may mắn:', err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCheckInStatus(user.id);
      fetchLuckyWheelStatus(user.id);
    } else {
      fetchCheckInStatus();
      fetchLuckyWheelStatus();
    }
  }, [user?.id]);

  useEffect(() => {
    if (isCheckInOpen && user?.id) {
      fetchCheckInStatus(user.id, true);
    }
  }, [isCheckInOpen, user?.id]);

  useEffect(() => {
    if (isLuckyWheelOpen && user?.id) {
      fetchLuckyWheelStatus(user.id, true);
    }
  }, [isLuckyWheelOpen, user?.id]);

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
      const guestUserId = user?.id || pendingOrder?.userId;
      const pendingOrderCode = pendingOrder?.orderCode;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, mode: 'login', guestUserId, pendingOrderCode }),
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
      const guestUserId = user?.id || pendingOrder?.userId;
      const pendingOrderCode = pendingOrder?.orderCode;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, confirmPin, mode: 'register', guestUserId, pendingOrderCode }),
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

  const refreshCheckIn = async () => {
    await fetchCheckInStatus(user?.id, true);
    if (user?.id) {
      await fetchBalance(user.id);
    }
  };

  const refreshLuckyWheel = async () => {
    await fetchLuckyWheelStatus(user?.id, true);
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
        isCheckInOpen,
        setIsCheckInOpen,
        checkInState,
        refreshCheckIn,
        isLuckyWheelOpen,
        setIsLuckyWheelOpen,
        luckyWheelState,
        refreshLuckyWheel,
        isHistoryOpen,
        setIsHistoryOpen,
        pendingOrder,
        setPendingOrder,
        resumePayment,
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
