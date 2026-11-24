/**
 * Utility functions for formatting and calculating VIP package duration
 */

export function isVipActive(vipUntil: string | null | undefined): boolean {
  if (!vipUntil) return false;
  const exp = new Date(vipUntil).getTime();
  return !isNaN(exp) && exp > Date.now();
}

export function formatVipTimeRemaining(vipUntil: string | null | undefined): string {
  if (!vipUntil) return 'Không giới hạn';
  const exp = new Date(vipUntil).getTime();
  if (isNaN(exp)) return 'Không xác định';

  const now = Date.now();
  const diffMs = exp - now;
  if (diffMs <= 0) return 'Đã hết hạn';

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return `${days} ngày ${hours} giờ`;
  }
  if (hours > 0) {
    return `${hours} giờ ${mins} phút`;
  }
  return `${Math.max(1, mins)} phút`;
}

export function formatVipExpireDate(vipUntil: string | null | undefined): string {
  if (!vipUntil) return '';
  const d = new Date(vipUntil);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${mins} ngày ${day}/${month}/${year}`;
}
