import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uenacugbaqunprmvyhka.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client dùng cho trình duyệt người dùng (Public/Anon)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        cache: 'no-store',
      });
    },
  },
});

// Client dùng cho Server/Admin API (Full quyền, bảo mật tuyệt đối)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        cache: 'no-store',
      });
    },
  },
});

// Cloudflare CDN Worker URL (Tối ưu 0đ băng thông cho ảnh truyện)
export const CLOUDFLARE_CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://hoidonho.ductran-180506.workers.dev';

/**
 * Chuyển đổi link ảnh từ Supabase Storage sang Cloudflare CDN để hưởng 0đ băng thông trọn đời
 */
export function toCdnUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const marker = '/storage/v1/object/public/comics/';
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const filename = url.slice(idx + marker.length);
    return `${CLOUDFLARE_CDN_URL}/${filename}`;
  }
  const generalMarker = '/storage/v1/object/public/';
  const genIdx = url.indexOf(generalMarker);
  if (genIdx !== -1) {
    const filename = url.slice(genIdx + generalMarker.length);
    return `${CLOUDFLARE_CDN_URL}/${filename}`;
  }
  return url;
}

/**
 * Chuyển đổi mảng link ảnh sang Cloudflare CDN
 */
export function toCdnUrls(urls?: (string | null | undefined)[] | null): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.map(u => toCdnUrl(u)).filter(Boolean);
}
