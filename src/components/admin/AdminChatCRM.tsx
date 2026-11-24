'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Send, ImagePlus, Loader2, Search, 
  User, CheckCheck, RefreshCw, ExternalLink, ShieldCheck, 
  Crown, Coins, X, Copy, Check, Sparkles, AlertCircle
} from 'lucide-react';

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userContact?: string;
  lastMessage: string;
  lastSender: 'user' | 'admin';
  unreadAdmin: number;
  unreadUser: number;
  updatedAt: string;
  balance?: number;
  isVip?: boolean;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'admin';
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export default function AdminChatCRM() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getAdminToken = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('hoidonho_admin_token') || 'hdn_sec_token_99a8b7c6d5e4f3a2b1';
    }
    return '';
  };

  // Tải danh sách conversations
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const res = await fetch('/api/chat/conversations', {
        headers: { 'x-admin-token': getAdminToken() },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        // Nếu chưa chọn ai, tự động chọn người đầu tiên
        if (!selectedConv && data.conversations.length > 0) {
          setSelectedConv(data.conversations[0]);
        }
      }
    } catch (e) {
      console.error('Lỗi fetch conversations:', e);
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  // Tải tin nhắn của conversation đang chọn
  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${encodeURIComponent(convId)}`, {
        headers: { 'x-admin-token': getAdminToken() },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
        if (data.conversation) {
          setSelectedConv(prev => (prev?.id === convId ? { ...prev, ...data.conversation } : prev));
        }
      }
    } catch (e) {
      console.error('Lỗi fetch messages:', e);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Khởi tạo
  useEffect(() => {
    fetchConversations();
  }, []);

  // Polling danh sách & tin nhắn mỗi 4 giây
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(true);
      if (selectedConv?.id) {
        fetchMessages(selectedConv.id, true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedConv?.id]);

  // Khi chọn conversation
  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    fetchMessages(conv.id);

    // Đánh dấu đã đọc
    if (conv.unreadAdmin > 0) {
      fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conv.id, reader: 'admin' }),
      });
      setConversations(prev =>
        prev.map(c => (c.id === conv.id ? { ...c, unreadAdmin: 0 } : c))
      );
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Ảnh tối đa 10MB');
      return;
    }
    setReplyImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setReplyImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setReplyImage(null);
    setReplyImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConv || (!replyText.trim() && !replyImage)) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('conversationId', selectedConv.id);
      formData.append('userId', selectedConv.userId);
      formData.append('userName', 'Tác Giả @carrot.tia');
      formData.append('sender', 'admin');
      formData.append('content', replyText.trim());
      if (replyImage) formData.append('image', replyImage);

      const res = await fetch('/api/chat/send', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setReplyText('');
        handleRemoveImage();
        fetchConversations(true);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn trả lời:', err);
    } finally {
      setSending(false);
    }
  };

  // Mẫu câu trả lời nhanh
  const quickReplies = [
    'Dạ mình đã kiểm tra và cộng Điểm vào tài khoản cho bạn rồi nha! Bạn kiểm tra lại ví giúp mình nhé ❤️',
    'Bạn chụp ảnh màn hình giao dịch chuyển khoản gửi qua đây để mình hỗ trợ kích hoạt ngay nhé!',
    'Cảm ơn bạn đã ủng hộ kênh truyện! Chúc bạn đọc truyện thật vui vẻ nha ☕',
    'Bạn đang gặp lỗi ở tập truyện nào thế, cho mình xin tên tập để mình kiểm tra ngay cho bạn nhé!',
  ];

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.userName.toLowerCase().includes(q) ||
      c.userId.toLowerCase().includes(q) ||
      (c.userContact && c.userContact.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER BANNER */}
      <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>💬 Hộp Thoại Chăm Sóc Độc Giả 1-1 (Live Chat CRM)</span>
            {conversations.filter(c => c.unreadAdmin > 0).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                {conversations.filter(c => c.unreadAdmin > 0).length} độc giả nhắn mới
              </span>
            )}
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Trò chuyện trực tiếp 2 chiều với từng độc giả. Độc giả nhắn trên web sẽ hiện ngay tại đây và ngược lại.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://zalo.me/0356382978"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3 bg-[#0068FF]/15 hover:bg-[#0068FF]/25 border border-[#0068FF]/40 text-[#2E8FFF] text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <span>Zalo Hỗ Trợ: 0356.382.978</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={() => fetchConversations()}
            disabled={loadingConv}
            className="p-2 rounded-lg bg-[#181824] hover:bg-[#222232] text-[#A1A1AA] hover:text-white border border-[#2D2D3D] transition active:scale-95"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loadingConv ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KHUNG GIAO DIỆN CHAT 2 CỘT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px] bg-[#111116] border border-[#1E1E26] rounded-xl overflow-hidden shadow-xl">
        
        {/* CỘT TRÁI (4 CỘT): DANH SÁCH CUỘC TRÒ CHUYỆN */}
        <div className="lg:col-span-4 border-r border-[#1E1E26] flex flex-col h-full bg-[#0E0E14]">
          {/* Ô tìm kiếm */}
          <div className="p-3 border-b border-[#1E1E26] bg-[#12121A]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên, SĐT, User ID..."
                className="w-full bg-[#0A0A0F] border border-[#222230] focus:border-[#7C5CFC] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#52525B] outline-none transition"
              />
            </div>
          </div>

          {/* Danh sách items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#181822]">
            {loadingConv && conversations.length === 0 ? (
              <div className="p-8 text-center text-[#71717A] space-y-2">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#7C5CFC]" />
                <p className="text-xs">Đang tải cuộc trò chuyện...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-[#71717A] space-y-2">
                <MessageCircle className="w-8 h-8 mx-auto text-[#333344]" />
                <p className="text-xs font-medium text-white">Chưa có tin nhắn nào</p>
                <p className="text-[11px] text-[#71717A]">
                  Khi độc giả bấm vào bong bóng chat trên web để hỏi tình trạng riêng, cuộc trò chuyện sẽ tự động xuất hiện tại đây.
                </p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = selectedConv?.id === conv.id;
                const hasUnread = conv.unreadAdmin > 0;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConv(conv)}
                    className={`p-3 transition cursor-pointer flex items-start gap-2.5 relative select-none ${
                      isSelected
                        ? 'bg-[#181828] border-l-4 border-l-[#7C5CFC]'
                        : hasUnread
                        ? 'bg-rose-950/20 hover:bg-[#151522]'
                        : 'hover:bg-[#13131C]'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#4F46E5] text-white font-bold text-xs flex items-center justify-center shadow">
                        {conv.userName ? conv.userName[0].toUpperCase() : 'U'}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#0E0E14] animate-pulse" />
                      )}
                    </div>

                    {/* Nội dung tóm tắt */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate font-medium ${hasUnread ? 'text-white font-bold' : 'text-[#E4E4E7]'}`}>
                          {conv.userName}
                        </span>
                        <span className="text-[10px] text-[#71717A] flex-shrink-0 ml-1">
                          {new Date(conv.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Badges nhỏ */}
                      <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                        {conv.isVip ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> VIP
                          </span>
                        ) : null}
                        <span className="px-1.5 py-0.2 rounded bg-[#1C1C28] text-[#A1A1AA] font-mono border border-white/5">
                          {conv.balance || 0} Điểm
                        </span>
                        {conv.userContact && (
                          <span className="text-[#71717A] truncate font-mono text-[9px]">
                            {conv.userContact}
                          </span>
                        )}
                      </div>

                      {/* Tin nhắn cuối */}
                      <p className={`text-[11px] truncate ${hasUnread ? 'text-rose-300 font-semibold' : 'text-[#71717A]'}`}>
                        {conv.lastSender === 'admin' ? 'Bạn: ' : ''}
                        {conv.lastMessage || 'Đã tạo cuộc trò chuyện'}
                      </p>
                    </div>

                    {/* Badge đếm tin chưa đọc */}
                    {hasUnread && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black text-[9px] shadow animate-bounce self-center">
                        {conv.unreadAdmin}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CỘT PHẢI (8 CỘT): KHUNG TRÒ CHUYỆN CHI TIẾT */}
        <div className="lg:col-span-8 flex flex-col h-full bg-[#0A0A0F]">
          {selectedConv ? (
            <>
              {/* HEADER CONVERSATION CHI TIẾT */}
              <div className="p-3.5 bg-[#14141E] border-b border-[#222230] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#4F46E5] text-white font-bold text-xs flex items-center justify-center shadow">
                    {selectedConv.userName ? selectedConv.userName[0].toUpperCase() : 'U'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{selectedConv.userName}</span>
                      {selectedConv.isVip ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-400" /> Hội Viên VIP
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/25">
                          Tài khoản thường
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-[#A1A1AA]">
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <Coins className="w-3 h-3" /> Ví: <strong className="text-white font-mono">{selectedConv.balance || 0} Điểm</strong>
                      </span>
                      <span>•</span>
                      <span className="text-[11px] font-mono text-[#71717A] flex items-center gap-1">
                        ID: {selectedConv.userId}
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedConv.userId)}
                          className="hover:text-white"
                          title="Sao chép ID"
                        >
                          {copiedText === selectedConv.userId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nút hành động nhanh với khách */}
                <div className="flex items-center gap-2">
                  {selectedConv.userContact && (
                    <a
                      href={`https://zalo.me/${selectedConv.userContact.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 bg-[#0068FF]/15 hover:bg-[#0068FF]/25 border border-[#0068FF]/40 text-[#2E8FFF] text-xs font-semibold rounded-lg transition flex items-center gap-1"
                    >
                      <span>Mở Zalo Khách</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* KHUNG NỘI DUNG MESSAGES */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#09090D]">
                {loadingMessages ? (
                  <div className="p-8 text-center text-[#71717A]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#7C5CFC]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-[#71717A] space-y-2">
                    <p className="text-xs">Chưa có tin nhắn trong cuộc trò chuyện này.</p>
                    <p className="text-[11px] text-[#555566]">Hãy gửi tin nhắn đầu tiên bên dưới để bắt đầu trao đổi với độc giả.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isAdmin = msg.sender === 'admin';

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-[#181824] border border-[#2D2D3D] text-[10px] text-white font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {selectedConv.userName ? selectedConv.userName[0].toUpperCase() : 'U'}
                          </div>
                        )}

                        <div className={`max-w-[75%] space-y-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                              isAdmin
                                ? 'bg-[#7C5CFC] text-white rounded-tr-sm'
                                : 'bg-[#181826] border border-[#2A2A3D] text-[#E4E4E7] rounded-tl-sm'
                            }`}
                          >
                            {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

                            {msg.imageUrl && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-h-64">
                                <img
                                  src={msg.imageUrl}
                                  alt="Ảnh đính kèm"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                                  onClick={() => window.open(msg.imageUrl, '_blank')}
                                />
                              </div>
                            )}
                          </div>

                          <div className={`text-[9px] text-[#71717A] px-1 ${isAdmin ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} • {new Date(msg.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 text-xs text-white font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                            🥕
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* MẪU CÂU TRẢ LỜI NHANH */}
              <div className="px-3 py-1.5 bg-[#101018] border-t border-[#1C1C28] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                <span className="text-[10px] text-[#71717A] flex-shrink-0 font-medium">💬 Mẫu nhanh:</span>
                {quickReplies.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(qr)}
                    className="px-2.5 py-1 rounded-full bg-[#181824] hover:bg-[#222234] border border-[#2B2B3E] hover:border-[#7C5CFC]/50 text-[#CBD5E1] hover:text-white whitespace-nowrap transition flex-shrink-0 active:scale-95 cursor-pointer"
                  >
                    {qr.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* PREVIEW ẢNH NẾU ADMIN CHỌN GỬI ẢNH */}
              {replyImagePreview && (
                <div className="px-4 py-2 bg-[#12121A] border-t border-[#20202F] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#7C5CFC]">
                      <img src={replyImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs text-[#A1A1AA]">Đính kèm 1 ảnh phản hồi</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* FORM TRẢ LỜI CỦA ADMIN */}
              <form onSubmit={handleSendReply} className="p-3 bg-[#12121A] border-t border-[#222230] flex items-center gap-2">
                <label className="p-2.5 text-[#71717A] hover:text-[#7C5CFC] rounded-xl hover:bg-[#1A1A26] transition cursor-pointer flex-shrink-0" title="Đính kèm ảnh">
                  <ImagePlus className="w-5 h-5" />
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
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Nhắn tin trả lời độc giả ${selectedConv.userName}...`}
                  className="flex-1 bg-[#0A0A0F] border border-[#242436] focus:border-[#7C5CFC] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#52525B] outline-none transition"
                  disabled={sending}
                />

                <button
                  type="submit"
                  disabled={sending || (!replyText.trim() && !replyImage)}
                  className="py-2.5 px-4 bg-[#7C5CFC] hover:bg-[#6D4CF0] disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 flex-shrink-0 shadow active:scale-95"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Gửi Phản Hồi</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#71717A] space-y-3">
              <MessageCircle className="w-12 h-12 text-[#2B2B3E]" />
              <div className="text-sm font-semibold text-white">Chọn một cuộc trò chuyện để bắt đầu</div>
              <p className="text-xs text-[#71717A] max-w-sm">
                Bạn có thể trao đổi 1-1, kiểm tra tình trạng riêng và hỗ trợ từng độc giả ngay tại đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
