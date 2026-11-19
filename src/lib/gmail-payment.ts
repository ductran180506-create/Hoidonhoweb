import tls from 'tls';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';

export interface SacombankEmailTx {
  uid: string;
  account: string;
  dateStr: string;
  sign: '+' | '-';
  amountVnd: number;
  description: string;
  rawText: string;
}

// Chống spam kết nối IMAP liên tục trong cùng 1-2 giây
let lastImapScanTime = 0;
let cachedRecentTxs: SacombankEmailTx[] = [];
let isScanning = false;

/**
 * Kết nối trực tiếp vào Gmail qua giao thức IMAP TLS (cổng 993)
 * Đọc 6 thư thông báo giao dịch mới nhất từ Sacombank (info@sacombank.com.vn)
 */
export async function fetchRecentSacombankEmails(force = false): Promise<SacombankEmailTx[]> {
  const now = Date.now();
  if (!force && now - lastImapScanTime < 2500 && cachedRecentTxs.length > 0) {
    return cachedRecentTxs;
  }
  if (isScanning) {
    return cachedRecentTxs;
  }

  const gmailUser = (process.env.GMAIL_USER || 'congducc2k6@gmail.com').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();

  if (!gmailUser || !gmailPass) {
    console.warn('[Gmail-Sacombank] Chưa cấu hình GMAIL_USER hoặc GMAIL_APP_PASSWORD');
    return [];
  }

  isScanning = true;

  return new Promise<SacombankEmailTx[]>((resolve) => {
    const results: SacombankEmailTx[] = [];
    let settled = false;

    const finish = (txs: SacombankEmailTx[]) => {
      if (settled) return;
      settled = true;
      isScanning = false;
      lastImapScanTime = Date.now();
      if (txs.length > 0) {
        cachedRecentTxs = txs;
      }
      resolve(txs);
    };

    const socket = tls.connect({
      host: 'imap.gmail.com',
      port: 993,
      servername: 'imap.gmail.com',
      rejectUnauthorized: false,
    });

    const timeout = setTimeout(() => {
      try {
        socket.destroy();
      } catch {}
      finish(results);
    }, 6500);

    let buffer = '';
    let step = 0;

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');

      if (step === 0 && buffer.includes('* OK')) {
        step = 1;
        buffer = '';
        socket.write(`A1 LOGIN "${gmailUser}" "${gmailPass}"\r\n`);
      } else if (step === 1 && (buffer.includes('A1 OK') || buffer.includes('A1 NO') || buffer.includes('A1 BAD'))) {
        if (!buffer.includes('A1 OK')) {
          clearTimeout(timeout);
          socket.destroy();
          finish([]);
          return;
        }
        step = 2;
        buffer = '';
        socket.write('A2 SELECT INBOX\r\n');
      } else if (step === 2 && buffer.includes('A2 OK')) {
        step = 3;
        buffer = '';
        socket.write('A3 SEARCH SUBJECT "SACOMBANK THONG BAO GIAO DICH PHAT SINH"\r\n');
      } else if (step === 3 && buffer.includes('A3 OK')) {
        const match = buffer.match(/\* SEARCH ([0-9 ]+)/);
        if (!match || !match[1].trim()) {
          clearTimeout(timeout);
          socket.write('A5 LOGOUT\r\n');
          socket.destroy();
          finish([]);
          return;
        }
        const ids = match[1].trim().split(/\s+/);
        const recentIds = ids.slice(-6); // Lấy 6 giao dịch Sacombank mới nhất
        step = 4;
        buffer = '';
        socket.write(`A4 FETCH ${recentIds.join(',')} (BODY.PEEK[TEXT])\r\n`);
      } else if (step === 4 && buffer.includes('A4 OK')) {
        clearTimeout(timeout);
        const blocks = buffer.split(/\* \d+ FETCH/);
        for (const blk of blocks) {
          const bodyMatch = blk.match(/BODY\[TEXT\] \{\d+\}\r?\n([\s\S]*?)(?:\r?\n\)|\r?\nA4 OK)/);
          if (!bodyMatch) continue;
          const rawB64 = bodyMatch[1].replace(/[\r\n\s)]/g, '');
          try {
            const html = Buffer.from(rawB64, 'base64').toString('utf8');
            const text = html
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (!text.includes('SACOMBANK')) continue;

            const accMatch = text.match(/Tài khoản\s*\/\s*Account\s*(\d+)/i);
            const dateMatch = text.match(/Ngày\s*\/\s*Date\s*([\d/]+\s+[\d:]+)/i);
            const txMatch = text.match(/Phát sinh\s*\/\s*Transaction\s*([+-])\s*([\d,.]+)\s*VND/i);
            const descMatch = text.match(/Nội dung\s*\/\s*Description\s*([\s\S]*?)(?:Trân trọng cảm ơn|$)/i);

            if (txMatch) {
              const sign = txMatch[1] as '+' | '-';
              const amountVnd = parseInt(txMatch[2].replace(/[^\d]/g, ''), 10) || 0;
              const description = (descMatch?.[1] || '').trim();
              const account = accMatch?.[1] || '040121635056';
              const dateStr = dateMatch?.[1] || '';

              results.push({
                uid: `${dateStr}-${sign}${amountVnd}-${description.slice(0, 30)}`,
                account,
                dateStr,
                sign,
                amountVnd,
                description,
                rawText: text,
              });
            }
          } catch {}
        }

        try {
          socket.write('A5 LOGOUT\r\n');
          socket.destroy();
        } catch {}
        finish(results);
      }
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      finish(results);
    });
  });
}

/**
 * Quét hòm thư Gmail Sacombank và tự động hoàn tất các đơn hàng đang chờ (pending / processing)
 * nếu phát hiện email báo cộng tiền (+) khớp mã đơn (CR... hoặc VIP...) và số tiền.
 */
export async function syncGmailSacombankPayments(targetOrderCode?: string, force = false): Promise<{
  matchedOrders: string[];
  recentEmails: SacombankEmailTx[];
}> {
  const matchedOrders: string[] = [];
  const emails = await fetchRecentSacombankEmails(force);

  // Chỉ lọc các email TIỀN VÀO (+) của tài khoản Sacombank 040121635056
  const incomingEmails = emails.filter(
    (e) => e.sign === '+' && e.account.includes('040121635056') && e.amountVnd > 0
  );

  if (incomingEmails.length === 0) {
    return { matchedOrders, recentEmails: emails };
  }

  // Lấy danh sách đơn đang pending hoặc processing từ Supabase
  let pendingOrders: Array<{
    id: string;
    orderCode: string;
    userId: string;
    amountVnd: number;
    coins: number;
    isVip: boolean;
    vipDays: number;
    createdAt: string;
  }> = [];

  try {
    const { data: sbPending } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (sbPending && sbPending.length > 0) {
      pendingOrders = sbPending.map((t: any) => {
        const isVip = Boolean(t.payment_code?.startsWith('VIP') || Number(t.amount_vnd) === 39000);
        return {
          id: t.id,
          orderCode: t.payment_code,
          userId: t.user_id,
          amountVnd: Number(t.amount_vnd) || 10000,
          coins: Number(t.coins) || (isVip ? 50 : 20),
          isVip,
          vipDays: isVip ? 30 : 0,
          createdAt: t.created_at,
        };
      });
    }
  } catch (e) {
    console.warn('[Gmail-Sacombank] Lỗi đọc pending transactions từ Supabase:', e);
  }

  // Gộp thêm đơn pending/processing từ Local DB (nếu chưa có trong danh sách)
  for (const lo of db.getAllOrders()) {
    if ((lo.status === 'pending' || lo.status === 'processing') && !pendingOrders.some((p) => p.orderCode === lo.orderCode)) {
      const isVip = lo.packageType === 'VIP_39K' || (lo.vipDaysReceived || 0) > 0;
      pendingOrders.push({
        id: lo.id,
        orderCode: lo.orderCode,
        userId: lo.userId,
        amountVnd: lo.amountVnd,
        coins: lo.coinsReceived,
        isVip,
        vipDays: lo.vipDaysReceived || (isVip ? 30 : 0),
        createdAt: lo.createdAt,
      });
    }
  }

  if (targetOrderCode) {
    // Ưu tiên kiểm tra đơn đang được hỏi trước
    pendingOrders.sort((a, b) => (a.orderCode === targetOrderCode ? -1 : b.orderCode === targetOrderCode ? 1 : 0));
  }

  // Đối chiếu từng đơn pending với các email tiền vào (+) của Sacombank
  for (const ord of pendingOrders) {
    if (!ord.orderCode) continue;

    // Kiểm tra hiệu lực 15 phút (10 phút hiển thị + 5 phút vùng đệm ngầm)
    const createdTime = new Date(ord.createdAt || Date.now()).getTime();
    const ageMs = Date.now() - createdTime;
    if (ageMs > 15 * 60 * 1000) {
      continue;
    }

    const codeUpper = ord.orderCode.toUpperCase();
    const matchedEmail = incomingEmails.find(
      (mail) =>
        mail.description.toUpperCase().includes(codeUpper) &&
        mail.amountVnd >= ord.amountVnd
    );

    if (matchedEmail) {
      await creditCompletedOrder(ord);
      matchedOrders.push(ord.orderCode);
    }
  }

  return { matchedOrders, recentEmails: emails };
}

/**
 * Cộng Điểm / kích hoạt VIP và đánh dấu hoàn tất đơn hàng trên cả Supabase và Local DB
 */
async function creditCompletedOrder(ord: {
  id: string;
  orderCode: string;
  userId: string;
  amountVnd: number;
  coins: number;
  isVip: boolean;
  vipDays: number;
}) {
  // 1. Cập nhật trạng thái transaction trên Supabase (chỉ cập nhật nếu vẫn đang pending để chống cộng trùng)
  try {
    const { data: updatedRows, error: updateErr } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'completed' })
      .eq('payment_code', ord.orderCode)
      .in('status', ['pending', 'processing'])
      .select('id');

    // Nếu đơn đã được xử lý bởi tiến trình khác trước đó thì dừng lại
    if (!updateErr && (!updatedRows || updatedRows.length === 0)) {
      db.completeOrder(ord.orderCode);
      return;
    }
  } catch (e) {
    console.warn('[Gmail-Sacombank] Lỗi update transaction:', e);
  }

  // 2. Cập nhật Local DB
  const localOrd = db.getOrderByCode(ord.orderCode);
  if (localOrd && localOrd.status !== 'completed') {
    db.completeOrder(ord.orderCode);
  } else if (!localOrd) {
    db.addCoins(ord.userId, ord.coins);
  }

  // 3. Cộng Điểm vào bảng users trên Supabase
  try {
    const { data: sbUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', ord.userId)
      .maybeSingle();

    if (sbUser) {
      const newBalance = (Number(sbUser.balance) || 0) + ord.coins;
      await supabaseAdmin
        .from('users')
        .update({ balance: newBalance })
        .eq('id', ord.userId);
    } else {
      await supabaseAdmin.from('users').insert({
        id: ord.userId,
        phone: ord.userId,
        balance: ord.coins,
        created_at: new Date().toISOString(),
      });
    }

    // 4. Kích hoạt VIP nếu là gói VIP
    if (ord.isVip && ord.vipDays > 0) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ord.userId);
      let baseDate = new Date();
      const currentVip = authUser?.user?.user_metadata?.vip_until;
      if (currentVip && new Date(currentVip) > baseDate) {
        baseDate = new Date(currentVip);
      }
      baseDate.setDate(baseDate.getDate() + ord.vipDays);
      await supabaseAdmin.auth.admin.updateUserById(ord.userId, {
        user_metadata: {
          ...(authUser?.user?.user_metadata || {}),
          is_vip: true,
          vip_until: baseDate.toISOString(),
        },
      });
    }
  } catch (e) {
    console.warn('[Gmail-Sacombank] Lỗi cộng điểm Supabase user:', e);
  }
}
