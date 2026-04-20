// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPA_URL = 'https://clqekuhmpaesuauhxpam.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscWVrdWhtcGFlc3VhdWh4cGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjEwOTksImV4cCI6MjA5MjA5NzA5OX0.gPKYh__MGh0sNEA_F-0bBPKZiyCtmC3wPmJlXyo5Jt0';

let supabase = null;
let useSupabase = false;

// ============================================================
// FALLBACK LOCAL DB
// ============================================================
const DEFAULT_DB = {
  users: [{ id: 1, name: 'مدير النظام', email: 'admin@zood.com', pass: 'admin123', role: 'admin', balance: 500, createdAt: '2024-01-01' }],
  numbers: [
    { id: 1, type: 'phone', phone: '+963 944 123 456', country: 'سوريا', operator: 'سيريتل', price: 3.99, status: 'available' },
    { id: 2, type: 'phone', phone: '+963 988 654 321', country: 'سوريا', operator: 'MTN', price: 2.99, status: 'available' },
    { id: 3, type: 'whatsapp', phone: '+963 933 111 200', country: 'سوريا', operator: 'سيريتل', price: 4.99, status: 'available' },
    { id: 4, type: 'telegram', phone: '+90 532 123 4567', country: 'تركيا', operator: 'Turkcell', price: 5.99, status: 'available' },
  ],
  socialPackages: [
    { id: 1, platform: 'Instagram', type: 'متابعين', qty: 1000, price: 4.99 },
    { id: 2, platform: 'TikTok', type: 'متابعين', qty: 1000, price: 3.99 },
    { id: 3, platform: 'Facebook', type: 'متابعين', qty: 1000, price: 5.99 },
  ],
  tgVerifyPackages: [
    { id: 1, type: 'توثيق حساب شخصي', desc: 'إضافة علامة التحقق للحساب الشخصي', price: 49.99 },
  ],
  gamePackages: [
    { id: 1, game: 'PUBG Mobile', icon: '🎯', package: '60 UC', price: 0.99 },
    { id: 2, game: 'Free Fire', icon: '🔥', package: '100 Diamond', price: 0.99 },
  ],
  rechargePkgs: [
    { id: 1, country: 'سوريا', operator: 'سيريتل', quantity: 500, price: 1.99 },
    { id: 2, country: 'سوريا', operator: 'MTN سوريا', quantity: 1000, price: 3.59 },
  ],
  orders: [],
  transactions: [],
  paymentMethods: {
    binance: { addr: '347c8a4d105019df664d62048e38d986', uid: '', qr: '', active: true },
    shamcash: { walletAddress: 'c8a4d105019df664d62048e38d986', ownerName: 'عبدالحميد محمد الحسين', qr: '', phoneNumber: '0949277889', active: true },
    western: { ownerName: 'Zood Services', country: 'Syria', active: false }
  },
  customServices: []
};

let DB = JSON.parse(JSON.stringify(DEFAULT_DB));

// ============================================================
// SAFE NUMBER FORMATTING FUNCTIONS
// ============================================================
function safeFormatNumber(value) {
  if (value === undefined || value === null) return '0';
  const num = Number(value);
  return isNaN(num) ? '0' : num.toLocaleString();
}

function safeToFixed(value, decimals = 2) {
  if (value === undefined || value === null) return '0.00';
  const num = Number(value);
  return isNaN(num) ? '0.00' : num.toFixed(decimals);
}

// ============================================================
// UTILITIES
// ============================================================
function showLoadingOverlay(msg) {
  let ov = document.getElementById('loadingOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'loadingOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(8,8,14,0.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;backdrop-filter:blur(8px);';
    ov.innerHTML = `<div class="loading-spinner"></div><div style="color:var(--text2);font-size:0.9rem">${msg || ''}</div>`;
    document.body.appendChild(ov);
  } else {
    ov.style.display = 'flex';
    const msgDiv = ov.querySelector('div+div');
    if (msgDiv) msgDiv.textContent = msg || '';
  }
}

function hideLoadingOverlay() {
  const ov = document.getElementById('loadingOverlay');
  if (ov) ov.style.display = 'none';
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 4000);
}

function copyText(text) {
  if (!text || text === '—') return;
  navigator.clipboard?.writeText(text).then(() => showToast('تم النسخ', 'success')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('تم النسخ', 'success');
  });
}

function openModal(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}
function closeModal(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}
// ============================================================
// SUPABASE FUNCTIONS
// ============================================================
async function initSupabase() {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(SUPA_URL, SUPA_KEY);
    
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (!error) {
      useSupabase = true;
      await loadAllDataFromSupabase();
      const dbSt = document.getElementById('dbStatus');
      if (dbSt) { 
        dbSt.style.display = ''; 
        dbSt.className = 'db-status connected'; 
        dbSt.textContent = '🟢 Supabase'; 
        setTimeout(() => dbSt.style.display = 'none', 4000);
      }
    } else {
      throw new Error('Supabase connection failed');
    }
  } catch (e) {
    console.warn('Supabase init failed, using localStorage:', e);
    useSupabase = false;
    loadDB();
    ensureDBSchema();
    const dbSt = document.getElementById('dbStatus');
    if (dbSt) { 
      dbSt.style.display = ''; 
      dbSt.className = 'db-status local'; 
      dbSt.textContent = '💾 محلي'; 
      setTimeout(() => dbSt.style.display = 'none', 4000);
    }
  }
}

async function loadAllDataFromSupabase() {
  showLoadingOverlay('جارٍ تحميل البيانات...');
  try {
    const [usersRes, numbersRes, socialRes, tgVerifyRes, gamesRes, rechargeRes, ordersRes, transactionsRes, pmRes, servicesRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('numbers').select('*'),
      supabase.from('social_packages').select('*'),
      supabase.from('tg_verify_packages').select('*'),
      supabase.from('game_packages').select('*'),
      supabase.from('recharge_packages').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('payment_methods').select('*'),
      supabase.from('custom_services').select('*')
    ]);

    if (usersRes.data) DB.users = usersRes.data;
    if (numbersRes.data) DB.numbers = numbersRes.data;
    if (socialRes.data) DB.socialPackages = socialRes.data;
    if (tgVerifyRes.data) DB.tgVerifyPackages = tgVerifyRes.data;
    if (gamesRes.data) DB.gamePackages = gamesRes.data;
    if (rechargeRes.data) {
      DB.rechargePkgs = rechargeRes.data.map(pkg => ({
        ...pkg,
        quantity: pkg.quantity || 0,
        price: pkg.price || 0
      }));
    }
    if (ordersRes.data) DB.orders = ordersRes.data;
    if (transactionsRes.data) DB.transactions = transactionsRes.data;
    if (pmRes.data && pmRes.data.length > 0) {
      pmRes.data.forEach(pm => {
        if (pm.method && pm.data) {
          DB.paymentMethods[pm.method] = { ...pm.data, active: pm.active };
        }
      });
    }
    if (servicesRes.data) DB.customServices = servicesRes.data;
    
    saveDB();
  } catch (e) {
    console.error('Error loading data from Supabase:', e);
  } finally {
    hideLoadingOverlay();
  }
}

async function refreshAllData() {
  if (useSupabase) {
    await loadAllDataFromSupabase();
  } else {
    loadDB();
  }
  if (currentUser) {
    const fresh = DB.users.find(u => u.id === currentUser.id);
    if (fresh) currentUser = fresh;
    updateNav();
  }
  renderCustomServicesOnHome();
  renderCustomServicesList();
}

function saveDB() {
  try { localStorage.setItem('zoodDB_v3', JSON.stringify(DB)); } catch (e) { }
}

function loadDB() {
  try {
    const s = localStorage.getItem('zoodDB_v3');
    if (s) { const d = JSON.parse(s); if (d.users) DB = d; }
  } catch (e) { }
}

function ensureDBSchema() {
  if (!DB.paymentMethods) DB.paymentMethods = DEFAULT_DB.paymentMethods;
  if (!DB.paymentMethods.shamcash) DB.paymentMethods.shamcash = DEFAULT_DB.paymentMethods.shamcash;
  if (!DB.paymentMethods.binance) DB.paymentMethods.binance = DEFAULT_DB.paymentMethods.binance;
  if (!DB.paymentMethods.western) DB.paymentMethods.western = DEFAULT_DB.paymentMethods.western;
  if (!DB.tgVerifyPackages) DB.tgVerifyPackages = DEFAULT_DB.tgVerifyPackages;
  if (!DB.gamePackages) DB.gamePackages = DEFAULT_DB.gamePackages;
  if (!DB.rechargePkgs) DB.rechargePkgs = DEFAULT_DB.rechargePkgs;
  if (!DB.customServices) DB.customServices = [];
  
  DB.rechargePkgs = DB.rechargePkgs.map(pkg => ({
    ...pkg,
    quantity: pkg.quantity || 0,
    price: pkg.price || 0
  }));
}
// ============================================================
// QR LOADING INDICATORS
// ============================================================
function showQrLoading(show) {
    const qrBox = document.getElementById('afQrBox');
    const imgEl = document.getElementById('afQrImg');
    const fallbackEl = document.getElementById('afQrFallback');
    
    if (qrBox) {
        if (show) {
            qrBox.classList.add('loading');
            if (imgEl) imgEl.style.display = 'none';
            if (fallbackEl) fallbackEl.style.display = 'none';
        } else {
            qrBox.classList.remove('loading');
        }
    }
}

function setImageLoading(imgElement, isLoading) {
    if (!imgElement) return;
    if (isLoading) {
        imgElement.classList.add('loading');
        imgElement.classList.remove('loaded');
    } else {
        imgElement.classList.remove('loading');
        imgElement.classList.add('loaded');
    }
}
// ============================================================
// SESSION & AUTH
// ============================================================
let currentUser = null;

function saveSession(user) {
  try { localStorage.setItem('zoodSession_v2', JSON.stringify({ id: user.id, email: user.email })); } catch (e) { }
}

function loadSession() {
  try {
    const s = localStorage.getItem('zoodSession_v2');
    if (!s) return;
    const { id } = JSON.parse(s);
    const user = DB.users.find(u => u.id === id);
    if (user) currentUser = user;
  } catch (e) { }
}

function clearSession() {
  try { localStorage.removeItem('zoodSession_v2'); } catch (e) { }
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');
  if (!email || !pass) { errEl.style.display = 'block'; errEl.textContent = 'يرجى ملء جميع الحقول'; return; }
  
  if (useSupabase && supabase) {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('pass', pass);
    if (error || !data || data.length === 0) {
      errEl.style.display = 'block';
      errEl.textContent = 'البريد أو كلمة المرور غير صحيحة';
      return;
    }
    currentUser = data[0];
  } else {
    const user = DB.users.find(u => u.email.toLowerCase() === email && u.pass === pass);
    if (!user) { errEl.style.display = 'block'; errEl.textContent = 'البريد أو كلمة المرور غير صحيحة'; return; }
    currentUser = user;
  }
  
  errEl.style.display = 'none';
  saveSession(currentUser);
  updateNav();
  showToast('مرحباً ' + currentUser.name + ' 👋', 'success');
  if (currentUser.role === 'admin') showPage('dashboard');
  else showPage('home');
}

async function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;
  const errEl = document.getElementById('regErr');
  if (!name || !email || !pass || pass.length < 6) { showToast('يرجى ملء جميع الحقول (6 أحرف للمرور على الأقل)', 'error'); return; }
  
  if (useSupabase && supabase) {
    const { data: existing } = await supabase.from('users').select('id').eq('email', email);
    if (existing && existing.length > 0) { errEl.style.display = 'block'; errEl.textContent = 'هذا البريد مسجل مسبقاً'; return; }
    errEl.style.display = 'none';
    const newUser = { id: Date.now(), name, email, pass, role: 'user', balance: 0, created_at: new Date().toISOString() };
    const { error } = await supabase.from('users').insert(newUser);
    if (error) { showToast('حدث خطأ أثناء التسجيل', 'error'); return; }
    currentUser = newUser;
  } else {
    if (DB.users.find(u => u.email.toLowerCase() === email)) { errEl.style.display = 'block'; errEl.textContent = 'هذا البريد مسجل مسبقاً'; return; }
    errEl.style.display = 'none';
    currentUser = { id: Date.now(), name, email, pass, role: 'user', balance: 0, createdAt: new Date().toLocaleDateString('ar') };
    DB.users.push(currentUser);
    saveDB();
  }
  
  saveSession(currentUser);
  updateNav();
  showToast('تم إنشاء حسابك بنجاح 🎉', 'success');
  showPage('home');
}

function logout() {
  currentUser = null;
  clearSession();
  updateNav();
  showPage('home');
  showToast('تم تسجيل الخروج بنجاح', 'success');
}

function requireLogin(page) {
  if (!currentUser) { showPage('login'); return; }
  showPage(page);
}

function updateNav() {
  const ok = !!currentUser, admin = ok && currentUser.role === 'admin';
  const authBtns = document.getElementById('navAuthButtons');
  const userBtns = document.getElementById('navUserButtons');
  if (authBtns) authBtns.style.display = ok ? 'none' : 'flex';
  if (userBtns) userBtns.style.display = ok ? 'flex' : 'none';
  const wbadge = document.getElementById('walletBadge');
  if (wbadge) wbadge.style.display = ok ? 'flex' : 'none';
  const dashBtn = document.getElementById('dashNavBtn');
  if (dashBtn) dashBtn.style.display = admin ? '' : 'none';
  const heroReg = document.getElementById('heroRegBtn');
  const heroServ = document.getElementById('heroServBtn');
  if (heroReg) heroReg.style.display = ok ? 'none' : '';
  if (heroServ) heroServ.style.display = ok ? '' : 'none';
  const nameEl = document.getElementById('navUserName');
  if (nameEl && ok) nameEl.textContent = '👤 ' + currentUser.name;
  if (ok) {
    const wb = document.getElementById('walletBalNav');
    if (wb) wb.textContent = safeToFixed(currentUser.balance);
    const wa = document.getElementById('walletAmt');
    if (wa) wa.textContent = safeToFixed(currentUser.balance);
  }
  const waFloat = document.getElementById('waFloat');
  if (waFloat) waFloat.style.display = ok ? 'flex' : 'none';
  
  const mmWalletRow = document.getElementById('mmWallet');
  const mmBalEl = document.getElementById('mmBalance');
  const mmNameEl = document.getElementById('mmUserNameDisplay');
  const mmAuthSec = document.getElementById('mmAuthSection');
  const mmUserSec = document.getElementById('mmUserSection');
  const mmDashBtn2 = document.getElementById('mmDashBtn');
  if (mmWalletRow) mmWalletRow.style.display = ok ? '' : 'none';
  if (mmBalEl && ok) mmBalEl.textContent = safeToFixed(currentUser.balance);
  if (mmNameEl && ok) mmNameEl.textContent = currentUser.name;
  if (mmAuthSec) mmAuthSec.style.display = ok ? 'none' : '';
  if (mmUserSec) mmUserSec.style.display = ok ? '' : 'none';
  if (mmDashBtn2) mmDashBtn2.style.display = admin ? '' : 'none';
}
// ============================================================
// PAGE ROUTING
// ============================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (name === 'numbers') renderNumbersByType('phone');
  if (name === 'whatsapp') renderNumbersByType('whatsapp');
  if (name === 'telegram-nums') renderNumbersByType('telegram');
  if (name === 'wallet') renderWallet();
  if (name === 'social') renderSocialPage();
  if (name === 'telegram-verify') renderTgVerify();
  if (name === 'games') renderGames();
  if (name === 'dashboard') renderDashboard();
  if (name === 'recharge') resetRecharge();
}

// ============================================================
// RENDER FUNCTIONS
// ============================================================
const countryFlags = { سوريا: '🇸🇾', السعودية: '🇸🇦', الإمارات: '🇦🇪', تركيا: '🇹🇷', مصر: '🇪🇬', العراق: '🇮🇶', روسيا: '🇷🇺', عمان: '🇴🇲', الكويت: '🇰🇼', قطر: '🇶🇦', البحرين: '🇧🇭', الأردن: '🇯🇴', المغرب: '🇲🇦', الجزائر: '🇩🇿', تونس: '🇹🇳' };
const socialEmojis = { Instagram: '📸', TikTok: '🎵', Facebook: '👍', YouTube: '▶️', Twitter: '🐦', Snapchat: '👻' };
const socialColors = { Instagram: '#E1306C', TikTok: '#69C9D0', Facebook: '#1877F2', YouTube: '#FF0000', Twitter: '#1DA1F2', Snapchat: '#FFFC00' };

function renderNumbersByType(type) {
  let gridId, countryFilterId;
  if (type === 'phone') { gridId = 'numbersGrid'; countryFilterId = 'numCountryF'; }
  else if (type === 'whatsapp') { gridId = 'waGrid'; countryFilterId = 'waCountryF'; }
  else { gridId = 'tgGrid'; countryFilterId = 'tgCountryF'; }
  const cf = document.getElementById(countryFilterId)?.value || '';
  const ofEl = document.getElementById('numOpF');
  const of2 = ofEl && type === 'phone' ? ofEl.value : '';
  let nums = DB.numbers.filter(n => n.type === type && (!cf || n.country === cf) && (!of2 || n.operator === of2));
  const grid = document.getElementById(gridId);
  if (!grid) return;
  if (!nums.length) { grid.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text3);grid-column:1/-1">لا توجد أرقام متاحة</div>'; return; }
  const icons = { phone: '📱', whatsapp: '💬', telegram: '✈️' };
  grid.innerHTML = nums.map(n => `
    <div class="product-card">
      <div class="flag-badge">${countryFlags[n.country] || '🌍'} ${n.country || ''}</div>
      <div class="pc-header">
        <div><div class="pc-name">${icons[n.type]} ${n.operator || ''}</div></div>
        <span class="pt ${n.status === 'available' ? 'pt-avail' : 'pt-sold'}">${n.status === 'available' ? '✅ متاح' : '❌ مباع'}</span>
      </div>
      <div class="pc-num" style="background:var(--dark4);color:var(--text3);font-style:italic">🔒 الرقم متاح بعد الشراء</div>
      <div class="pc-price">$${safeToFixed(n.price)} <span>/ رقم واحد</span></div>
      <button class="buy-btn" ${n.status !== 'available' ? 'disabled' : ''} onclick="openBuyNum(${n.id})">${n.status === 'available' ? '📞 طلب الشراء عبر واتساب' : 'تم البيع'}</button>
    </div>`).join('');
}

function renderSocialPage() {
  const el = document.getElementById('socialGrid');
  if (!el) return;
  const platforms = [...new Set(DB.socialPackages.map(p => p.platform))];
  el.innerHTML = platforms.map(platform => {
    const pkgs = DB.socialPackages.filter(p => p.platform === platform);
    return `<div class="soc-card">
      <div class="soc-hd">
        <div class="soc-logo" style="background:${socialColors[platform] || '#444'}22;color:${socialColors[platform] || '#fff'}">${socialEmojis[platform] || '📱'}</div>
        <div><div class="soc-plat">${platform}</div><div class="soc-type">${pkgs.map(p => p.type).join(' · ')}</div></div>
      </div>
      <div class="pkg-rows">
        ${pkgs.map(pkg => `
        <div class="pkg-row" onclick="openBuyDirect('${safeFormatNumber(pkg.qty)} ${pkg.type} ${platform}',${safeToFixed(pkg.price)},null,'social',${pkg.id})">
          <div class="pkg-qty">🔢 ${safeFormatNumber(pkg.qty)} ${pkg.type}</div>
          <div class="pkg-pr">$${safeToFixed(pkg.price)}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderTgVerify() {
  const el = document.getElementById('tgVerifyGrid');
  if (!el) return;
  el.innerHTML = DB.tgVerifyPackages.map(p => `
    <div class="soc-card">
      <div class="soc-hd">
        <div class="soc-logo" style="background:rgba(77,159,255,0.12);color:#4D9FFF">${p.type && p.type.includes('بادج') ? '🏅' : '✅'}</div>
        <div><div class="soc-plat">${p.type || 'خدمة'}</div><div class="soc-type">توثيق تلغرام</div></div>
      </div>
      <div style="font-size:0.85rem;color:var(--text2);margin-bottom:16px;line-height:1.6">${p.desc || ''}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:1.5rem;font-weight:800;color:var(--gold)">$${safeToFixed(p.price)}</div>
        <button class="buy-btn" style="width:auto;padding:11px 22px" onclick="openBuyDirect('${p.type || 'خدمة'} تلغرام',${p.price || 0},null,'tgverify',${p.id})">طلب الخدمة</button>
      </div>
    </div>`).join('');
}

function renderGames() {
  const el = document.getElementById('gamesGrid');
  if (!el) return;
  const games = [...new Set(DB.gamePackages.map(p => p.game))];
  el.innerHTML = games.map(game => {
    const pkgs = DB.gamePackages.filter(p => p.game === game);
    const icon = pkgs[0]?.icon || '🎮';
    return `<div class="game-card">
      <div class="game-icon">${icon}</div>
      <div class="game-name">${game}</div>
      <div class="game-pkgs">
        ${pkgs.map(p => `
        <div class="game-pkg-row" onclick="openBuyDirect('${p.package || ''} - ${game}',${p.price || 0},null,'game',${p.id})">
          <div class="gp-name">${p.package || ''}</div>
          <div class="gp-price">$${safeToFixed(p.price)}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderWallet() {
  if (!currentUser) return;
  const fresh = DB.users.find(u => u.id === currentUser.id);
  if (fresh) currentUser = fresh;
  const walletAmtEl = document.getElementById('walletAmt');
  if (walletAmtEl) walletAmtEl.textContent = safeToFixed(currentUser.balance);
  const wb = document.getElementById('walletBalNav');
  if (wb) wb.textContent = safeToFixed(currentUser.balance);
  const mmBal = document.getElementById('mmBalance');
  if (mmBal) mmBal.textContent = safeToFixed(currentUser.balance);
  
  const txs = DB.transactions.filter(t => t.user_id === currentUser.id);
  const totalIn = txs.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = txs.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
  const elIn = document.getElementById('wltTotalIn');
  const elOut = document.getElementById('wltTotalOut');
  const elCnt = document.getElementById('wltTxCount');
  if (elIn) elIn.textContent = '$' + safeToFixed(totalIn);
  if (elOut) elOut.textContent = '$' + safeToFixed(totalOut);
  if (elCnt) elCnt.textContent = txs.length;
  renderTxList('all');
}

let txFilter = 'all';
function filterTx(type, el) {
  txFilter = type;
  document.querySelectorAll('#txFilterBtns .tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderTxList(type);
}

function renderTxList(type) {
  if (!currentUser) return;
  let txs = DB.transactions.filter(t => t.user_id === currentUser.id);
  if (type !== 'all') txs = txs.filter(t => t.type === type);
  txs = [...txs].reverse();
  const list = document.getElementById('txList');
  if (!list) return;
  if (!txs.length) {
    list.innerHTML = `<div class="wlt-empty"><div class="wlt-empty-icon">📋</div><div>لا توجد معاملات بعد</div></div>`;
    return;
  }
  list.innerHTML = txs.map(t => `
    <div class="tx-item">
      <div class="tx-left">
        <div class="tx-ico ${t.type}">${t.type === 'credit' ? '💚' : '🔴'}</div>
        <div><div class="tx-desc">${t.description || ''}</div><div class="tx-date">${t.date || t.transaction_date || new Date().toLocaleString('ar')}</div></div>
      </div>
      <div class="tx-amt ${t.type}">${t.type === 'credit' ? '+' : '-'}$${safeToFixed(t.amount)}</div>
    </div>`).join('');
}
// ============================================================
// ADD FUNDS WITH QR FROM DATABASE
// ============================================================
let currentAddFundsAmount = 0;

function setAmt(val) {
  document.getElementById('addFundsAmt').value = val;
  document.querySelectorAll('.af-preset').forEach(b => b.classList.toggle('af-active', parseFloat(b.textContent.replace('$', '')) === val));
}

function afUpdateProgress(step) {
  [1, 2, 3].forEach(s => {
    const dot = document.getElementById('afDot' + s);
    const progStep = document.getElementById('afProgStep' + s);
    const line = document.getElementById('afLine' + s);
    if (!dot || !progStep) return;
    if (s < step) { 
      dot.className = 'af-prog-dot done-dot'; 
      dot.textContent = '✓'; 
      progStep.className = 'af-prog-step done'; 
    }
    else if (s === step) { 
      dot.className = 'af-prog-dot active-dot'; 
      dot.textContent = s; 
      progStep.className = 'af-prog-step active'; 
    }
    else { 
      dot.className = 'af-prog-dot'; 
      dot.textContent = s; 
      progStep.className = 'af-prog-step'; 
    }
    if (line) line.className = 'af-prog-line ' + (s < step ? 'done-line' : '');
  });
}

function afGoStep1() {
  document.getElementById('afStep1').style.display = 'block';
  document.getElementById('afStep2').style.display = 'none';
  document.getElementById('afStep3').style.display = 'none';
  afUpdateProgress(1);
}

function afGoStep2() {
  const amt = parseFloat(document.getElementById('addFundsAmt').value);
  if (!amt || amt < 1) {
    showToast('أدخل مبلغاً صحيحاً (1$ على الأقل)', 'error');
    return;
  }
  currentAddFundsAmount = amt;
  
  const pm = DB.paymentMethods.shamcash || { 
    walletAddress: 'c8a4d105019df664d62048e38d986', 
    ownerName: 'عبدالحميد محمد الحسين', 
    qr: '', 
    phoneNumber: '0949277889',
    active: true 
  };
  
  document.getElementById('afAmtDisplay').textContent = '$' + safeToFixed(amt);
  const walletAddressElement = document.getElementById('afShamNum');
  if (walletAddressElement) walletAddressElement.textContent = pm.walletAddress || pm.num || 'c8a4d105019df664d62048e38d986';
  const ownerNameElement = document.getElementById('afShamName');
  if (ownerNameElement) ownerNameElement.textContent = pm.ownerName || 'عبدالحميد محمد الحسين';
  const shamAmtElement = document.getElementById('afShamAmt');
  if (shamAmtElement) shamAmtElement.textContent = '$' + safeToFixed(amt) + ' USD';
  
  const imgEl = document.getElementById('afQrImg');
  const fallbackEl = document.getElementById('afQrFallback');
  const qrUrl = pm.qr || '';
  
  showQrLoading(true);
  
  if (imgEl && fallbackEl) {
    if (qrUrl && qrUrl !== '' && (qrUrl.startsWith('http') || qrUrl.startsWith('https'))) {
      imgEl.style.display = 'block';
      imgEl.style.maxWidth = '100%';
      imgEl.style.height = 'auto';
      setImageLoading(imgEl, true);
      imgEl.src = qrUrl + '?t=' + Date.now();
      imgEl.onload = function() {
        setImageLoading(imgEl, false);
        showQrLoading(false);
        fallbackEl.style.display = 'none';
      };
      imgEl.onerror = function() {
        setImageLoading(imgEl, false);
        showQrLoading(false);
        imgEl.style.display = 'none';
        fallbackEl.style.display = 'block';
        fallbackEl.innerHTML = `<div style="font-size:2rem;margin-bottom:12px">💳</div><div style="font-weight:bold;margin-bottom:8px">عنوان محفظة شام كاش:</div><div style="font-size:1rem;font-weight:bold;color:var(--gold);margin:10px 0;direction:ltr;background:var(--dark4);padding:10px;border-radius:10px;word-break:break-all">${pm.walletAddress || pm.num}</div><div>👤 اسم الحساب: ${pm.ownerName}</div><div>💵 المبلغ: $${safeToFixed(amt)}</div><button class="copy-btn" onclick="copyText('${pm.walletAddress || pm.num}')" style="margin-top:15px;padding:8px 16px">📋 نسخ العنوان</button>${pm.phoneNumber ? `<div style="margin-top:10px;font-size:0.8rem;color:var(--text3)">📞 رقم الهاتف: ${pm.phoneNumber}</div>` : ''}`;
      };
    } else {
      showQrLoading(false);
      imgEl.style.display = 'none';
      fallbackEl.style.display = 'block';
      fallbackEl.innerHTML = `<div style="font-size:2rem;margin-bottom:12px">💳</div><div style="font-weight:bold;margin-bottom:8px">عنوان محفظة شام كاش:</div><div style="font-size:1rem;font-weight:bold;color:var(--gold);margin:10px 0;direction:ltr;background:var(--dark4);padding:10px;border-radius:10px;word-break:break-all">${pm.walletAddress || pm.num}</div><div>👤 اسم الحساب: ${pm.ownerName}</div><div>💵 المبلغ: $${safeToFixed(amt)}</div><button class="copy-btn" onclick="copyText('${pm.walletAddress || pm.num}')" style="margin-top:15px;padding:8px 16px">📋 نسخ العنوان</button>${pm.phoneNumber ? `<div style="margin-top:10px;font-size:0.8rem;color:var(--text3)">📞 رقم الهاتف: ${pm.phoneNumber}</div>` : ''}`;
    }
  }
  
  const step1 = document.getElementById('afStep1');
  const step2 = document.getElementById('afStep2');
  const step3 = document.getElementById('afStep3');
  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';
  if (step3) step3.style.display = 'none';
  afUpdateProgress(2);
}

function afGoStep3() {
  const amt = currentAddFundsAmount;
  const user = currentUser;
  const msg = 'مرحباً زود 👋\nأريد إضافة رصيد $' + safeToFixed(amt) + '\nالحساب: ' + user.email + '\nالاسم: ' + user.name;
  const waLink = document.getElementById('afWaLink');
  if (waLink) waLink.href = 'https://wa.me/963949277889?text=' + encodeURIComponent(msg);
  
  const step1 = document.getElementById('afStep1');
  const step2 = document.getElementById('afStep2');
  const step3 = document.getElementById('afStep3');
  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'none';
  if (step3) step3.style.display = 'block';
  afUpdateProgress(3);
}

function openAddFunds() {
  if (!currentUser) { showPage('login'); return; }
  const amtInput = document.getElementById('addFundsAmt');
  if (amtInput) amtInput.value = '';
  document.querySelectorAll('.af-preset').forEach(b => b.classList.remove('af-active'));
  const txProof = document.getElementById('txProof');
  if (txProof) txProof.value = '';
  afGoStep1();
  openModal('addFundsModal');
}

async function confirmAddFundsRequest() {
  const amt = currentAddFundsAmount;
  const proof = document.getElementById('txProof')?.value.trim() || '';
  const order = {
    user: currentUser.name,
    user_id: currentUser.id,
    type: 'طلب شحن محفظة',
    detail: '$' + safeToFixed(amt) + (proof ? ' — إيصال: ' + proof : ''),
    amount: 0,
    requested_amt: amt,
    status: 'pending',
    order_time: new Date().toLocaleString('ar')
  };
  
  if (useSupabase && supabase) {
    await supabase.from('orders').insert(order);
  } else {
    DB.orders.push({ ...order, id: Date.now() });
    saveDB();
  }
  
  closeModal('addFundsModal');
  showToast('تم إرسال الطلب! تواصل مع الإدارة على واتساب ✅', 'success');
}
// ============================================================
// PURCHASE CONFIRMATION WITH NOTES
// ============================================================
let pendingOrderData = null;

function showPurchaseConfirmation(orderData) {
    pendingOrderData = orderData;
    
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal-ov';
    confirmModal.id = 'purchaseConfirmModal';
    confirmModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    confirmModal.innerHTML = `
        <div class="modal-box" style="max-width:500px;">
            <div style="text-align:center;font-size:3rem;margin-bottom:15px">🛍️</div>
            <div class="modal-title" style="text-align:center;margin-bottom:10px">تأكيد الطلب</div>
            <div class="modal-sub" style="text-align:center;margin-bottom:20px">يرجى مراجعة تفاصيل طلبك</div>
            <div style="background:var(--dark3);border-radius:12px;padding:20px;margin-bottom:20px">
                <div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="color:var(--text2)">الخدمة:</span><span style="font-weight:600">${orderData.type}</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="color:var(--text2)">التفاصيل:</span><span style="font-weight:600">${orderData.detail}</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="color:var(--text2)">السعر:</span><span style="color:var(--gold);font-weight:700">$${orderData.price.toFixed(2)}</span></div>
                <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">رصيدك الحالي:</span><span style="color:var(--green);font-weight:700">$${safeToFixed(currentUser?.balance)}</span></div>
            </div>
            <div class="fg"><label class="fl">📝 ملاحظاتك (اختياري)</label><textarea id="orderNotes" class="fi" rows="3" placeholder="أدخل أي معلومات إضافية... مثال: رابط القناة، اسم المستخدم، رقم الحساب..." style="resize:vertical"></textarea></div>
            <div style="background:rgba(245,200,66,0.1);border-radius:10px;padding:12px;margin:20px 0;font-size:0.85rem;color:var(--text2);text-align:center">⚠️ سيتم إرسال طلبك إلى فريق الدعم وسيتم التواصل معك عبر واتساب</div>
            <div style="display:flex;gap:10px;justify-content:center"><button class="m-cancel" onclick="closePurchaseConfirm()" style="padding:12px 24px">إلغاء</button><button class="m-confirm" onclick="confirmPurchase()" style="padding:12px 24px">تأكيد الطلب</button></div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    setTimeout(() => confirmModal.classList.add('open'), 10);
}

function closePurchaseConfirm() {
    const modal = document.getElementById('purchaseConfirmModal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 300);
    }
    pendingOrderData = null;
}

function confirmPurchase() {
    if (pendingOrderData) {
        const userNotes = document.getElementById('orderNotes')?.value.trim() || '';
        pendingOrderData.userNotes = userNotes;
        closePurchaseConfirm();
        sendWhatsAppOrderRequest(pendingOrderData);
    }
}

function sendWhatsAppOrderRequest(orderData) {
    if (!currentUser) {
        showPage('login');
        return;
    }
    
    let message = `🛍️ *طلب شراء جديد من زود*\n\n`;
    message += `👤 *اسم المستخدم:* ${currentUser.name}\n`;
    message += `📧 *البريد الإلكتروني:* ${currentUser.email}\n`;
    message += `🆔 *رقم المستخدم:* ${currentUser.id}\n`;
    message += `📦 *نوع الخدمة:* ${orderData.type}\n`;
    message += `📝 *تفاصيل الخدمة:* ${orderData.detail}\n`;
    message += `💰 *السعر:* $${orderData.price.toFixed(2)}\n`;
    if (orderData.userNotes) message += `📌 *ملاحظات العميل:* ${orderData.userNotes}\n`;
    message += `📅 *تاريخ الطلب:* ${new Date().toLocaleString('ar')}\n\n`;
    message += `✅ *يرجى تأكيد الطلب وتزويد العميل بالبيانات المطلوبة*`;
    
    const encodedMessage = encodeURIComponent(message);
    const adminWhatsApp = '963949277889';
    window.open(`https://wa.me/${adminWhatsApp}?text=${encodedMessage}`, '_blank');
    saveOrderToDatabase(orderData);
    showToast('✅ تم إرسال طلبك! سيتم التواصل معك عبر واتساب خلال دقائق', 'success');
}

async function saveOrderToDatabase(orderData) {
    const order = {
        id: Date.now(),
        user: currentUser.name,
        user_id: currentUser.id,
        type: orderData.type,
        detail: orderData.detail,
        user_notes: orderData.userNotes || '',
        amount: orderData.price,
        requested_amt: orderData.price,
        status: 'pending_approval',
        order_time: new Date().toLocaleString('ar'),
        whatsapp_sent: true
    };
    
    if (useSupabase && supabase) {
        await supabase.from('orders').insert(order);
    } else {
        DB.orders.push(order);
        saveDB();
    }
}

function openBuyNum(id) {
    if (!currentUser) { showPage('login'); return; }
    const n = DB.numbers.find(x => x.id === id);
    if (!n || n.status !== 'available') { showToast('هذا الرقم غير متاح', 'error'); return; }
    showPurchaseConfirmation({
        type: 'رقم ' + (n.type === 'phone' ? 'هاتفي' : n.type === 'whatsapp' ? 'واتساب' : 'تلغرام'),
        detail: n.operator ? n.operator + ' - ' + n.country : n.country,
        price: n.price,
        phone: n.phone,
        status: 'pending'
    });
}

function openBuyDirect(desc, price, cb, category, pkgId) {
    if (!currentUser) { showPage('login'); return; }
    showPurchaseConfirmation({
        type: category === 'social' ? 'باقة سوشيال ميديا' : category === 'tgverify' ? 'توثيق تلغرام' : category === 'game' ? 'شحن لعبة' : 'خدمة',
        detail: desc,
        price: price,
        category: category,
        pkgId: pkgId
    });
}
// ============================================================
// RECHARGE
// ============================================================
let rcState = {};
function resetRecharge() { rcState = {}; }
function switchRcTab(tab, el) {
  document.querySelectorAll('#rcTabs .tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#page-recharge .tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('rc-' + tab).classList.add('active');
}

function selectRcOp(op, region) {
    rcState[region] = { op, pkg: null };
    const pkgs = DB.rechargePkgs.filter(p => p.operator === op);
    const cap = region.charAt(0).toUpperCase() + region.slice(1);
    const g = document.getElementById('rcGrid' + cap);
    if (g) {
        g.innerHTML = pkgs.map(p => {
            const qtyValue = p.quantity || 0;
            return `<div class="rc-card" onclick="selectRcPkg('${region}',${p.id},this)"><div class="rc-icon">⚡</div><div class="rc-amt">${qtyValue.toLocaleString()}</div><div class="rc-lbl">وحدة</div><div style="margin-top:7px;font-weight:700;color:var(--gold)">$${(p.price || 0).toFixed(2)}</div></div>`;
        }).join('');
    }
    const d = document.getElementById('rcPkgs' + cap);
    if (d) d.style.display = 'block';
}

function selectRcPkg(region, pkgId, el) {
  const pkg = DB.rechargePkgs.find(p => p.id === pkgId);
  if (!rcState[region]) rcState[region] = {};
  rcState[region].pkg = pkg;
  const cap = region.charAt(0).toUpperCase() + region.slice(1);
  document.querySelectorAll('#rcGrid' + cap + ' .rc-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}

function doRecharge(region) {
  const st = rcState[region];
  if (!st || !st.op || !st.pkg) { showToast('اختر الشبكة والفئة أولاً', 'error'); return; }
  const cap = region.charAt(0).toUpperCase() + region.slice(1);
  const num = document.getElementById('rcNum' + cap)?.value.trim();
  if (!num) { showToast('أدخل رقم الهاتف', 'error'); return; }
  const qtyValue = st.pkg.quantity || 0;
  openBuyDirect('شحن ' + qtyValue.toLocaleString() + ' وحدة - ' + st.op + ' - ' + num, st.pkg.price);
  rcState[region] = {};
}
// ============================================================
// CUSTOM SERVICES MANAGEMENT
// ============================================================

function openAddCustomService() {
    document.getElementById('newCustomServiceName').value = '';
    document.getElementById('newCustomServiceDesc').value = '';
    document.getElementById('newCustomServiceIcon').value = '';
    document.getElementById('newCustomServiceColor').value = '';
    document.getElementById('newCustomServiceNote').value = '';
    openModal('addCustomServiceModal');
}

async function addCustomService() {
    const name = document.getElementById('newCustomServiceName').value.trim();
    const description = document.getElementById('newCustomServiceDesc').value.trim();
    const icon = document.getElementById('newCustomServiceIcon').value.trim() || '📱';
    const color = document.getElementById('newCustomServiceColor').value.trim();
    const note = document.getElementById('newCustomServiceNote').value.trim();
    
    if (!name) {
        showToast('الرجاء إدخال اسم الخدمة', 'error');
        return;
    }
    
    const newService = {
        id: Date.now(),
        name: name,
        description: description,
        icon: icon,
        color: color,
        page: 'home',
        note: note,
        is_active: true,
        display_order: (DB.customServices?.length || 0),
        created_at: new Date().toISOString()
    };
    
    if (useSupabase && supabase) {
        const { error } = await supabase.from('custom_services').insert(newService);
        if (error) {
            showToast('حدث خطأ أثناء إضافة الخدمة', 'error');
            return;
        }
    }
    
    if (!DB.customServices) DB.customServices = [];
    DB.customServices.push(newService);
    saveDB();
    
    closeModal('addCustomServiceModal');
    renderCustomServicesOnHome();
    renderCustomServicesList();
    showToast('تم إضافة الخدمة بنجاح ✅', 'success');
}

function renderCustomServicesOnHome() {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;
    
    while (servicesGrid.children.length > 8) {
        servicesGrid.removeChild(servicesGrid.lastChild);
    }
    
    if (DB.customServices) {
        DB.customServices.forEach(service => {
            const card = document.createElement('div');
            card.className = 'svc-card';
            card.onclick = () => requireLogin('home');
            card.innerHTML = `
                <div class="svc-icon" style="background:${service.color ? service.color + '22' : 'rgba(245,200,66,0.12)'};color:${service.color || 'var(--gold)'}">${service.icon}</div>
                <div class="svc-name">${service.name}</div>
                <div class="svc-desc">${service.description || 'خدمة جديدة من زود'}</div>
                ${service.note ? `<div class="svc-badge" style="background:rgba(245,200,66,0.15);margin-top:8px">📝 ${service.note}</div>` : '<div class="svc-badge">✨ جديد</div>'}
            `;
            servicesGrid.appendChild(card);
        });
    }
}

function renderCustomServicesList() {
    const container = document.getElementById('customServicesAdminList');
    if (!container) return;
    
    const services = DB.customServices || [];
    if (services.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3)">لا توجد خدمات مضافة</div>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--dark3);border-radius:10px;margin-bottom:8px">
            <div><div style="font-weight:700">${service.icon} ${service.name}</div><div style="font-size:0.75rem;color:var(--text3)">${service.description || ''}</div>${service.note ? `<div style="font-size:0.7rem;color:var(--gold)">📝 ${service.note}</div>` : ''}</div>
            <button class="del-btn" onclick="deleteCustomService(${service.id})">حذف</button>
        </div>
    `).join('');
}

async function deleteCustomService(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    
    if (useSupabase && supabase) {
        await supabase.from('custom_services').delete().eq('id', id);
    }
    
    DB.customServices = DB.customServices.filter(s => s.id !== id);
    saveDB();
    renderCustomServicesOnHome();
    renderCustomServicesList();
    showToast('تم حذف الخدمة', 'success');
}
// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const avail = DB.numbers.filter(n => n.status === 'available').length;
  const sold = DB.numbers.filter(n => n.status === 'sold').length;
  const elA = document.getElementById('ov-avail'), elS = document.getElementById('ov-sold');
  const elU = document.getElementById('ov-users'), elO = document.getElementById('ov-orders');
  const elP = document.getElementById('ov-pending'), elR = document.getElementById('ov-revenue');
  if (elA) elA.textContent = avail;
  if (elS) elS.textContent = sold;
  if (elU) elU.textContent = DB.users.filter(u => u.role !== 'admin').length;
  if (elO) elO.textContent = DB.orders.length;
  const pending = DB.orders.filter(o => o.status === 'pending').length;
  if (elP) elP.textContent = pending;
  const rev = DB.orders.filter(o => o.status === 'done').reduce((s, o) => s + (o.amount || 0), 0);
  if (elR) elR.textContent = '$' + safeToFixed(rev);
  const badge = document.getElementById('pendingBadge');
  if (badge) { badge.style.display = pending > 0 ? '' : 'none'; badge.textContent = pending; }
  
  renderDNum(); renderDWa(); renderDTg(); renderDSoc();
  renderDTgV(); renderDGames(); renderDRc(); renderDUsers(); renderDOrders(); renderDPM();
  
  const rb = document.getElementById('ovOrdersBody');
  if (rb) rb.innerHTML = [...DB.orders].reverse().slice(0, 8).map(o => `<tr><td style="font-weight:600">${o.user || ''}</td><td style="color:var(--text2);font-size:.75rem">${o.type || ''}</td><td style="color:var(--text2);font-size:.82rem">${o.detail || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(o.amount)}</td><td style="color:var(--text3);font-size:.78rem">${o.order_time || o.time || ''}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px">لا توجد طلبات</td></tr>';
}

function renderDNum() {
  const nums = DB.numbers.filter(n => n.type === 'phone');
  const el = document.getElementById('dNumCount'); if (el) el.textContent = nums.length;
  const tb = document.getElementById('dNumBody'); if (!tb) return;
  tb.innerHTML = nums.map(n => `<tr><td><div class="pc-num" style="font-size:.82rem;padding:5px 9px;margin:0">${n.phone || ''}</div></td><td>📱 هاتفي</td><td>${countryFlags[n.country] || ''} ${n.country || ''}</td><td>${n.operator || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(n.price)}</td><td><span class="pt ${n.status === 'available' ? 'pt-avail' : 'pt-sold'}">${n.status === 'available' ? 'متاح' : 'مباع'}</span></td><td><button class="del-btn" onclick="deleteNum(${n.id})">حذف</button><button class="edit-btn" onclick="toggleNumStatus(${n.id})">${n.status === 'available' ? 'تعطيل' : 'تفعيل'}</button></td></tr>`).join('');
}

function renderDWa() {
  const nums = DB.numbers.filter(n => n.type === 'whatsapp');
  const tb = document.getElementById('dWaBody'); if (!tb) return;
  tb.innerHTML = nums.map(n => `<tr><td><div class="pc-num" style="font-size:.82rem;padding:5px 9px;margin:0">${n.phone || ''}</div></td><td>${countryFlags[n.country] || ''} ${n.country || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(n.price)}</td><td><span class="pt ${n.status === 'available' ? 'pt-avail' : 'pt-sold'}">${n.status === 'available' ? 'متاح' : 'مباع'}</span></td><td><button class="del-btn" onclick="deleteNum(${n.id})">حذف</button><button class="edit-btn" onclick="toggleNumStatus(${n.id})">${n.status === 'available' ? 'تعطيل' : 'تفعيل'}</button></td></tr>`).join('');
}

function renderDTg() {
  const nums = DB.numbers.filter(n => n.type === 'telegram');
  const tb = document.getElementById('dTgBody'); if (!tb) return;
  tb.innerHTML = nums.map(n => `<tr><td><div class="pc-num" style="font-size:.82rem;padding:5px 9px;margin:0">${n.phone || ''}</div></td><td>${countryFlags[n.country] || ''} ${n.country || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(n.price)}</td><td><span class="pt ${n.status === 'available' ? 'pt-avail' : 'pt-sold'}">${n.status === 'available' ? 'متاح' : 'مباع'}</span></td><td><button class="del-btn" onclick="deleteNum(${n.id})">حذف</button><button class="edit-btn" onclick="toggleNumStatus(${n.id})">${n.status === 'available' ? 'تعطيل' : 'تفعيل'}</button></td></tr>`).join('');
}

function renderDSoc() {
  const tb = document.getElementById('dSocBody'); if (!tb) return;
  tb.innerHTML = DB.socialPackages.map(p => `<tr><td>${socialEmojis[p.platform] || '📱'} ${p.platform || ''}</td><td>${p.type || ''}</td><td style="font-weight:700">${safeFormatNumber(p.qty)}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(p.price)}</td><td><button class="del-btn" onclick="deleteSoc(${p.id})">حذف</button></td></tr>`).join('');
}

function renderDTgV() {
  const tb = document.getElementById('dTgVerifyBody'); if (!tb) return;
  tb.innerHTML = DB.tgVerifyPackages.map(p => `<tr><td style="font-weight:600">${p.type || ''}</td><td style="color:var(--text2);font-size:.82rem">${p.desc || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(p.price)}</td><td><button class="del-btn" onclick="deleteTgV(${p.id})">حذف</button></td></tr>`).join('');
}

function renderDGames() {
  const tb = document.getElementById('dGamesBody'); if (!tb) return;
  tb.innerHTML = DB.gamePackages.map(p => `<tr><td>${p.icon || '🎮'} ${p.game || ''}</td><td style="font-weight:600">${p.package || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(p.price)}</td><td><button class="del-btn" onclick="deleteGame(${p.id})">حذف</button></td></tr>`).join('');
}

function renderDRc() {
    const tb = document.getElementById('dRcBody'); 
    if (!tb) return;
    if (!DB.rechargePkgs || DB.rechargePkgs.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px">لا توجد باقات شحن</td></tr>';
        return;
    }
    tb.innerHTML = DB.rechargePkgs.map(pkg => `<tr><td style="font-weight:600">${pkg.operator || 'غير محدد'}</td><td>${countryFlags[pkg.country] || '🌍'} ${pkg.country || 'غير محدد'}</td><td>${(pkg.quantity || 0).toLocaleString()} وحدة</td><td style="color:var(--gold);font-weight:700">$${(pkg.price || 0).toFixed(2)}</td><td><button class="del-btn" onclick="deleteRcPkg(${pkg.id})">حذف</button></td></tr>`).join('');
}

function renderDUsers() {
    const tb = document.getElementById('dUsersBody');
    if (!tb) return;
    tb.innerHTML = DB.users.map(u => `<tr><td style="font-weight:600">${u.name || ''}</td><td style="color:var(--text2)">${u.email || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(u.balance)}</td><td><span class="pt ${u.role === 'admin' ? 'pt-sold' : 'pt-avail'}">${u.role === 'admin' ? 'أدمن' : 'مستخدم'}</span></td><td style="color:var(--text3)">${u.createdAt || u.created_at?.split('T')[0] || ''}</td><td style="white-space: nowrap;">${u.role !== 'admin' ? `<button class="edit-btn" onclick="quickAddBal(${u.id},'${u.name || ''}')" style="background:rgba(0,224,154,0.15);color:var(--green);margin:2px">💰 إضافة</button><button class="edit-btn" onclick="quickDeductBal(${u.id},'${u.name || ''}')" style="background:rgba(255,77,109,0.15);color:var(--red);margin:2px">💸 خصم</button>` : '—'}</td></tr>`).join('');
    
    const pending = DB.orders.filter(o => o.status === 'pending');
    const pb = document.getElementById('dPendingBody');
    if (pb) {
        if (pending.length) {
            pb.innerHTML = pending.map((o, idx) => `<tr><td style="font-weight:600">${o.user || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(o.requested_amt)}</td><td style="color:var(--text3);font-size:.8rem">${o.order_time || o.time || ''}</td><td><button class="edit-btn" onclick="approveWalletRequest(${o.id || idx})">✅ موافقة</button><button class="del-btn" onclick="rejectWalletRequest(${o.id || idx})">❌ رفض</button></td></tr>`).join('');
        } else {
            pb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px">لا توجد طلبات معلقة</td></tr>';
        }
    }
}

function renderDOrders() {
  const tb = document.getElementById('dOrdersBody'); if (!tb) return;
  tb.innerHTML = [...DB.orders].reverse().map(o => `<tr><td>${o.user || ''}</td><td><span class="pt pt-avail" style="font-size:.75rem">${o.type || ''}</span></td><td style="color:var(--text2);font-size:.82rem">${o.detail || ''}</td><td style="color:var(--gold);font-weight:700">$${safeToFixed(o.amount)}</td><td style="color:var(--text3);font-size:.78rem">${o.order_time || o.time || ''}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px">لا توجد طلبات</td></tr>';
}

function renderDPM() {
  const pm = DB.paymentMethods;
  const cards = [
    { key: 'binance', icon: '₿', name: 'Binance Pay / USDT', rows: [['عنوان المحفظة (TRC20)', pm.binance?.addr], ['UID', pm.binance?.uid]], qr: pm.binance?.qr, active: pm.binance?.active, color: '#F0B90B' },
    { key: 'shamcash', icon: '💳', name: 'شام كاش', rows: [['عنوان المحفظة', pm.shamcash?.walletAddress || pm.shamcash?.num], ['صاحب الحساب', pm.shamcash?.ownerName], ['رقم الهاتف', pm.shamcash?.phoneNumber]], qr: pm.shamcash?.qr, active: pm.shamcash?.active, color: '#00C851' },
    { key: 'western', icon: '🌐', name: 'Western Union', rows: [['الاسم', pm.western?.ownerName], ['الدولة', pm.western?.country]], active: pm.western?.active, color: '#FFDD00' },
  ];
  const el = document.getElementById('pmGrid'); 
  if (!el) return;
  el.innerHTML = cards.map(c => `<div class="pm-card ${c.active ? 'active-pm' : 'inactive-pm'}"><div class="pm-header"><div class="pm-icon" style="background:${c.color}22;font-size:1.4rem;display:flex;align-items:center;justify-content:center">${c.icon}</div><div><div class="pm-name">${c.name}</div><div class="pm-status" style="color:${c.active ? 'var(--green)' : 'var(--red)'}">${c.active ? '✅ مفعّل' : '❌ معطّل'}</div></div></div><div class="pm-details">${c.rows.map(r => r[1] ? `<div class="pm-detail-row"><span>${r[0]}</span><span style="word-break:break-all">${r[1]}</span></div>` : '').join('')}</div>${c.qr ? `<div class="pm-qr"><img src="${c.qr}" alt="QR" onerror="this.style.display='none'" style="max-width:100px;border-radius:8px;border:2px solid rgba(245,200,66,0.3)"></div>` : ''}</div>`).join('');
}

function switchDash(name, el) {
  document.querySelectorAll('.dash-sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  const target = document.getElementById('dash-' + name);
  if (target) target.classList.add('active');
  if (el) el.classList.add('active');
  renderDashboard();
}
// ============================================================
// ADMIN HELPERS
// ============================================================
async function quickAddBal(uid, name) {
  const amt = parseFloat(prompt('أدخل المبلغ لإضافته لـ ' + name + ' ($):'));
  if (!amt || amt <= 0 || isNaN(amt)) return;
  
  if (useSupabase && supabase) {
    const { data: user } = await supabase.from('users').select('balance').eq('id', uid).single();
    const newBalance = (user?.balance || 0) + amt;
    await supabase.from('users').update({ balance: newBalance }).eq('id', uid);
    await supabase.from('transactions').insert({ user_id: uid, type: 'credit', description: 'إضافة رصيد من الإدارة', amount: amt, transaction_date: new Date().toLocaleString('ar') });
  } else {
    const ui = DB.users.findIndex(u => u.id === uid);
    if (ui !== -1) {
      DB.users[ui].balance = (DB.users[ui].balance || 0) + amt;
      DB.transactions.push({ id: Date.now(), user_id: uid, type: 'credit', description: 'إضافة رصيد من الإدارة', amount: amt, date: new Date().toLocaleString('ar') });
      saveDB();
    }
  }
  await refreshAllData();
  renderDashboard();
  showToast('تم إضافة $' + safeToFixed(amt) + ' لـ ' + name + ' ✅', 'success');
}

async function quickDeductBal(uid, name) {
    const amt = parseFloat(prompt('💰 أدخل المبلغ لخصمه من رصيد ' + name + ' ($):'));
    if (!amt || amt <= 0 || isNaN(amt)) { showToast('الرجاء إدخال مبلغ صحيح', 'error'); return; }
    let currentBalance = 0;
    if (useSupabase && supabase) {
        const { data: user } = await supabase.from('users').select('balance').eq('id', uid).single();
        if (!user) { showToast('المستخدم غير موجود', 'error'); return; }
        currentBalance = user.balance || 0;
    } else {
        const userIndex = DB.users.findIndex(u => u.id === uid);
        if (userIndex === -1) { showToast('المستخدم غير موجود', 'error'); return; }
        currentBalance = DB.users[userIndex].balance || 0;
    }
    if (currentBalance < amt) { showToast(`❌ رصيد المستخدم غير كافٍ! الرصيد الحالي: $${currentBalance.toFixed(2)}`, 'error'); return; }
    if (!confirm(`⚠️ هل أنت متأكد من خصم $${amt.toFixed(2)} من رصيد ${name}؟\n\nالرصيد الحالي: $${currentBalance.toFixed(2)}\nالرصيد بعد الخصم: $${(currentBalance - amt).toFixed(2)}`)) return;
    const newBalance = currentBalance - amt;
    if (useSupabase && supabase) {
        await supabase.from('users').update({ balance: newBalance }).eq('id', uid);
        await supabase.from('transactions').insert({ user_id: uid, type: 'debit', description: `💸 خصم رصيد من الإدارة - مبلغ: $${amt.toFixed(2)}`, amount: amt, transaction_date: new Date().toLocaleString('ar') });
        await supabase.from('orders').insert({ user: name, user_id: uid, type: 'خصم رصيد (أدمن)', detail: `💸 تم خصم $${amt.toFixed(2)} من الرصيد`, amount: amt, status: 'done', order_time: new Date().toLocaleString('ar') });
    } else {
        const userIndex = DB.users.findIndex(u => u.id === uid);
        DB.users[userIndex].balance = newBalance;
        DB.transactions.push({ id: Date.now(), user_id: uid, type: 'debit', description: `💸 خصم رصيد من الإدارة - مبلغ: $${amt.toFixed(2)}`, amount: amt, date: new Date().toLocaleString('ar') });
        DB.orders.push({ id: Date.now(), user: name, user_id: uid, type: 'خصم رصيد (أدمن)', detail: `💸 تم خصم $${amt.toFixed(2)} من الرصيد`, amount: amt, status: 'done', time: new Date().toLocaleString('ar') });
        saveDB();
    }
    await refreshAllData();
    renderDashboard();
    showToast(`✅ تم خصم $${amt.toFixed(2)} من رصيد ${name}`, 'success');
}

async function approveWalletRequest(orderId) {
  const order = DB.orders.find(o => o.id === orderId);
  if (!order) return;
  const amt = order.requested_amt || 0;
  if (useSupabase && supabase) {
    await supabase.from('orders').update({ status: 'approved', amount: amt }).eq('id', orderId);
    const { data: user } = await supabase.from('users').select('balance').eq('id', order.user_id).single();
    await supabase.from('users').update({ balance: (user?.balance || 0) + amt }).eq('id', order.user_id);
    await supabase.from('transactions').insert({ user_id: order.user_id, type: 'credit', description: 'إضافة رصيد — تمت الموافقة', amount: amt, transaction_date: new Date().toLocaleString('ar') });
  } else {
    const ui = DB.users.findIndex(u => u.id === order.user_id);
    if (ui !== -1) {
      DB.users[ui].balance = (DB.users[ui].balance || 0) + amt;
      order.status = 'approved';
      order.amount = amt;
      DB.transactions.push({ id: Date.now(), user_id: order.user_id, type: 'credit', description: 'إضافة رصيد — تمت الموافقة', amount: amt, date: new Date().toLocaleString('ar') });
      saveDB();
    }
  }
  await refreshAllData();
  renderDashboard();
  showToast('تمت الموافقة وإضافة $' + safeToFixed(amt) + ' لـ ' + order.user + ' ✅', 'success');
}

function rejectWalletRequest(orderId) {
  const order = DB.orders.find(o => o.id === orderId);
  if (order) order.status = 'rejected';
  saveDB();
  renderDashboard();
  showToast('تم رفض الطلب', 'success');
}
// ============================================================
// CRUD Operations
// ============================================================
async function deleteNum(id) {
  if (useSupabase && supabase) {
    await supabase.from('numbers').delete().eq('id', id);
  } else {
    DB.numbers = DB.numbers.filter(n => n.id !== id);
    saveDB();
  }
  await refreshAllData();
  renderDashboard();
  showToast('تم حذف الرقم', 'success');
}

async function toggleNumStatus(id) {
  const i = DB.numbers.findIndex(n => n.id === id);
  if (i === -1) return;
  const newStatus = DB.numbers[i].status === 'available' ? 'sold' : 'available';
  if (useSupabase && supabase) {
    await supabase.from('numbers').update({ status: newStatus }).eq('id', id);
  } else {
    DB.numbers[i].status = newStatus;
    saveDB();
  }
  await refreshAllData();
  renderDashboard();
  showToast('تم تحديث الحالة', 'success');
}

async function deleteSoc(id) {
  if (useSupabase && supabase) {
    await supabase.from('social_packages').delete().eq('id', id);
  } else {
    DB.socialPackages = DB.socialPackages.filter(p => p.id !== id);
    saveDB();
  }
  await refreshAllData();
  renderDashboard();
  showToast('تم الحذف', 'success');
}

async function deleteTgV(id) {
  if (useSupabase && supabase) {
    await supabase.from('tg_verify_packages').delete().eq('id', id);
  } else {
    DB.tgVerifyPackages = DB.tgVerifyPackages.filter(p => p.id !== id);
    saveDB();
  }
  await refreshAllData();
  renderDashboard();
  showToast('تم الحذف', 'success');
}

async function deleteGame(id) {
  if (useSupabase && supabase) {
    await supabase.from('game_packages').delete().eq('id', id);
  } else {
    DB.gamePackages = DB.gamePackages.filter(p => p.id !== id);
    saveDB();
  }
  await refreshAllData();
  renderDashboard();
  showToast('تم الحذف', 'success');
}

async function deleteRcPkg(id) {
  if (useSupabase && supabase) {
    await supabase.from('recharge_packages').delete().eq('id', id);
  } else {
    DB.rechargePkgs = DB.rechargePkgs.filter(p => p.id !== id);
    saveDB();
  }
  await refreshAllData();
  renderDashboard();
  showToast('تم حذف الباقة', 'success');
}
// ============================================================
// Modal Open Functions
// ============================================================
function openAddNum(type) {
    document.getElementById('addNumType').value = type;
    document.getElementById('addNumTitle').textContent = type === 'whatsapp' ? '💬 إضافة رقم واتساب' : type === 'telegram' ? '✈️ إضافة رقم تلغرام' : '📱 إضافة رقم هاتفي';
    document.getElementById('newNumOpGroup').style.display = type === 'phone' ? '' : 'none';
    openModal('addNumModal');
}

async function confirmAddNum() {
    const type = document.getElementById('addNumType').value;
    const phone = document.getElementById('newNumPhone').value.trim();
    const country = document.getElementById('newNumCountry').value;
    const op = document.getElementById('newNumOp').value;
    const price = parseFloat(document.getElementById('newNumPrice').value);
    if (!phone || !price) { showToast('أدخل جميع البيانات', 'error'); return; }
    if (!country) { showToast('أدخل اسم الدولة', 'error'); return; }
    const newNum = { id: Date.now(), type, phone, country, operator: op, price, status: 'available' };
    if (useSupabase && supabase) {
        await supabase.from('numbers').insert(newNum);
    } else {
        DB.numbers.push(newNum);
        saveDB();
    }
    closeModal('addNumModal');
    document.getElementById('newNumPhone').value = '';
    document.getElementById('newNumPrice').value = '';
    document.getElementById('newNumCountry').value = '';
    await refreshAllData();
    renderDashboard();
    showToast('تم إضافة الرقم ✅', 'success');
}

function openAddSocial() { openModal('addSocialModal'); }
async function confirmAddSocial() {
  const qty = parseInt(document.getElementById('nSocQty').value);
  const price = parseFloat(document.getElementById('nSocPrice').value);
  if (!qty || !price) { showToast('أدخل الكمية والسعر', 'error'); return; }
  const p = { id: Date.now(), platform: document.getElementById('nSocPlat').value, type: document.getElementById('nSocType').value, qty, price };
  if (useSupabase && supabase) {
    await supabase.from('social_packages').insert(p);
  } else {
    DB.socialPackages.push(p);
    saveDB();
  }
  closeModal('addSocialModal');
  await refreshAllData();
  renderDashboard();
  renderSocialPage();
  document.getElementById('nSocQty').value = '';
  document.getElementById('nSocPrice').value = '';
  showToast('تمت إضافة الباقة ✅', 'success');
}

function openAddTgVerify() { openModal('addTgVerifyModal'); }
async function confirmAddTgVerify() {
  const price = parseFloat(document.getElementById('nTgVPrice').value);
  if (!price) { showToast('أدخل السعر', 'error'); return; }
  const p = { id: Date.now(), type: document.getElementById('nTgVType').value, desc: document.getElementById('nTgVDesc').value, price };
  if (useSupabase && supabase) {
    await supabase.from('tg_verify_packages').insert(p);
  } else {
    DB.tgVerifyPackages.push(p);
    saveDB();
  }
  closeModal('addTgVerifyModal');
  await refreshAllData();
  renderDashboard();
  document.getElementById('nTgVDesc').value = '';
  document.getElementById('nTgVPrice').value = '';
  showToast('تمت الإضافة ✅', 'success');
}

function openAddGame() {
  document.getElementById('nGameName').value = '';
  document.getElementById('nGameIcon').value = '🎮';
  document.getElementById('nGamePkg').value = '';
  document.getElementById('nGamePrice').value = '';
  openModal('addGameModal');
}
async function confirmAddGame() {
  const gameName = document.getElementById('nGameName').value.trim();
  const gameIcon = document.getElementById('nGameIcon').value.trim() || '🎮';
  const price = parseFloat(document.getElementById('nGamePrice').value);
  const pkg = document.getElementById('nGamePkg').value.trim();
  if (!gameName || !price || !pkg) { showToast('أدخل جميع البيانات', 'error'); return; }
  const p = { id: Date.now(), game: gameName, icon: gameIcon, package: pkg, price };
  if (useSupabase && supabase) {
    await supabase.from('game_packages').insert(p);
  } else {
    DB.gamePackages.push(p);
    saveDB();
  }
  closeModal('addGameModal');
  await refreshAllData();
  renderDashboard();
  renderGames();
  showToast('تمت الإضافة ✅', 'success');
}

function openAddRcPkg() { openModal('addRcPkgModal'); }
async function confirmAddRcPkg() {
    const quantity = parseInt(document.getElementById('nRcQty').value);
    const price = parseFloat(document.getElementById('nRcPrice').value);
    const country = document.getElementById('nRcCountry').value;
    const operator = document.getElementById('nRcOp').value.trim();
    if (!quantity || !price || !operator) { showToast('أدخل جميع البيانات', 'error'); return; }
    const newPackage = { id: Date.now(), country: country, operator: operator, quantity: quantity, price: price };
    if (useSupabase && supabase) {
        const { error } = await supabase.from('recharge_packages').insert(newPackage);
        if (error) { showToast('خطأ: ' + error.message, 'error'); return; }
    } else {
        DB.rechargePkgs.push(newPackage);
        saveDB();
    }
    closeModal('addRcPkgModal');
    await refreshAllData();
    renderDashboard();
    document.getElementById('nRcOp').value = '';
    document.getElementById('nRcQty').value = '';
    document.getElementById('nRcPrice').value = '';
    showToast('تمت إضافة الباقة بنجاح ✅', 'success');
}

function openAdminAddBal() {
  const sel = document.getElementById('adminBalUser');
  sel.innerHTML = DB.users.filter(u => u.role !== 'admin').map(u => `<option value="${u.id}">${u.name || ''} — ${u.email || ''} ($${safeToFixed(u.balance)})</option>`).join('');
  document.getElementById('adminBalAmt').value = '';
  document.getElementById('adminBalNote').value = '';
  openModal('adminAddBalModal');
}

async function confirmAdminAddBal() {
  const uid = parseInt(document.getElementById('adminBalUser').value);
  const amt = parseFloat(document.getElementById('adminBalAmt').value);
  const note = document.getElementById('adminBalNote').value.trim() || 'إضافة من الإدارة';
  if (!uid || !amt || amt <= 0) { showToast('أدخل البيانات بشكل صحيح', 'error'); return; }
  if (useSupabase && supabase) {
    const { data: user } = await supabase.from('users').select('balance, name').eq('id', uid).single();
    await supabase.from('users').update({ balance: (user?.balance || 0) + amt }).eq('id', uid);
    await supabase.from('transactions').insert({ user_id: uid, type: 'credit', description: 'إضافة رصيد من الإدارة — ' + note, amount: amt, transaction_date: new Date().toLocaleString('ar') });
    await supabase.from('orders').insert({ user: user?.name, user_id: uid, type: 'إضافة رصيد (أدمن)', detail: '$' + safeToFixed(amt) + ' — ' + note, amount: amt, status: 'done', order_time: new Date().toLocaleString('ar') });
  } else {
    const ui = DB.users.findIndex(u => u.id === uid);
    if (ui !== -1) {
      DB.users[ui].balance = (DB.users[ui].balance || 0) + amt;
      DB.transactions.push({ id: Date.now(), user_id: uid, type: 'credit', description: 'إضافة رصيد من الإدارة — ' + note, amount: amt, date: new Date().toLocaleString('ar') });
      DB.orders.push({ id: Date.now(), user: DB.users[ui].name, user_id: uid, type: 'إضافة رصيد (أدمن)', detail: '$' + safeToFixed(amt) + ' — ' + note, amount: amt, status: 'done', time: new Date().toLocaleString('ar') });
      saveDB();
    }
  }
  closeModal('adminAddBalModal');
  await refreshAllData();
  renderDashboard();
  showToast('تم إضافة $' + safeToFixed(amt) + ' للحساب ✅', 'success');
}
// ============================================================
// PAYMENT METHODS MANAGEMENT
// ============================================================
let selectedQRFile = null;

function initFileUpload() {
    const fileInput = document.getElementById('shamQrFile');
    if (fileInput) {
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);
        newFileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
                selectedQRFile = e.target.files[0];
                if (selectedQRFile.size > 2 * 1024 * 1024) {
                    showToast('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت', 'error');
                    selectedQRFile = null;
                    e.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const previewImg = document.getElementById('shamQrPreviewImg');
                    const previewDiv = document.getElementById('shamQrPreview');
                    if (previewImg && previewDiv) {
                        previewImg.src = evt.target.result;
                        previewDiv.style.display = 'block';
                    }
                    showToast('تم اختيار الصورة. اضغط "حفظ التغييرات" لرفعها وحفظها', 'success');
                };
                reader.readAsDataURL(selectedQRFile);
            }
        });
    }
}

async function uploadQRCodeAndGetURL(file) {
    if (!file) return null;
    if (!useSupabase || !supabase) {
        showToast('قاعدة البيانات غير متصلة', 'error');
        return null;
    }
    const previewDiv = document.getElementById('shamQrPreview');
    const previewImg = document.getElementById('shamQrPreviewImg');
    if (previewDiv && previewImg) {
        previewDiv.classList.add('loading');
        previewImg.style.opacity = '0.3';
    }
    showLoadingOverlay('جاري رفع الصورة...');
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `shamcash_qr_${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage.from('qr-codes').upload(fileName, file, { cacheControl: '3600', upsert: true });
        if (error) {
            console.error('Upload error:', error);
            showToast('فشل رفع الصورة: ' + error.message, 'error');
            if (previewDiv) previewDiv.classList.remove('loading');
            if (previewImg) previewImg.style.opacity = '1';
            return null;
        }
        const { data: urlData } = supabase.storage.from('qr-codes').getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;
        if (previewImg && previewDiv) {
            previewImg.src = publicUrl;
            previewImg.onload = function() { previewDiv.classList.remove('loading'); previewImg.style.opacity = '1'; };
        }
        return publicUrl;
    } catch (error) {
        console.error('Error uploading:', error);
        showToast('حدث خطأ أثناء رفع الصورة', 'error');
        return null;
    } finally {
        hideLoadingOverlay();
    }
}

async function savePaymentMethods() {
    showLoadingOverlay('جاري حفظ الإعدادات...');
    try {
        let qrUrl = document.getElementById('pm-sham-qr')?.value.trim() || '';
        if (selectedQRFile) {
            const saveBtn = document.querySelector('#editPMModal .m-confirm');
            const originalText = saveBtn?.innerHTML;
            if (saveBtn) { saveBtn.innerHTML = '<span class="loading-spinner-small"></span> جاري الرفع...'; saveBtn.disabled = true; }
            qrUrl = await uploadQRCodeAndGetURL(selectedQRFile);
            if (saveBtn) { saveBtn.innerHTML = originalText; saveBtn.disabled = false; }
            if (qrUrl) {
                const qrInput = document.getElementById('pm-sham-qr');
                if (qrInput) qrInput.value = qrUrl;
                showToast('تم رفع الصورة بنجاح ✅', 'success');
            } else { showToast('فشل رفع الصورة. سيتم حفظ الإعدادات بدون صورة', 'error'); }
            selectedQRFile = null;
            const fileInput = document.getElementById('shamQrFile');
            if (fileInput) fileInput.value = '';
        }
        const methods = [
            { method: 'binance', data: { addr: document.getElementById('pm-binance-addr')?.value.trim() || '', uid: document.getElementById('pm-binance-uid')?.value.trim() || '', qr: document.getElementById('pm-binance-qr')?.value.trim() || '' }, active: document.getElementById('pm-binance-active')?.checked || false },
            { method: 'shamcash', data: { walletAddress: document.getElementById('pm-sham-num')?.value.trim() || 'c8a4d105019df664d62048e38d986', ownerName: document.getElementById('pm-sham-name')?.value.trim() || 'عبدالحميد محمد الحسين', phoneNumber: document.getElementById('pm-sham-phone')?.value.trim() || '0949277889', qr: qrUrl }, active: document.getElementById('pm-sham-active')?.checked || true },
            { method: 'western', data: { ownerName: document.getElementById('pm-wu-name')?.value.trim() || '', country: document.getElementById('pm-wu-country')?.value.trim() || '' }, active: document.getElementById('pm-wu-active')?.checked || false }
        ];
        for (const m of methods) {
            DB.paymentMethods[m.method] = { ...m.data, active: m.active };
            if (useSupabase && supabase) { await supabase.from('payment_methods').upsert({ method: m.method, data: m.data, active: m.active }, { onConflict: 'method' }); }
        }
        saveDB();
        closeModal('editPMModal');
        await refreshAllData();
        renderDashboard();
        showToast('تم حفظ الإعدادات بنجاح ✅', 'success');
    } catch (error) { console.error('Error in savePaymentMethods:', error); showToast('حدث خطأ أثناء الحفظ', 'error'); } finally { hideLoadingOverlay(); }
}

function openEditPM() {
    const pm = DB.paymentMethods;
    document.getElementById('pm-binance-addr').value = pm.binance?.addr || '';
    document.getElementById('pm-binance-uid').value = pm.binance?.uid || '';
    document.getElementById('pm-binance-qr').value = pm.binance?.qr || '';
    document.getElementById('pm-binance-active').checked = pm.binance?.active || false;
    document.getElementById('pm-sham-num').value = pm.shamcash?.walletAddress || pm.shamcash?.num || '';
    document.getElementById('pm-sham-name').value = pm.shamcash?.ownerName || '';
    document.getElementById('pm-sham-phone').value = pm.shamcash?.phoneNumber || '';
    document.getElementById('pm-sham-qr').value = pm.shamcash?.qr || '';
    document.getElementById('pm-sham-active').checked = pm.shamcash?.active || false;
    document.getElementById('pm-wu-name').value = pm.western?.ownerName || '';
    document.getElementById('pm-wu-country').value = pm.western?.country || '';
    document.getElementById('pm-wu-active').checked = pm.western?.active || false;
    const existingQr = pm.shamcash?.qr;
    if (existingQr && existingQr !== '' && (existingQr.startsWith('http') || existingQr.startsWith('https'))) {
        const previewImg = document.getElementById('shamQrPreviewImg');
        const previewDiv = document.getElementById('shamQrPreview');
        if (previewImg && previewDiv) { previewImg.src = existingQr; previewDiv.style.display = 'block'; }
    } else { const previewDiv = document.getElementById('shamQrPreview'); if (previewDiv) previewDiv.style.display = 'none'; }
    selectedQRFile = null;
    const fileInput = document.getElementById('shamQrFile');
    if (fileInput) fileInput.value = '';
    initFileUpload();
    openModal('editPMModal');
}

function switchPMTab(key, el) {
    document.querySelectorAll('#editPMModal .tab-btn').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('#editPMModal .tab-content').forEach(content => content.classList.remove('active'));
    const target = document.getElementById('pmt-' + key);
    if (target) target.classList.add('active');
}

function handleQrUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت', 'error'); return; }
    if (type === 'shamcash') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewImg = document.getElementById('shamQrPreviewImg');
            const previewDiv = document.getElementById('shamQrPreview');
            if (previewImg && previewDiv) { previewImg.src = e.target.result; previewDiv.style.display = 'block'; }
        };
        reader.readAsDataURL(file);
        showToast('تم تحديد الصورة. اضغط "حفظ التغييرات" لرفعها وحفظها', 'success');
    }
}

function previewQrUrl(type) {
    if (type === 'shamcash') {
        const url = document.getElementById('pm-sham-qr')?.value.trim() || '';
        const previewImg = document.getElementById('shamQrPreviewImg');
        const previewDiv = document.getElementById('shamQrPreview');
        if (url && previewImg && previewDiv) {
            if (url.startsWith('http') || url.startsWith('https') || url.startsWith('data:image')) { previewImg.src = url; previewDiv.style.display = 'block'; }
            else { previewDiv.style.display = 'none'; }
        } else if (previewDiv) { previewDiv.style.display = 'none'; }
    }
}
// ============================================================
// MOBILE MENU
// ============================================================
function toggleMobileMenu() {
  const hb = document.getElementById('hamburger');
  const mm = document.getElementById('mobileMenu');
  if (!hb || !mm) return;
  const isOpen = mm.classList.contains('open');
  hb.classList.toggle('open');
  mm.classList.toggle('open');
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

function closeMM() {
  const hb = document.getElementById('hamburger');
  const mm = document.getElementById('mobileMenu');
  if (hb) hb.classList.remove('open');
  if (mm) mm.classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
  window.addEventListener('scroll', function() {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
  
  const hb = document.getElementById('hamburger');
  if (hb) hb.addEventListener('click', function(e) { e.stopPropagation(); toggleMobileMenu(); });
  
  document.addEventListener('click', function(e) {
    const mm = document.getElementById('mobileMenu');
    const hb2 = document.getElementById('hamburger');
    if (mm && hb2 && mm.classList.contains('open') && !mm.contains(e.target) && !hb2.contains(e.target)) closeMM();
  });
  
  document.querySelectorAll('.modal-ov').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));
  
  loadDB();
  ensureDBSchema();
  loadSession();
  updateNav();
  renderSocialPage();
  renderGames();
  renderTgVerify();
  
  await initSupabase();
  
  renderSocialPage();
  renderGames();
  renderTgVerify();
  renderCustomServicesOnHome();
  renderCustomServicesList();
  
  if (currentUser) {
    const fresh = DB.users.find(u => u.id === currentUser.id);
    if (fresh) currentUser = fresh;
    updateNav();
  }
});
