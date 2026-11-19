'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { X, Lock, User, Loader2, UserPlus, LogIn, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthModal() {
  const router = useRouter();
  const { user, isAuthModalOpen, setIsAuthModalOpen, login, register, loginWithGoogle } = useAuth();
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Tự động đóng modal nếu người dùng đã đăng nhập thành công
  useEffect(() => {
    if (user && isAuthModalOpen) {
      setIsAuthModalOpen(false);
    }
  }, [user, isAuthModalOpen, setIsAuthModalOpen]);

  // Bắt lỗi Google OAuth từ URL nếu có
  useEffect(() => {
    if (typeof window !== 'undefined' && isAuthModalOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const oauthErr = urlParams.get('error_description') || urlParams.get('error');
      if (oauthErr) {
        if (oauthErr.includes('access_denied') || oauthErr.includes('403')) {
          setError('Tài khoản Google này chưa được cấp quyền thử nghiệm trong Google Cloud Console. Vui lòng bấm "Publish App" trên Google Cloud hoặc đăng nhập bằng SĐT bên dưới.');
        } else {
          setError(`Lỗi Google OAuth: ${decodeURIComponent(oauthErr)}`);
        }
      }
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setError(res.message || 'Chưa thể kết nối Google. Vui lòng thử lại.');
        setGoogleLoading(false);
      }
    } catch (e: any) {
      setError(e.message || 'Lỗi kết nối Google');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().toLowerCase();
    const cleanPin = pin.trim();

    // 1. Quản Trị Viên đăng nhập bí mật
    if (cleanPhone === 'admin' || cleanPhone === 'quantri') {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: cleanPin }),
        });
        const data = await res.json();
        setLoading(false);

        if (data.success) {
          if (data.token) {
            sessionStorage.setItem('hoidonho_admin_token', data.token);
          }
          window.dispatchEvent(new Event('admin_auth_changed'));
          setIsAuthModalOpen(false);
          setPhone('');
          setPin('');
          setConfirmPin('');
          setError('');
          router.push('/admin');
          return;
        } else {
          setError(data.message || 'Mật khẩu quản trị viên không chính xác');
          return;
        }
      } catch (err) {
        setLoading(false);
        setError('Lỗi kết nối máy chủ');
        return;
      }
    }

    // 2. Kiểm tra dữ liệu đầu vào
    if (!phone || phone.trim().length < 3) {
      setError('Vui lòng nhập tài khoản (tối thiểu 3 ký tự)');
      return;
    }
    if (!pin || pin.length < 4) {
      setError('Mật khẩu tối thiểu phải có 4 ký tự');
      return;
    }

    // 3. Xử lý ĐĂNG KÝ
    if (authTab === 'register') {
      if (pin !== confirmPin.trim()) {
        setError('Xác nhận mật khẩu không trùng khớp');
        return;
      }

      setLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await register(phone, pin, confirmPin);
      setLoading(false);

      if (res.success) {
        setSuccessMsg('Đăng ký tài khoản thành công!');
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setPhone('');
          setPin('');
          setConfirmPin('');
          setSuccessMsg('');
        }, 800);
      } else {
        setError(res.message || 'Đăng ký không thành công');
      }
      return;
    }

    // 4. Xử lý ĐĂNG NHẬP
    setLoading(true);
    setError('');
    setSuccessMsg('');
    const res = await login(phone, pin);
    setLoading(false);

    if (res.success) {
      setIsAuthModalOpen(false);
      setPhone('');
      setPin('');
      setConfirmPin('');
    } else {
      setError(res.message || 'Đăng nhập không thành công');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm p-6 bg-[#111116] border border-[#22222B] rounded-xl shadow-2xl space-y-4">
        {/* Nút đóng modal */}
        <button
          onClick={() => {
            setIsAuthModalOpen(false);
            setError('');
            setSuccessMsg('');
          }}
          className="absolute top-4 right-4 p-1 text-[#71717A] hover:text-white rounded transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Thanh chọn Tab Đăng Nhập / Đăng Ký */}
        <div className="flex items-center p-1 bg-[#0A0A0D] border border-[#1E1E26] rounded-lg">
          <button
            type="button"
            onClick={() => {
              setAuthTab('login');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
              authTab === 'login'
                ? 'bg-[#7C5CFC] text-white shadow'
                : 'text-[#71717A] hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('register');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition ${
              authTab === 'register'
                ? 'bg-[#7C5CFC] text-white shadow'
                : 'text-[#71717A] hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng Ký Mới</span>
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-base text-white">
            {authTab === 'login' ? 'Đăng Nhập Độc Giả' : 'Tạo Tài Khoản Độc Giả Mới'}
          </h3>
          <p className="text-xs text-[#71717A] mt-0.5">
            {authTab === 'login' 
              ? 'Đăng nhập để xem số dư Điểm và các tập truyện đã mở khóa.'
              : 'Đăng ký nhanh để nhận ví lưu Điểm vĩnh viễn trên mọi thiết bị.'}
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-lg text-emerald-400 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* NÚT TIẾP TỤC VỚI GOOGLE (1 CHẠM TỰ ĐỘNG CẢ ĐĂNG KÝ VÀ ĐĂNG NHẬP) */}
        <button
          type="button"
          disabled={googleLoading}
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2.5 shadow-md active:scale-98"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>Tiếp tục với Google</span>
        </button>

        <div className="flex items-center my-2.5">
          <div className="flex-1 border-t border-[#22222E]"></div>
          <span className="px-2 text-[10px] text-[#71717A] uppercase font-mono">
            Hoặc {authTab === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản'}
          </span>
          <div className="flex-1 border-t border-[#22222E]"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
          <div>
            <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
              Tài khoản
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#71717A]" />
              <input
                type="text"
                name="reader_account_input"
                autoComplete="off"
                placeholder={authTab === 'login' ? "Tên tài khoản hoặc SĐT" : "Đặt tên tài khoản hoặc SĐT"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0A0A0D] border border-[#22222B] focus:border-[#7C5CFC] rounded-lg text-xs text-white placeholder-[#52525B] outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
              Mật khẩu {authTab === 'register' ? '(tạo mới)' : ''}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#71717A]" />
              <input
                type="password"
                name="reader_password_input"
                autoComplete="new-password"
                placeholder={authTab === 'login' ? "Nhập mật khẩu" : "Tạo mật khẩu (từ 4 ký tự)"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0A0A0D] border border-[#22222B] focus:border-[#7C5CFC] rounded-lg text-xs text-white placeholder-[#52525B] outline-none transition"
              />
            </div>
          </div>

          {/* Ô xác nhận mật khẩu khi ở chế độ Đăng Ký */}
          {authTab === 'register' && (
            <div className="animate-fadeIn">
              <label className="block text-[11px] font-medium text-[#A1A1AA] mb-1">
                Nhập lại mật khẩu xác nhận
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#71717A]" />
                <input
                  type="password"
                  name="reader_confirm_password_input"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu ở trên"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0A0A0D] border border-[#22222B] focus:border-[#7C5CFC] rounded-lg text-xs text-white placeholder-[#52525B] outline-none transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] disabled:opacity-50 text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-[#7C5CFC]/20"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : authTab === 'login' ? (
              <span>Đăng Nhập Tài Khoản</span>
            ) : (
              <span>Tạo Tài Khoản & Nhận Ví Điểm</span>
            )}
          </button>
        </form>

        {/* Dòng liên kết chuyển đổi giữa Đăng Nhập và Đăng Ký */}
        <div className="text-center pt-1 border-t border-[#1C1C24]">
          {authTab === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-[#A1A1AA] hover:text-[#7C5CFC] transition"
            >
              Chưa có tài khoản? <strong className="text-white underline">Đăng ký mới ngay</strong>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthTab('login');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-[#A1A1AA] hover:text-[#7C5CFC] transition"
            >
              Đã có tài khoản? <strong className="text-white underline">Đăng nhập ngay</strong>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
