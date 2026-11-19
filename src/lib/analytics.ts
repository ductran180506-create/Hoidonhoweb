'use client';

/**
 * Tạo và lưu mã nhận diện thiết bị duy nhất (1 Máy = 1 Mã cố định).
 * Dù người dùng có F5 100 lần hay tắt trình duyệt mở lại, mã này vẫn giữ nguyên.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let devId = localStorage.getItem('hdn_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('hdn_device_id', devId);
    }
    return devId;
  } catch {
    return 'dev_unknown';
  }
}

export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Server';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone (iOS)';
  if (/iPad/i.test(ua)) return 'iPad (iOS)';
  if (/Android/i.test(ua)) return 'Android Phone';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Macintosh/i.test(ua)) return 'Mac OS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Mobile/Khác';
}

export function getReferrerSource(): string {
  if (typeof window === 'undefined') return 'Truy cập trực tiếp';
  const ref = document.referrer.toLowerCase();
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source')?.toLowerCase();

  if (utmSource?.includes('tiktok') || ref.includes('tiktok.com') || ref.includes('musical.ly')) {
    return 'TikTok Bio';
  }
  if (utmSource?.includes('facebook') || ref.includes('facebook.com') || ref.includes('fb.com')) {
    return 'Facebook';
  }
  if (utmSource?.includes('zalo') || ref.includes('zalo')) {
    return 'Zalo';
  }
  if (ref.includes('google.com')) {
    return 'Google Search';
  }
  if (ref) {
    try {
      const parsed = new URL(ref);
      return parsed.hostname;
    } catch {
      return ref;
    }
  }
  return 'Truy cập trực tiếp';
}

/**
 * Ghi nhận lượt truy cập thông minh theo đúng 1 máy:
 * - 1 máy chỉ được tính 1 lần duy nhất trong danh sách.
 * - Khi máy đó đọc tiếp hoặc F5, chỉ cập nhật mốc thời gian hoạt động gần nhất (cách đây bao lâu).
 */
export function trackPageView(params: { path: string; storyId?: string; storyTitle?: string; userId?: string }) {
  if (typeof window === 'undefined') return;

  try {
    const cleanPath = params.path || '/';
    const deviceId = getOrCreateDeviceId();

    // Giảm tải mạng: Tránh gửi 2 request liên tiếp trong 3 giây nếu bấm click liên thanh
    const now = Date.now();
    const lastSendKey = 'hdn_last_track_ping';
    const lastSend = parseInt(sessionStorage.getItem(lastSendKey) || '0', 10);
    if (now - lastSend < 3000) return;
    sessionStorage.setItem(lastSendKey, now.toString());

    const payload = {
      path: cleanPath,
      storyId: params.storyId,
      storyTitle: params.storyTitle,
      deviceId,
      userId: params.userId,
      referrer: getReferrerSource(),
      device: getDeviceInfo(),
    };

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) {
    // ignore
  }
}
