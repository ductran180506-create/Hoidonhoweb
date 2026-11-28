const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load env
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.replace(/^['"]|['"]$/g, '').trim();
    envVars[match[1]] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

// 2. Load data.json
const dataPath = path.join(__dirname, '..', 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function restoreAllVips() {
  console.log("=== STARTING COMPREHENSIVE VIP RESTORATION ===");
  
  // Find all VIP orders
  const orders = data.orders || [];
  const vipOrders = orders.filter(o => 
    o.packageType === 'VIP_39K' || 
    o.amountVnd === 39000 || 
    (o.vipDaysReceived && o.vipDaysReceived > 0) ||
    (o.orderCode && o.orderCode.startsWith('VIP'))
  );

  console.log(`Found ${vipOrders.length} VIP orders in data.json.`);

  // Date 30 days from now (or keep existing if further in future)
  const now = new Date();
  const minVipUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 28/12/2026
  console.log(`Standard VIP minimum expiry: ${minVipUntil}`);

  // Map distinct users to restore
  const usersToRestore = new Map();

  vipOrders.forEach(o => {
    const uid = o.userId;
    if (!uid) return;
    
    // Determine expiry: if order had specific end date or if higher
    let exp = minVipUntil;
    if (uid === 'user-1794741026031-hsits') {
      exp = '2027-01-14T11:27:03.272Z'; // preserve longer VIP
    }

    if (!usersToRestore.has(uid)) {
      usersToRestore.set(uid, {
        userId: uid,
        phone: o.userPhone || (uid.startsWith('customer-') ? uid : uid),
        name: o.userName || o.customerName || (uid.startsWith('customer-') ? uid.replace('customer-', 'Khách ') : 'Hội viên VIP'),
        email: o.userEmail || '',
        orderCode: o.orderCode || `VIP_${Date.now()}`,
        vipUntil: exp,
        coins: o.coinsReceived || 30,
        orders: []
      });
    }

    const u = usersToRestore.get(uid);
    u.orders.push(o);
    if (o.userName && !u.name) u.name = o.userName;
    if (o.userPhone && !u.phone) u.phone = o.userPhone;
    if (o.userEmail && !u.email) u.email = o.userEmail;
  });

  // Also include user 19e07745-9f33-493e-b499-6918674f5c59
  const existingVipUid = '19e07745-9f33-493e-b499-6918674f5c59';
  if (!usersToRestore.has(existingVipUid)) {
    usersToRestore.set(existingVipUid, {
      userId: existingVipUid,
      phone: existingVipUid,
      name: 'Hội viên VIP',
      email: '',
      orderCode: 'ADMIN_VIP_30D',
      vipUntil: minVipUntil,
      coins: 30,
      orders: []
    });
  }

  // Also include any user in data.users who had vipUntil
  (data.users || []).forEach(u => {
    if (u.vipUntil && new Date(u.vipUntil) > now) {
      if (!usersToRestore.has(u.id)) {
        usersToRestore.set(u.id, {
          userId: u.id,
          phone: u.phone || u.id,
          name: u.name || 'Hội viên VIP',
          email: u.email || '',
          orderCode: `VIP_RESTORE_${u.id.substring(0, 8)}`,
          vipUntil: new Date(u.vipUntil) > new Date(minVipUntil) ? u.vipUntil : minVipUntil,
          coins: 30,
          orders: []
        });
      }
    }
  });

  console.log(`Total VIP accounts to sync and restore: ${usersToRestore.size}`);

  // Fetch all Supabase auth users to check for Google UUIDs
  const { data: authData } = await supabase.auth.admin.listUsers();
  const authUsers = authData?.users || [];
  const authMap = new Map();
  authUsers.forEach(au => authMap.set(au.id, au));

  let successCount = 0;
  let supabaseTxCount = 0;
  let authUpdatedCount = 0;

  for (const [uid, info] of usersToRestore.entries()) {
    // 1. Update data.json users list
    let localUser = (data.users || []).find(u => u.id === uid || (info.phone && u.phone === info.phone));
    if (localUser) {
      localUser.vipUntil = info.vipUntil;
      if (info.name && (!localUser.name || localUser.name === localUser.id)) {
        localUser.name = info.name;
      }
    } else {
      if (!data.users) data.users = [];
      data.users.push({
        id: uid,
        phone: info.phone,
        name: info.name,
        email: info.email,
        vipUntil: info.vipUntil,
        createdAt: new Date().toISOString()
      });
    }

    // 2. Mark any pending VIP orders in data.json as completed
    orders.forEach(o => {
      if (o.userId === uid && (o.packageType === 'VIP_39K' || (o.vipDaysReceived && o.vipDaysReceived > 0))) {
        o.status = 'completed';
        if (!o.completedAt) o.completedAt = new Date().toISOString();
      }
    });

    // 3. Upsert into Supabase public.users
    try {
      const { error: sbUserErr } = await supabase.from('users').upsert({
        id: uid,
        phone: info.phone || uid,
        balance: 50,
        last_active: new Date().toISOString()
      }, { onConflict: 'id' });
      
      if (sbUserErr) {
        console.warn(`Warning upserting public.users for ${uid}:`, sbUserErr.message);
      }
    } catch (e) {
      console.warn(`Exception upserting public.users for ${uid}:`, e);
    }

    // 4. Upsert into Supabase transactions
    try {
      const txId = `tx-vip-${uid.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const paymentCode = info.orderCode.startsWith('VIP') ? info.orderCode : `VIP_${info.orderCode}`;
      
      const { error: txErr } = await supabase.from('transactions').upsert({
        id: txId,
        user_id: uid,
        amount_vnd: 39000,
        coins: 30,
        payment_code: paymentCode,
        status: 'completed',
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (txErr) {
        console.warn(`Warning upserting transaction for ${uid}:`, txErr.message);
      } else {
        supabaseTxCount++;
      }
    } catch (e) {
      console.warn(`Exception upserting transaction for ${uid}:`, e);
    }

    // 5. If Google Auth UUID, update user_metadata in Supabase Auth
    if (UUID_REGEX.test(uid) || authMap.has(uid)) {
      try {
        const au = authMap.get(uid);
        const currentMeta = au?.user_metadata || {};
        const { error: authErr } = await supabase.auth.admin.updateUserById(uid, {
          user_metadata: {
            ...currentMeta,
            is_vip: true,
            vip_until: info.vipUntil
          }
        });
        if (!authErr) {
          authUpdatedCount++;
          console.log(`Updated Supabase Auth metadata for Google user: ${uid} (${au?.email || ''})`);
        } else {
          console.warn(`Error updating Auth metadata for ${uid}:`, authErr.message);
        }
      } catch (e) {
        console.warn(`Exception updating Auth metadata for ${uid}:`, e);
      }
    }

    successCount++;
  }

  // Save data.json
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Saved updated data.json successfully!`);
  console.log(`Summary:`);
  console.log(`- Total VIP accounts restored: ${successCount}`);
  console.log(`- Supabase transactions created/upserted: ${supabaseTxCount}`);
  console.log(`- Google Auth accounts updated: ${authUpdatedCount}`);
}

restoreAllVips();
