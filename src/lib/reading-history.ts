'use client';

import { ReadingHistoryItem } from './types';

const HISTORY_KEY = 'carrot_reading_history';
const LAST_READ_KEY = 'carrot_last_read';

export function saveReadingProgress(item: ReadingHistoryItem) {
  if (typeof window === 'undefined') return;

  try {
    // 1. Lưu tập đọc gần nhất
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(item));

    // 2. Lưu vào danh sách lịch sử đọc (tối đa 10 bộ truyện)
    const raw = localStorage.getItem(HISTORY_KEY);
    let list: ReadingHistoryItem[] = raw ? JSON.parse(raw) : [];
    list = list.filter(i => i.storyId !== item.storyId);
    list.unshift(item);
    if (list.length > 10) list = list.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

export function getLastRead(): ReadingHistoryItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAllReadingHistory(): ReadingHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
