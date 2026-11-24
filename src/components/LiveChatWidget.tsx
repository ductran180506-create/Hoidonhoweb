'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  MessageCircle, X, Send, ImagePlus, Loader2, 
  ExternalLink, Sparkles, Check, ChevronDown, 
  Smile, ShieldCheck, PhoneCall
} from 'lucide-react';

interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'admin';
  content: string;
  imageUrl?: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  unreadUser: number;
}

export default function LiveChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lấy hoặc tạo guestId nếu độc giả chưa đăng nhập
  const getEffectiveUserId = () => {
    if (user?.id) return user.id;
    if (typeof window !== 'undefined') {
      let guestId = localStorage.getItem('hdn_guest_chat_id');
      if (!guestId) {
        guestId = `guest-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        localStorage.setItem('hdn_guest_chat_id', guestId);
      }
      return guestId;
    }
    return 'guest-unknown';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Tải tin nhắn
  const fetchMessages = async (isBackground = false) => {
    const effectiveId = getEffectiveUserId();
    const effectiveName = user?.name || user?.phone || user?.email || 'Độc giả';

    try {
      const res = await fetch(`/api/chat/messages?userId=${encodeURIComponent(effectiveId)}&userName=${encodeURIComponent(effectiveName)}`);
      const data = await res.json();

      if (data.success && data.conversation) {
        setConversation(data.conversation);
        setMessages(data.messages || []);
        setUnreadCount(data.conversation.unreadUser || 0);

        if (isOpen && data.conversation.unreadUser > 0) {
          // Đánh dấu đã đọc
          fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: data.conversation.id, reader: 'user' }),
          });
          setUnreadCount(0);
        }
      }
    } catch (e) {
      if (!isBackground) console.error('Lỗi tải tin nhắn:', e);
    }
  };

  // Khởi tạo & Polling tin nhắn mới
  useEffect(() => {
    fetchMessages();

    // Polling mỗi 3.5 giây khi mở chat, hoặc 15 giây khi đóng chat
    const intervalTime = isOpen ? 3500 : 15000;
    const interval = setInterval(() => {
      fetchMessages(true);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (conversation?.id && unreadCount > 0) {
        fetch('/api/chat/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: conversation.id, reader: 'user' }),
        });
        setUnreadCount(0);
      }
    }
  }, [isOpen, messages.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Ảnh tối đa 10MB');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setSending(true);
    const effectiveId = getEffectiveUserId();
    const effectiveName = user?.name || user?.phone || user?.email || 'Độc giả';

    try {
      const formData = new FormData();
      if (conversation?.id) formData.append('conversationId', conversation.id);
      formData.append('userId', effectiveId);
      formData.append('userName', effectiveName);
      formData.append('sender', 'user');
      formData.append('content', inputText.trim());
      if (selectedImage) formData.append('image', selectedImage);

      const res = await fetch('/api/chat/send', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setInputText('');
        handleRemoveImage();
        if (data.conversation) setConversation(data.conversation);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) {
      console.error('Lỗi gửi tin nhắn:', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* 1. NÚT BONG BÓNG NỔI GÓC PHẢI MÀN HÌNH */}
      <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative group p-3.5 sm:p-4 bg-gradient-to-r from-[#7C5CFC] to-[#6344E7] hover:from-[#6D4CF0] hover:to-[#5536D8] text-white rounded-full shadow-2xl transition-all duration-200 active:scale-95 flex items-center justify-center border border-white/20"
          title="Nhắn tin trò chuyện 1-1 với Tác Giả"
        >
          {isOpen ? (
            <ChevronDown className="w-6 h-6 animate-fadeIn" />
          ) : (
            <MessageCircle className="w-6 h-6 animate-fadeIn" />
          )}

          {/* Chấm xanh Online */}
          <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0B0B0E] animate-pulse" />

          {/* Badge tin nhắn chưa đọc */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1.5 -left-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white font-extrabold text-[10px] shadow-lg animate-bounce">
              {unreadCount}
            </span>
          )}

          {/* Tooltip khi rê chuột trên Desktop */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#161622]/95 border border-[#2B2B3D] text-white text-xs rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none shadow-xl hidden sm:block">
            💬 Nhắn tin 1-1 với Tác Giả
          </span>
        </button>
      </div>

      {/* 2. CỬA SỔ HỘP CHAT 1-1 */}
      {isOpen && (
        <div className="fixed bottom-16 right-3 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[380px] h-[520px] max-h-[82vh] bg-[#101017] border border-[#262638] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          
          {/* HEADER CHAT */}
          <div className="bg-[#161624] border-b border-[#242436] p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 p-0.5 flex items-center justify-center shadow">
                  <div className="w-full h-full bg-[#111118] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    🥕
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#161624]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Tác Giả @carrot.tia</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    Admin
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span>Trực tuyến</span> • <span>Hỗ trợ 1-1</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#71717A] hover:text-white rounded-lg transition"
                title="Thu nhỏ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* THANH KẾT NỐI NHANH (ZALO & TIKTOK) */}
          <div className="bg-[#12121C] px-3 py-2 border-b border-[#1E1E2E] flex items-center justify-between gap-2 text-xs">
            <a
              href="https://zalo.me/0356382978"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-2 bg-[#0068FF]/15 hover:bg-[#0068FF]/25 border border-[#0068FF]/40 text-[#2E8FFF] rounded-lg transition flex items-center justify-center gap-1.5 font-medium text-[11px] active:scale-95"
            >
              <span className="font-bold">Zalo:</span> <span>0356.382.978</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://www.tiktok.com/@carrot.tia"
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition flex items-center gap-1 text-[11px] font-medium active:scale-95"
            >
              <span>TikTok</span>
              <ExternalLink className="w-3 h-3 text-[#71717A]" />
            </a>
          </div>

          {/* KHUNG NỘI DUNG TIN NHẮN */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0A0A0F]">
            {/* Tin nhắn chào mừng mặc định */}
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-[#181824] border border-[#2D2D3D] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                🥕
              </div>
              <div className="max-w-[82%] space-y-1">
                <div className="p-3 bg-[#181826] border border-[#29293D] rounded-2xl rounded-tl-sm text-xs text-[#E4E4E7] leading-relaxed shadow-sm">
                  <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1">
                    <span>Xin chào bạn!</span>
                  </p>
                  <p>
                    Mình là Tác giả <strong>@carrot.tia</strong> 👋. Nếu bạn có tình trạng riêng (cần hỗ trợ nạp điểm, kích hoạt VIP, lỗi mở truyện hay muốn trao đổi công việc), cứ nhắn trực tiếp tại đây nhé!
                  </p>
                </div>
                <div className="text-[9px] text-[#71717A] px-1">Tự động trả lời</div>
              </div>
            </div>

            {/* Danh sách tin nhắn qua lại */}
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-[#181824] border border-[#2D2D3D] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      🥕
                    </div>
                  )}

                  <div className={`max-w-[82%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-[#7C5CFC] text-white rounded-tr-sm'
                          : 'bg-[#181826] border border-[#29293D] text-[#E4E4E7] rounded-tl-sm'
                      }`}
                    >
                      {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                      {msg.imageUrl && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-h-48">
                          <img
                            src={msg.imageUrl}
                            alt="Ảnh đính kèm"
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                          />
                        </div>
                      )}
                    </div>

                    <div
                      className={`text-[9px] text-[#71717A] px-1 ${
                        isUser ? 'text-right' : 'text-left'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* PREVIEW ẢNH NẾU ĐANG CHỌN */}
          {imagePreview && (
            <div className="px-3 pt-2 bg-[#12121A] border-t border-[#20202F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#7C5CFC]">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <span className="text-[11px] text-[#A1A1AA]">Đã chọn 1 ảnh</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* FORM NHẬP TIN NHẮN */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-[#12121A] border-t border-[#222233] flex items-center gap-1.5">
            <label className="p-2 text-[#71717A] hover:text-[#7C5CFC] rounded-lg hover:bg-[#1A1A26] transition cursor-pointer flex-shrink-0" title="Gửi ảnh">
              <ImagePlus className="w-4 h-4" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập tin nhắn với tác giả..."
              className="flex-1 bg-[#0A0A0F] border border-[#242436] focus:border-[#7C5CFC] rounded-xl px-3 py-2 text-xs text-white placeholder-[#52525B] outline-none transition"
              disabled={sending}
            />

            <button
              type="submit"
              disabled={sending || (!inputText.trim() && !selectedImage)}
              className="p-2 bg-[#7C5CFC] hover:bg-[#6D4CF0] disabled:opacity-40 text-white rounded-xl transition flex-shrink-0 active:scale-95"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
