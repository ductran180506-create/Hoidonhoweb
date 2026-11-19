-- ====================================================================
-- HỒI ĐÓ NHỎ - SUPABASE DATABASE SECURITY LOCKDOWN (PHÁO ĐÀI BẢO MẬT)
-- ====================================================================

-- 1. BẬT ROW LEVEL SECURITY CHO TOÀN BỘ CÁC BẢNG
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocked_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. XÓA CÁC POLICY CŨ MỞ RỘNG
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow Users Operations" ON public.users;
    DROP POLICY IF EXISTS "Allow Unlocked Operations" ON public.unlocked_chapters;
    DROP POLICY IF EXISTS "Allow Transactions Operations" ON public.transactions;
    DROP POLICY IF EXISTS "Allow Read Stories" ON public.stories;
    DROP POLICY IF EXISTS "Allow Read Chapters" ON public.chapters;
END $$;

-- 3. CÔNG KHAI (PUBLIC / ANON): CHỈ ĐƯỢC PHÉP ĐỌC DANH SÁCH TRUYỆN & TẬP TRUYỆN
CREATE POLICY "Public Read Stories Only" 
ON public.stories 
FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Public Read Chapters Only" 
ON public.chapters 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- 4. KHÓA CHẶT BẢNG KHÁCH HÀNG (USERS) & TIỀN TỆ:
-- TUYỆT ĐỐI CẤM TRÌNH DUYỆT KHÁCH HÀNG (ANON) TỰ ĐỘNG SỬA HOẶC ĐỌC DỮ LIỆU
-- Mọi truy vấn bảng Users chỉ được thực hiện thông qua Server Next.js (Service Role Key)
CREATE POLICY "Lockdown Users For Anon" 
ON public.users 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Lockdown Transactions For Anon" 
ON public.transactions 
FOR ALL 
TO anon 
USING (false);

CREATE POLICY "Lockdown Unlocked Chapters For Anon" 
ON public.unlocked_chapters 
FOR ALL 
TO anon 
USING (false);
