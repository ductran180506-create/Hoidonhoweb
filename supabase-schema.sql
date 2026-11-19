-- ====================================================================
-- HỒI ĐÓ NHỎ (@carrot.tia) - PRODUCTION SUPABASE DATABASE SCHEMA
-- ====================================================================

-- 1. Bật Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. BẢNG TRUYỆN (STORIES)
CREATE TABLE IF NOT EXISTS public.stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    tiktok_code TEXT,
    description TEXT,
    cover_image TEXT,
    category TEXT DEFAULT 'Tình cảm',
    is_hot BOOLEAN DEFAULT false,
    views INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG TẬP TRUYỆN (CHAPTERS)
CREATE TABLE IF NOT EXISTS public.chapters (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    chapter_number INT NOT NULL,
    title TEXT NOT NULL,
    price INT DEFAULT 5, -- 0 = đọc ngay, >0 = số xu mở khóa
    images JSONB DEFAULT '[]'::jsonb, -- Danh sách link ảnh trong tập
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG KHÁCH HÀNG / TÀI KHOẢN (USERS)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- SĐT của khách
    phone TEXT UNIQUE NOT NULL,
    pin_code TEXT DEFAULT '1234', -- Mã PIN bảo vệ ví Xu (mặc định hoặc tự đặt)
    balance INT DEFAULT 0, -- Số Xu hiện có
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG TRUYỆN ĐÃ MỞ KHÓA (UNLOCKED CHAPTERS)
CREATE TABLE IF NOT EXISTS public.unlocked_chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    story_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, chapter_id)
);

-- 6. BẢNG GIAO DỊCH NẠP XU (TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY, -- TX-XXXXX
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_vnd INT NOT NULL,
    coins INT NOT NULL,
    payment_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending | completed | rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TẠO KHO LƯU ẢNH TRUYỆN CÔNG KHAI (STORAGE BUCKET: COMICS)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comics', 'comics', true)
ON CONFLICT (id) DO NOTHING;

-- Phân quyền Storage: Cho phép đọc ảnh công khai và ghi dữ liệu an toàn
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Comics" ON storage.objects;
    CREATE POLICY "Public Read Comics" ON storage.objects FOR SELECT USING (bucket_id = 'comics');

    DROP POLICY IF EXISTS "Allow All Comics Operations" ON storage.objects;
    CREATE POLICY "Allow All Comics Operations" ON storage.objects FOR ALL USING (bucket_id = 'comics');
END $$;

-- 8. PHÂN QUYỀN TRUY CẬP BẢNG DỮ LIỆU (RLS POLICIES)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocked_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow Read Stories" ON public.stories;
    CREATE POLICY "Allow Read Stories" ON public.stories FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow Read Chapters" ON public.chapters;
    CREATE POLICY "Allow Read Chapters" ON public.chapters FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow Users Operations" ON public.users;
    CREATE POLICY "Allow Users Operations" ON public.users FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow Unlocked Operations" ON public.unlocked_chapters;
    CREATE POLICY "Allow Unlocked Operations" ON public.unlocked_chapters FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow Transactions Operations" ON public.transactions;
    CREATE POLICY "Allow Transactions Operations" ON public.transactions FOR ALL USING (true);
END $$;
