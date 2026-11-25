import { Story } from './types';

let cachedStories: Story[] | null = null;
let cacheTimestamp = 0;
const CLIENT_CACHE_TTL = 120 * 1000; // 2 phút lưu đệm trong RAM trình duyệt

/**
 * Tải danh sách truyện với bộ nhớ đệm client 2 phút.
 * Giúp người dùng chuyển trang giữa Trang chủ và Đọc truyện không tốn thêm bất kỳ lượt gọi server nào.
 */
export async function getClientStories(force = false): Promise<Story[]> {
  const now = Date.now();
  if (!force && cachedStories && now - cacheTimestamp < CLIENT_CACHE_TTL) {
    return cachedStories;
  }

  try {
    const res = await fetch('/api/stories');
    const data = await res.json();
    if (data.success && Array.isArray(data.stories)) {
      cachedStories = data.stories;
      cacheTimestamp = now;
      return data.stories;
    }
  } catch (err) {
    console.warn('Lỗi fetch client stories:', err);
  }

  return cachedStories || [];
}
