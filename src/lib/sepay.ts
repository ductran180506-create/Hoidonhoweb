export interface VietQrConfig {
  bankId: string; // vd: MBBank, VCB, TPBank
  accountNo: string;
  accountName: string;
  template?: string; // compact, qr_only
}

// Cấu hình ngân hàng mặc định: Sacombank - 040121635056 - TRAN CONG DUC
export const DEFAULT_BANK_CONFIG: VietQrConfig = {
  bankId: "Sacombank",
  accountNo: "040121635056",
  accountName: "TRAN CONG DUC",
  template: "compact"
};

/**
 * Sinh link ảnh mã VietQR tự động theo chuẩn NAPAS 24/7
 * URL format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
 */
export function generateVietQrUrl(params: {
  amount: number;
  orderCode: string;
  bankConfig?: VietQrConfig;
}): string {
  const config = params.bankConfig || DEFAULT_BANK_CONFIG;
  const content = encodeURIComponent(params.orderCode);
  const accountName = encodeURIComponent(config.accountName);

  return `https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-${config.template || 'compact'}.png?amount=${params.amount}&addInfo=${content}&accountName=${accountName}`;
}

/**
 * Tạo mã đơn hàng ngắn gọn, dễ nhớ, dễ gõ nếu chuyển khoản tay
 * Ví dụ: CR10A7 (Gói 10k), CR20B8 (Gói 20k), VIP39K (Gói VIP)
 */
export function generateOrderCode(packageType: string): string {
  const prefix = packageType.startsWith('VIP') ? 'VIP' : packageType.startsWith('TIP') ? 'CF' : 'CR';
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now().toString().slice(-2);
  return `${prefix}${timestamp}${randomStr}`;
}
