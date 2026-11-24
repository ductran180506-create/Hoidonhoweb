export const metadata = {
  title: 'Hệ Thống Đang Bảo Trì - Hồi Đó Nhỏ (@carrot.tia)',
  description: 'Website đang bảo trì nâng cấp hệ thống. Sẽ có quà đền bù cho độc giả sau khi mở lại.',
};

export default function MaintenancePage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full text-center space-y-5 bg-[#111116] border border-[#22222C] p-6 sm:p-7 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow hiệu ứng nền */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-carrot-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Biểu tượng Mascot */}
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-carrot-500/10 border border-carrot-500/30 text-3xl shadow-inner mx-auto">
          🥕
        </div>

        {/* Tiêu đề & Thông báo ngắn gọn */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
            Đang Bảo Trì Hệ Thống
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            HỒI ĐÓ NHỎ ĐANG NÂNG CẤP
          </h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Web đang tạm ngưng ít phút để nâng cấp hệ thống và cập nhật truyện mới. Bạn vui lòng quay lại sau nhé!
          </p>
        </div>

        {/* Thông báo quà đền bù gọn gàng */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 font-medium flex items-center justify-center gap-2">
          <span className="text-base">🎁</span>
          <span>Sẽ có <strong>quà đền bù</strong> cho tất cả độc giả ngay khi web mở lại!</span>
        </div>

        {/* Nút chuyển hướng sang TikTok */}
        <div className="pt-1">
          <a
            href="https://www.tiktok.com/@carrot.tia"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-semibold rounded-xl transition shadow-md active:scale-95"
          >
            <span>Xem video trên TikTok @carrot.tia</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}
