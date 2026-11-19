export const metadata = {
  title: 'Hệ Thống Đang Bảo Trì - Hồi Đó Nhỏ (@carrot.tia)',
  description: 'Website đang trong quá trình bảo trì và nâng cấp nội dung. Vui lòng quay lại sau.',
};

export default function MaintenancePage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-[#111116] border border-[#1E1E26] p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow hiệu ứng nền */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-carrot-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Biểu tượng Mascot */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-carrot-500/10 border border-carrot-500/30 text-4xl shadow-inner mx-auto animate-pulse">
          🥕
        </div>

        {/* Tiêu đề & Thông báo */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            Đang Tạm Khóa Bảo Trì
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            HỒI ĐÓ NHỎ ĐANG NÂNG CẤP
          </h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Chúng mình đang tiến hành cập nhật thêm các tập truyện mới, tối ưu hóa tốc độ tải ảnh và nâng cấp hệ thống để mang lại trải nghiệm đọc tốt nhất cho độc giả.
          </p>
        </div>

        {/* Hộp trạng thái */}
        <div className="bg-[#0A0A0E] border border-[#1C1C24] rounded-xl p-4 text-xs space-y-1.5 text-left">
          <div className="flex justify-between text-[#71717A]">
            <span>Trạng thái:</span>
            <span className="text-amber-400 font-medium">Bảo trì định kỳ</span>
          </div>
          <div className="flex justify-between text-[#71717A]">
            <span>Dự kiến hoàn tất:</span>
            <span className="text-white font-medium">Sớm nhất hôm nay</span>
          </div>
        </div>

        {/* Nút duy nhất: Chuyển hướng sang TikTok xem video */}
        <div className="pt-2">
          <a
            href="https://www.tiktok.com/@carrot.tia"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-semibold rounded-xl transition shadow-md active:scale-95"
          >
            <span>Xem video trên TikTok @carrot.tia</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}
