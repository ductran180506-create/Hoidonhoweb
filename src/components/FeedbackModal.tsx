'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { MessageSquarePlus, X, Send, CheckCircle2, AlertCircle, Headphones, Sparkles, Bug, CreditCard, ExternalLink, ImagePlus, Trash2 } from 'lucide-react';

export default function FeedbackModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'contact'>('form');
  const [type, setType] = useState<'content' | 'bug' | 'payment' | 'other'>('content');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Ảnh đính kèm không được vượt quá 10MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('Vui lòng nhập nội dung góp ý của bạn');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('content', content.trim());
      if (contact.trim()) formData.append('contact', contact.trim());
      if (user?.id) formData.append('userId', user.id);
      formData.append('userName', user?.phone || user?.email || 'Độc giả');
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setContent('');
        setContact('');
        setImageFile(null);
        setImagePreview(null);
        setTimeout(() => {
          setSuccess(false);
          setIsOpen(false);
        }, 2200);
      } else {
        setErrorMsg(data.message || 'Lỗi gửi góp ý. Vui lòng thử lại!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Nút bấm nổi ở góc dưới bên phải */}
      <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
        <button
          onClick={() => {
            setIsOpen(true);
            setSuccess(false);
            setErrorMsg(null);
          }}
          className="group flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-2.5 rounded-full bg-[#181822] hover:bg-[#222230] text-white text-xs font-medium border border-[#2D2D3D] hover:border-[#7C5CFC]/60 shadow-lg shadow-black/50 transition-all duration-200 active:scale-95"
          title="Góp ý cho website hoặc liên hệ hỗ trợ"
        >
          <div className="relative">
            <MessageSquarePlus className="w-4 h-4 text-[#A78BFA] group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#7C5CFC] animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#7C5CFC]" />
          </div>
          <span className="hidden sm:inline text-[#E4E4E7] group-hover:text-white">Góp ý & Hỗ trợ</span>
          <span className="sm:hidden text-[11px] text-[#E4E4E7]">Hỗ trợ</span>
        </button>
      </div>

      {/* Cửa sổ Modal Góp ý */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-md bg-[#111116] border border-[#22222E] rounded-2xl p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-[#1E1E28] transition"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Tiêu đề */}
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 flex items-center justify-center text-[#A78BFA]">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Góp Ý & Hỗ Trợ Độc Giả</h3>
                  <p className="text-[11px] text-[#71717A]">Ý kiến của bạn giúp kênh hoàn thiện hơn mỗi ngày</p>
                </div>
              </div>
            </div>

            {/* Chuyển Tab */}
            <div className="flex items-center gap-1 p-1 bg-[#0A0A0E] rounded-lg border border-[#1E1E26] text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`flex-1 py-1.5 rounded-md transition text-center ${
                  activeTab === 'form' ? 'bg-[#222230] text-white shadow-sm' : 'text-[#71717A] hover:text-white'
                }`}
              >
                ✍️ Gửi Góp Ý Nhanh
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`flex-1 py-1.5 rounded-md transition text-center ${
                  activeTab === 'contact' ? 'bg-[#222230] text-white shadow-sm' : 'text-[#71717A] hover:text-white'
                }`}
              >
                💬 Kênh Hỗ Trợ Trực Tiếp
              </button>
            </div>

            {/* TAB 1: FORM GỬI GÓP Ý */}
            {activeTab === 'form' && (
              <>
                {success ? (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                    <div className="text-sm font-semibold text-white">Đã Gửi Thành Công!</div>
                    <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto">
                      Cảm ơn bạn rất nhiều! Tác giả đã nhận được và sẽ đọc từng dòng góp ý của bạn.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Chọn phân loại */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#A1A1AA]">Loại góp ý:</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setType('content')}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                            type === 'content'
                              ? 'bg-[#7C5CFC]/15 border-[#7C5CFC]/50 text-white'
                              : 'bg-[#16161F] border-[#22222E] text-[#A1A1AA] hover:border-[#333344]'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span className="truncate">Góp ý truyện</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setType('bug')}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                            type === 'bug'
                              ? 'bg-[#7C5CFC]/15 border-[#7C5CFC]/50 text-white'
                              : 'bg-[#16161F] border-[#22222E] text-[#A1A1AA] hover:border-[#333344]'
                          }`}
                        >
                          <Bug className="w-3.5 h-3.5 text-[#EF4444]" />
                          <span className="truncate">Báo lỗi đọc truyện</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setType('payment')}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                            type === 'payment'
                              ? 'bg-[#7C5CFC]/15 border-[#7C5CFC]/50 text-white'
                              : 'bg-[#16161F] border-[#22222E] text-[#A1A1AA] hover:border-[#333344]'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5 text-[#10B981]" />
                          <span className="truncate">Sự cố mở khóa / Điểm</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setType('other')}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                            type === 'other'
                              ? 'bg-[#7C5CFC]/15 border-[#7C5CFC]/50 text-white'
                              : 'bg-[#16161F] border-[#22222E] text-[#A1A1AA] hover:border-[#333344]'
                          }`}
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5 text-[#3B82F6]" />
                          <span className="truncate">Tâm sự & Khác</span>
                        </button>
                      </div>
                    </div>

                    {/* Nội dung */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#A1A1AA]">
                        Nội dung chi tiết <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Hãy chia sẻ cảm nghĩ, bộ truyện bạn muốn đọc tiếp theo, hoặc lỗi bạn gặp phải..."
                        rows={4}
                        maxLength={2000}
                        className="w-full px-3 py-2 bg-[#0C0C10] border border-[#22222E] focus:border-[#7C5CFC] rounded-lg text-xs text-white placeholder-[#52525B] outline-none transition resize-none"
                      />
                      <div className="flex justify-end text-[10px] text-[#52525B]">
                        {content.length} / 2.000 ký tự
                      </div>
                    </div>

                    {/* Đính kèm ảnh chụp màn hình / Biên lai (ngay dưới nội dung chi tiết) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#A1A1AA]">
                        <span>Ảnh chụp màn hình lỗi / Biên lai <span className="text-[#71717A] text-[10px]">(Tùy chọn)</span></span>
                        {imagePreview && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Bỏ ảnh</span>
                          </button>
                        )}
                      </div>

                      {imagePreview ? (
                        <div className="relative rounded-lg overflow-hidden border border-[#2B2B3D] bg-black/60 p-1 flex items-center justify-center">
                          <img
                            src={imagePreview}
                            alt="Preview ảnh đính kèm"
                            className="max-h-36 w-auto object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 p-1 rounded-full bg-black/80 hover:bg-red-600 text-white transition shadow-lg"
                            title="Xóa ảnh này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-[#2B2B3D] hover:border-[#7C5CFC]/60 rounded-lg cursor-pointer bg-[#0D0D12] hover:bg-[#14141E] transition text-[#A1A1AA] hover:text-white text-xs group">
                          <ImagePlus className="w-4 h-4 text-[#7C5CFC] group-hover:scale-110 transition" />
                          <span className="text-[11px]">Bấm vào đây để đính kèm ảnh (ảnh lỗi, biên lai...)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Thông tin liên hệ lại (Tùy chọn) */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-[#A1A1AA]">
                        SĐT / Zalo hoặc Email <span className="text-[#71717A] text-[10px]">(Không bắt buộc - để tác giả phản hồi bạn)</span>
                      </label>
                      <input
                        type="text"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="vd: 0912... hoặc email@..."
                        className="w-full px-3 py-2 bg-[#0C0C10] border border-[#22222E] focus:border-[#7C5CFC] rounded-lg text-xs text-white placeholder-[#52525B] outline-none transition"
                      />
                    </div>

                    {/* Báo lỗi nếu có */}
                    {errorMsg && (
                      <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {/* Nút gửi */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 bg-[#7C5CFC] hover:bg-[#6D4CF0] disabled:opacity-50 text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#7C5CFC]/20"
                    >
                      {submitting ? (
                        <span>Đang gửi...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi Góp Ý Cho Tác Giả</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* TAB 2: KÊNH HỖ TRỢ TRỰC TIẾP */}
            {activeTab === 'contact' && (
              <div className="space-y-3.5 py-1">
                {/* Thông báo hỗ trợ nạp tiền khẩn cấp */}
                <div className="p-3 bg-[#1A1A26] border border-[#2B2B3D] rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Hỗ trợ mở khóa khẩn cấp</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Nếu bạn quét mã VietQR mà sau 1–2 phút chưa thấy cộng điểm, hãy chụp ảnh màn hình biên lai chuyển khoản và nhắn tin trực tiếp để tác giả duyệt ngay trong 1 phút:
                  </p>
                </div>

                {/* Các kênh liên hệ trực tiếp */}
                <div className="space-y-2">
                  <a
                    href="https://www.tiktok.com/@carrot.tia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-[#16161F] hover:bg-[#20202C] border border-[#22222E] hover:border-[#7C5CFC]/50 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs border border-[#333344]">
                        TT
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-[#A78BFA] transition">
                          Nhắn tin qua TikTok
                        </div>
                        <div className="text-[11px] text-[#71717A]">@carrot.tia (Kênh chính thức)</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#71717A] group-hover:text-white transition" />
                  </a>

                  <div className="p-3 bg-[#16161F] border border-[#22222E] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">Thời gian phản hồi</div>
                      <div className="text-[11px] text-[#71717A]">Thường phản hồi trong vòng 5 – 15 phút</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      Hoạt động 24/7
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
