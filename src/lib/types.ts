export interface User {
  id: string;
  phone: string;
  pin: string;
  vipUntil: string | null; // ISO string
  createdAt: string;
}

export interface Wallet {
  userId: string;
  balance: number; // Số xu hiện có
  updatedAt: string;
}

export interface Chapter {
  id: string;
  storyId: string;
  chapterIndex: number; // 1, 2, 3...
  title: string;
  content: string; // Nội dung văn bản
  images?: string[]; // Danh sách ảnh truyện lướt dọc (Webtoon / TikTok)
  priceCoins: number; // 0 = Free, 1 hoặc 2 Xu
  createdAt: string;
}

export interface Story {
  id: string;
  code: string; // Mã số TikTok (vd: "01", "02")
  title: string;
  slug: string;
  coverImage: string;
  genre: string; // "Kinh dị", "Giật gân", "Drama", "Xuyên không"...
  summary: string;
  views: number;
  status: 'ongoing' | 'completed' | 'upcoming';
  chaptersCount: number;
  createdAt: string;
}

export interface UnlockedChapter {
  id: string;
  userId: string;
  chapterId: string;
  storyId: string;
  unlockedAt: string;
}

export type OrderPackage = 'COIN_10K' | 'COIN_20K' | 'COIN_50K' | 'VIP_39K' | 'TIP_COFFEE';

export interface Order {
  id: string;
  orderCode: string; // Mã nạp chuyển khoản (vd: "CR10A9", "VIP39X")
  userId: string;
  packageType: OrderPackage;
  amountVnd: number; // 10000, 20000, 50000, 39000, hoặc số tiền tip
  coinsReceived: number; // 15, 35, 100, 0
  vipDaysReceived: number; // 0, 0, 0, 30
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'expired';
  sepayTransactionId?: string;
  tipDetails?: {
    storyId?: string;
    chapterIndex?: number;
    message?: string;
    isPrivate?: boolean;
  };
  createdAt: string;
  completedAt?: string;
}

export interface AnalyticsEvent {
  id: string;
  path: string;
  storyId?: string;
  storyTitle?: string;
  referrer: string; // "tiktok", "facebook", "direct", "google"...
  device: string;   // "iPhone", "Android", "Desktop", "Tablet"
  userId?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  storyId: string;
  chapterIndex: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: number;
  likedBy?: string[];
  createdAt: string;
}

export interface ReadingHistoryItem {
  storyId: string;
  storySlug: string;
  storyTitle: string;
  storyCover: string;
  chapterIndex: number;
  chapterTitle: string;
  updatedAt: string;
}

export interface FeedbackItem {
  id: string;
  type: 'content' | 'bug' | 'payment' | 'other';
  content: string;
  contact?: string; // SĐT / Zalo / Email để liên hệ
  imageUrl?: string; // Ảnh chụp màn hình lỗi / biên lai
  userId?: string;
  userName?: string;
  status: 'new' | 'reviewed';
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'admin';
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  userId: string;
  userName: string;
  userContact?: string;
  lastMessage: string;
  lastSender: 'user' | 'admin';
  unreadAdmin: number;
  unreadUser: number;
  updatedAt: string;
}
