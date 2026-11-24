import { supabaseAdmin } from './supabase';
import { SupportConversation, SupportMessage } from './types';
import { db } from './db';

export interface ChatStoreData {
  conversations: SupportConversation[];
  messages: SupportMessage[];
  lastUpdated: string;
}

let cachedData: ChatStoreData | null = null;
let lastFetchTime = 0;

export async function getChatStore(): Promise<ChatStoreData> {
  const now = Date.now();
  // Cache 2 giây trong RAM để phản hồi cực nhanh 0ms
  if (cachedData && (now - lastFetchTime < 2000)) {
    return cachedData;
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from('comics')
      .download('system/chat_store.json');

    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      cachedData = {
        conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };
      lastFetchTime = now;
      return cachedData;
    }
  } catch (e) {
    console.warn('Lỗi đọc chat_store từ Supabase Storage:', e);
  }

  // Khởi tạo từ Local DB nếu trên Supabase Storage chưa có
  const localConversations = db.getAllConversations();
  const initialStore: ChatStoreData = {
    conversations: localConversations,
    messages: [],
    lastUpdated: new Date().toISOString(),
  };

  cachedData = initialStore;
  lastFetchTime = now;
  return initialStore;
}

export async function saveChatStore(store: ChatStoreData): Promise<void> {
  store.lastUpdated = new Date().toISOString();
  cachedData = store;
  lastFetchTime = Date.now();

  try {
    const buffer = Buffer.from(JSON.stringify(store, null, 2), 'utf-8');
    await supabaseAdmin.storage
      .from('comics')
      .upload('system/chat_store.json', buffer, {
        upsert: true,
        contentType: 'application/json',
      });
  } catch (e) {
    console.warn('Lỗi ghi chat_store lên Supabase Storage:', e);
  }
}
