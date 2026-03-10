import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Firebase Configuration (從你的設定載入)
const firebaseConfig = {
  apiKey: "AIzaSyBWzwXbYbnAnI299eTNosL6HH-2Fj3PrDc",
  authDomain: "ld1003-d2f33.firebaseapp.com",
  projectId: "ld1003-d2f33",
  storageBucket: "ld1003-d2f33.firebasestorage.app",
  messagingSenderId: "636930016742",
  appId: "1:636930016742:web:eafcc3bdcd08fbfa8d4227",
  measurementId: "G-B944S5WQ1M"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 全域錯誤攔截與提示 ---
function showError(title, message, errorObj = null) {
  if (errorObj) console.error(`[系統錯誤] ${title}:`, errorObj);
  Swal.fire({
    icon: 'error',
    title: title,
    text: message || (errorObj ? errorObj.message : '發生未知的錯誤'),
    confirmButtonText: '了解並回報工程師',
    confirmButtonColor: '#ec4899',
    backdrop: `rgba(0,0,0,0.4)`
  });
}

// --- Firebase 背景同步工具 (加入錯誤回報) ---
async function dbSet(col, item) {
  if (!item || !item.id) return;
  try { 
    await setDoc(doc(db, col, item.id), item); 
  } catch (e) { 
    showError('資料儲存失敗', `無法將資料寫入 ${col}，請確認網路連線或權限設定。`, e);
    throw e;
  }
}
async function dbDelete(col, id) {
  try { 
    await deleteDoc(doc(db, col, id)); 
  } catch (e) { 
    showError('資料刪除失敗', `無法從 ${col} 移除資料，請確認您的權限。`, e);
    throw e;
  }
}
async function dbSysSet(docId, data) {
  try { 
    await setDoc(doc(db, 'system', docId), data); 
  } catch (e) { 
    showError('系統設定更新失敗', '無法保存系統設定。', e);
    throw e;
  }
}

const STORAGE_KEY = 'ld_admin_v7_state';

const ROLE_META = {
  engineer: { label: '工程師', level: 100, color: 'danger' },
  admin: { label: '管理員', level: 80, color: 'info' },
  broadcaster: { label: '主播', level: 70, color: 'pink' },
  support: { label: '客服人員', level: 40, color: 'warning' },
  partner_manager: { label: '合作店家管理', level: 35, color: 'success' },
  groupbuy_manager: { label: '開團管理', level: 35, color: 'success' },
  moderator: { label: '協作人員', level: 30, color: 'gray' },
  user: { label: '一般用戶', level: 1, color: 'gray' },
};

const PERMISSIONS = [
  { key: 'dashboard.view', label: '查看儀表板', description: '可查看全域營運總覽' },
  { key: 'accounts.read', label: '查看帳號', description: '可查看所有帳號資訊' },
  { key: 'accounts.create', label: '新增帳號', description: '可直接建立帳號與密碼' },
  { key: 'accounts.update', label: '編輯帳號', description: '可修改帳號身份、狀態' },
  { key: 'accounts.delete', label: '刪除帳號', description: '可刪除帳號資料' },
  { key: 'permissions.manage', label: '治理權限', description: '可管理功能與角色權限' },
  { key: 'exp.manage', label: '管理 EXP', description: '可發放與扣除用戶 EXP' },
  { key: 'support.view', label: '查看客服', description: '可查看客服工單' },
  { key: 'support.reply', label: '回覆客服', description: '可回覆工單與寫內部備註' },
  { key: 'promo.view', label: '查看店家', description: '可查看合作店家與專案' },
  { key: 'promo.manage', label: '管理店家', description: '可新增/編輯/刪除店家' },
  { key: 'groupbuy.view', label: '查看開團', description: '可查看開團商品' },
  { key: 'groupbuy.manage', label: '管理開團', description: '可新增/編輯/刪除開團' },
  { key: 'broadcast.manage', label: '主動訊息', description: '可發送系統全域訊息' },
  { key: 'media.manage', label: '管理素材', description: '可上傳與刪除媒體庫' },
  { key: 'billing.view', label: '查看帳務', description: '可看請款與抽成分潤' },
  { key: 'ai.view', label: '查看 AI', description: '可看用戶與 AI 對話紀錄' },
  { key: 'inbox.manage', label: '內部私訊', description: '可使用內部團隊聊天室' },
  { key: 'api.manage', label: '管理 API', description: '可控制系統 API 橋接' },
  { key: 'config.manage', label: '全域設定', description: '可修改系統底層配置' },
  { key: 'audit.view', label: '查看稽核', description: '可查看所有操作日誌' },
  { key: 'logs.delete', label: '刪除日誌', description: '可清理舊資料以釋放空間' },
];

const FEATURE_FLAGS = [
  { key: 'feature.promo', label: '合作店家模組', description: '開啟或關閉合作店家整體模組' },
  { key: 'feature.groupbuy', label: '開團模組', description: '開啟或關閉開團整體模組' },
  { key: 'feature.support_ai', label: '客服 AI 助理', description: '客服可使用 AI 草稿或摘要' },
  { key: 'feature.ai_observatory', label: 'AI 觀測站', description: '工程師可看 AI 對話與 API 紀錄' },
  { key: 'feature.broadcast', label: '主動訊息中心', description: '可由系統主動推送站內訊息' },
  { key: 'feature.exp', label: 'EXP 系統', description: '啟用 EXP 管理、批次發放與等級' },
  { key: 'feature.partner_self_only', label: '店家僅管理自己', description: '限制角色僅能改自己的內容' },
  { key: 'feature.groupbuy_self_only', label: '開團僅管理自己', description: '限制角色僅能改自己的內容' },
  { key: 'feature.login_audit', label: '顯示登入環境紀錄', description: '顯示使用者的登入 IP 與裝置' },
];

const ROLE_TEMPLATES = {
  engineer: allPermissionMap(true),
  admin: buildPermissionMap(['dashboard.view', 'accounts.read', 'accounts.create', 'accounts.update', 'exp.manage', 'support.view', 'support.reply', 'promo.view', 'promo.manage', 'groupbuy.view', 'groupbuy.manage', 'broadcast.manage', 'media.manage', 'billing.view', 'billing.manage', 'ai.view', 'inbox.manage', 'audit.view']),
  broadcaster: buildPermissionMap(['dashboard.view', 'support.view', 'support.reply', 'promo.view', 'promo.manage', 'groupbuy.view', 'groupbuy.manage', 'broadcast.manage', 'media.manage', 'inbox.manage', 'billing.view']),
  support: buildPermissionMap(['dashboard.view', 'support.view', 'support.reply', 'inbox.manage']),
  partner_manager: buildPermissionMap(['dashboard.view', 'promo.view', 'promo.manage', 'media.manage', 'inbox.manage']),
  groupbuy_manager: buildPermissionMap(['dashboard.view', 'groupbuy.view', 'groupbuy.manage', 'media.manage', 'inbox.manage']),
  moderator: buildPermissionMap(['dashboard.view', 'support.view', 'support.reply', 'media.manage', 'inbox.manage']),
  user: buildPermissionMap([]),
};

const DEFAULT_FEATURE_FLAGS = FEATURE_FLAGS.reduce((acc, item) => { acc[item.key] = true; return acc; }, {});

const state = {
  store: null,
  currentUserId: null,
  selectedTicketId: null,
  selectedThreadId: null,
  trendChart: null,
  aiMask: true,
  cuteMode: true,
};

function buildPermissionMap(keys = []) {
  const set = new Set(keys);
  return PERMISSIONS.reduce((acc, permission) => { acc[permission.key] = set.has(permission.key); return acc; }, {});
}
function allPermissionMap(value = false) {
  return PERMISSIONS.reduce((acc, permission) => { acc[permission.key] = value; return acc; }, {});
}
function uid(prefix = 'LD') { return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`; }
function nowISO() { return new Date().toISOString(); }
function formatDate(value) {
  if (!value) return '-'; const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
function formatCurrency(value) { return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function escapeHtml(input = '') { return String(input).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

// --- 空狀態 UI 產生器 ---
function generateEmptyState(icon, title, message) {
  return `
    <div class="empty-state">
      <div class="empty-icon"><i class="${icon}"></i></div>
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
  `;
}

// --- Firebase 資料載入 (完整修復防呆版) ---
async function loadFromFirebase() {
  try {
    const collectionsToFetch = ['users', 'partners', 'campaigns', 'groupBuys', 'supportTickets', 'aiLogs', 'internalThreads', 'broadcasts', 'mediaAssets', 'billingRecords', 'apiRegistry', 'expLogs', 'auditLogs'];
    const storeData = {};

    // 1. 抓取一般集合
    for (const col of collectionsToFetch) {
      try {
        const snapshot = await getDocs(collection(db, col));
        storeData[col] = snapshot.docs.map(d => d.data());
        storeData[col].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      } catch (err) {
        console.warn(`無法載入集合 ${col}，可能為空，預設為空陣列。`);
        storeData[col] = [];
      }
    }

    // 2. 抓取系統集合 (加入 Try-Catch 確保不會引發系統崩潰)
    const sysData = {};
    try {
      const sysSnapshot = await getDocs(collection(db, 'system'));
      sysSnapshot.forEach(d => sysData[d.id] = d.data());
    } catch (sysErr) {
      console.warn("無法載入集合 system，預設為空。", sysErr);
    }

    storeData.roleTemplates = sysData.roleTemplates || deepClone(ROLE_TEMPLATES);
    storeData.featureFlags = (sysData.featureFlags && Object.keys(sysData.featureFlags).length) ? sysData.featureFlags : { ...DEFAULT_FEATURE_FLAGS };
    storeData.config = (sysData.config && Object.keys(sysData.config).length) ? sysData.config : seedStore().config;

    // 初次建置管理員
    if (!storeData.users || storeData.users.length === 0) {
       const seedData = seedStore();
       await pushSeedToFirebase(seedData);
       return seedData;
    }

    return storeData;
  } catch (err) {
    showError("資料庫連線失敗", "無法從雲端取得資料，請檢查您的網路與 Firebase 規則。系統將暫時使用本地離線資料。", err);
    return loadStore();
  }
}

async function pushSeedToFirebase(seedData) {
  try {
    const batch = writeBatch(db);
    ['users', 'auditLogs'].forEach(col => {
       if (seedData[col]) {
         seedData[col].forEach(item => batch.set(doc(collection(db, col), item.id), item));
       }
    });
    batch.set(doc(db, 'system', 'roleTemplates'), seedData.roleTemplates);
    batch.set(doc(db, 'system', 'featureFlags'), seedData.featureFlags);
    batch.set(doc(db, 'system', 'config'), seedData.config);
    await batch.commit();
  } catch (error) {
    console.error("預設寫入失敗", error);
  }
}

function loadStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.users?.length) return parsed;
  }
  return seedStore();
}

function saveStore() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.store)); }

// 純淨模式，僅留高權限帳號，且帶有 tutorialCompleted: false
function seedStore() {
  const engineerId = uid('USER');
  const users = [{
    id: engineerId, authUid: 'LD-ROOT-0001', email: 'engineer@example.com', password: '123456', displayName: 'LD 管理', systemId: 'LD-ENG-001', role: 'engineer', status: 'active',
    permissions: deepClone(ROLE_TEMPLATES.engineer), exp: 0, note: '系統最高治理初始帳號', ownPartnerOnly: false, ownGroupbuyOnly: false, supportOnly: false, features: { promo: true, groupbuy: true }, createdAt: nowISO(), lastLoginAt: nowISO(), tutorialCompleted: false, createdBy: 'system',
  }];
  const auditLogs = [{ id: uid('audit'), action: 'system.seed', actor: 'system', detail: '初始化鹿🦌網站管理後台 (純淨模式)', createdAt: nowISO() }];

  return {
    users, roleTemplates: deepClone(ROLE_TEMPLATES), featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    partners: [], campaigns: [], groupBuys: [], supportTickets: [], aiLogs: [], internalThreads: [], broadcasts: [], mediaAssets: [], billingRecords: [], apiRegistry: [], expLogs: [], auditLogs,
    config: { createUserApi: '', aiApi: '', storagePath: '', aiPrompt: '請維持專業、親切、合規的回覆。', maskPii: true, saveRawPrompt: true, saveRawResponse: true, enableAudit: true, enableCute: true, retentionDays: 30, iconTheme: '專業、柔和、小鹿風格', note: '系統已進入純淨營運狀態。' }
  };
}

function currentUser() { return state.store.users.find(user => user.id === state.currentUserId) || null; }
function roleLabel(role) { return ROLE_META[role]?.label || role || '未設定'; }
function roleBadge(role) {
  const meta = ROLE_META[role] || ROLE_META.user;
  return `<span class="badge badge-${meta.color}">${escapeHtml(meta.label)}</span>`;
}

function logAudit(action, detail) {
  const actor = currentUser()?.displayName || 'system';
  const log = { id: uid('audit'), action, actor, detail, createdAt: nowISO() };
  state.store.auditLogs.unshift(log);
  if (state.store.auditLogs.length > 500) {
    const removed = state.store.auditLogs.pop();
    dbDelete('auditLogs', removed.id);
  }
  dbSet('auditLogs', log);
}

async function init() {
  // 1. 先從本地或種子建立基礎 state，不要去雲端抓私密集合
  state.store = seedStore(); 

  // 2. 綁定事件、處理 UI（此時還沒跑 loadFromFirebase）
  bindStaticEvents();
  populateRoleOptions();
  renderCreatePermissions();
  applyThemeFromStorage();
  applyCuteMode();
  
  // 如果你有部分資料是「公開」的（例如 partners），可以單獨抓，但目前建議先跳過
  console.log("系統初始化完成，等待用戶登入...");
}

function bindStaticEvents() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-refresh').addEventListener('click', () => { init(); toast('畫面已同步至最新狀態'); });
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);

  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal'))));
  document.querySelectorAll('.modal').forEach(modal => { modal.addEventListener('click', event => { if (event.target === modal) closeModal(modal); }); });

  document.getElementById('btn-open-create-account').addEventListener('click', () => openCreateAccountModal());
  document.getElementById('btn-create-account').addEventListener('click', createAccountFromModal);
  document.getElementById('btn-save-account').addEventListener('click', saveAccountModal);
  document.getElementById('btn-delete-account').addEventListener('click', deleteCurrentAccount);
  document.getElementById('account-search').addEventListener('input', renderAccounts);
  document.getElementById('account-role-filter').addEventListener('change', renderAccounts);
  document.getElementById('create-role').addEventListener('change', syncCreateRolePreset);
  document.getElementById('edit-role').addEventListener('change', syncEditRolePreset);

  document.getElementById('role-template-select').addEventListener('change', renderRolePermissionEditor);
  document.getElementById('perm-account-select').addEventListener('change', renderAccountPermissionEditor);
  document.getElementById('btn-save-role-template').addEventListener('click', saveRoleTemplate);
  document.getElementById('btn-save-permissions').addEventListener('click', saveAccountPermissionEditor);
  document.getElementById('btn-apply-role-preset').addEventListener('click', applyRolePresetToSelectedAccount);
  document.getElementById('btn-save-feature-flags').addEventListener('click', saveFeatureFlags);

  document.getElementById('btn-open-exp-grant').addEventListener('click', () => openModal('exp-modal'));
  document.getElementById('btn-submit-exp').addEventListener('click', submitExpGrant);

  document.getElementById('btn-add-partner').addEventListener('click', () => openPartnerModal());
  document.getElementById('btn-save-partner').addEventListener('click', savePartner);
  document.getElementById('btn-add-campaign').addEventListener('click', quickCreateCampaign);
  document.getElementById('btn-add-groupbuy').addEventListener('click', () => openGroupBuyModal());
  document.getElementById('btn-save-groupbuy').addEventListener('click', saveGroupBuy);

  document.getElementById('btn-send-broadcast').addEventListener('click', saveBroadcast);
  document.getElementById('btn-add-media').addEventListener('click', () => openMediaModal());
  document.getElementById('media-file').addEventListener('change', previewMediaFile);
  document.getElementById('media-url').addEventListener('input', previewMediaUrl);
  document.getElementById('btn-save-media').addEventListener('click', saveMediaAsset);

  document.getElementById('ticket-search').addEventListener('input', renderSupport);
  document.getElementById('btn-save-note').addEventListener('click', saveTicketNote);
  document.getElementById('btn-reply-ticket').addEventListener('click', replyTicket);

  document.getElementById('ai-mask-toggle').addEventListener('change', event => { state.aiMask = event.target.checked; renderAiLogs(); });
  document.getElementById('btn-purge-ai').addEventListener('click', purgeOldAiLogs);

  document.getElementById('btn-new-thread').addEventListener('click', () => openModal('thread-modal'));
  document.getElementById('btn-create-thread').addEventListener('click', createThread);
  document.getElementById('btn-send-thread-message').addEventListener('click', sendThreadMessage);
  document.getElementById('thread-search').addEventListener('input', renderInbox);
  document.getElementById('btn-delete-thread').addEventListener('click', deleteSelectedThread);

  document.getElementById('btn-add-api').addEventListener('click', () => openApiModal());
  document.getElementById('btn-save-api').addEventListener('click', saveApi);

  document.getElementById('btn-save-config').addEventListener('click', saveConfig);
  document.getElementById('btn-clear-old-audit').addEventListener('click', clearOldAudit);
}

function applyThemeFromStorage() {
  const theme = localStorage.getItem('ld_admin_theme') || 'rose';
  document.documentElement.dataset.theme = theme;
  document.getElementById('theme-icon').className = theme === 'night' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme === 'night' ? 'night' : 'rose';
  const next = current === 'night' ? 'rose' : 'night';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('ld_admin_theme', next);
  document.getElementById('theme-icon').className = next === 'night' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function applyCuteMode() { document.body.classList.toggle('cute-mode', state.cuteMode); }

// --- 登入與足跡追蹤邏輯 ---
async function handleLogin(event) {
  event.preventDefault();
  const btn = document.getElementById('btn-login-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 安全驗證中...';

  if (!state.store || !state.store.users) {
    showError('尚未就緒', '系統資料同步中，請稍候再試。');
    btn.disabled = false; btn.innerHTML = '安全登入';
    return;
  }

  const emailInput = document.getElementById('auth-email').value.trim().toLowerCase();
  const passwordInput = document.getElementById('auth-pass').value;

  const user = state.store.users.find(item => {
    const userEmail = (item.email || "").toLowerCase(); 
    return userEmail === emailInput && item.password === passwordInput;
  });

  if (!user) {
    toast('登入失敗，請確認信箱與密碼', 'error');
    btn.disabled = false; btn.innerHTML = '安全登入';
    return;
  }

  if (user.status !== 'active') {
    toast('此帳號目前已停權或尚未啟用', 'warning');
    btn.disabled = false; btn.innerHTML = '安全登入';
    return;
  }

  let ip = '未知 IP';
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) { const data = await res.json(); ip = data.ip; }
  } catch (e) { console.warn('無法獲取 IP', e); }

  user.lastLoginIp = ip;
  user.lastLoginDevice = navigator.userAgent.substring(0, 100);
  user.lastLoginAt = nowISO();
  state.currentUserId = user.id;

  try {
    await dbSet('users', user); 
  } catch (e) {
    console.error("更新足跡至 Firebase 失敗", e);
  }

  saveStore();
  logAudit('account.login', `${user.displayName} 從 ${ip} 登入系統`);
  
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-ui').classList.remove('hidden');
  
  renderAll();
  
  // 檢查是否需要顯示新手教學
  if (user.tutorialCompleted !== true) {
    await showRoleBasedTutorial(user);
  }

  btn.disabled = false; btn.innerHTML = '安全登入';
}

function logout() {
  state.currentUserId = null;
  document.getElementById('auth-pass').value = '';
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-ui').classList.add('hidden');
  toast('已安全登出', 'success');
}

// --- 新手教學系統 (Role-based Tutorial) ---
async function showRoleBasedTutorial(user) {
  const steps = [];
  
  steps.push({
    title: `歡迎回來，${escapeHtml(user.displayName)}！`,
    text: '鹿🦌系統升級完畢，這是一套專為我們團隊打造的頂級管理系統。',
    icon: 'success'
  });

  if (user.role === 'engineer' || user.role === 'admin') {
    steps.push({ title: '全域掌控', text: '您擁有本系統的最高權限。可以在「權限治理」中開關功能，在「帳號管理」控制團隊人員。', icon: 'info' });
    steps.push({ title: '安全與隱私', text: '本次升級新增了「登入環境追蹤」功能，您可以在「全域設定」開啟它來監測異常登入。', icon: 'info' }); // 這裡原本是 'shield'，改為 'info'
  } else if (user.role === 'broadcaster') {
    steps.push({ title: '專屬儀表板', text: '在這裡，您可以隨時掌握目前所有的「開團商品」與「合作店家」進度！', icon: 'success' }); // 這裡原本是 'star'，改為 'success'
    steps.push({ title: '主動發聲', text: '透過「主動訊息中心」，您可以一鍵發送站內信給所有粉絲或特定會員。', icon: 'info' }); // 這裡原本是 'bell'，改為 'info'
  } else if (user.role === 'support') {
    steps.push({ title: '客服中心', text: '您的主要工作區在「客服中心」，您可以在這裡快速回覆用戶，並加上只有內部看得到的備註。', icon: 'info' });
  } else {
    steps.push({ title: '各司其職', text: '系統已根據您的身份自動為您配置好專屬的工作區域。左側選單就是您可以使用的所有功能。', icon: 'info' });
  }

  steps.push({ title: '開始使用', text: '準備好開始使用系統了嗎？', confirmButtonText: 'Let\'s Go 🚀' });

  for (let i = 0; i < steps.length; i++) {
    await Swal.fire({
      ...steps[i],
      confirmButtonColor: '#f472b6',
      showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
      hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' }
    });
  }

  // 標記已完成並存入 DB
  user.tutorialCompleted = true;
  await dbSet('users', user);
  saveStore();
}

function hasPermission(permissionKey) { return !!currentUser()?.permissions?.[permissionKey]; }

function switchTab(tabId) {
  const requirement = {
    'tab-accounts': 'accounts.read', 'tab-permissions': 'permissions.manage', 'tab-exp': 'exp.manage',
    'tab-promo': 'promo.view', 'tab-groupbuy': 'groupbuy.view', 'tab-broadcast': 'broadcast.manage',
    'tab-media': 'media.manage', 'tab-billing': 'billing.view', 'tab-support': 'support.view',
    'tab-ai': 'ai.view', 'tab-inbox': 'inbox.manage', 'tab-api': 'api.manage',
    'tab-config': 'config.manage', 'tab-audit': 'audit.view',
  }[tabId];
  if (requirement && !hasPermission(requirement)) { toast('你沒有查看此頁面的權限', 'warning'); return; }
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active-tab', tab.id === tabId));
}

function renderAll() {
  const user = currentUser();
  if (!user) return;
  
  renderTopbar(); 
  renderSidebarForRole(); 
  renderAccounts(); 
  renderDashboard(); 
  renderPermissionControls();
  renderExp(); 
  renderPartners(); 
  renderGroupbuys(); 
  renderBroadcasts(); 
  renderMedia(); 
  renderBilling();
  renderSupport(); 
  renderAiLogs(); 
  renderInbox(); 
  renderApis(); 
  renderConfig(); 
  renderAudit();
  
  // 根據權限動態隱藏頁面內的按鈕 (防呆與乾淨UI)
  const toggleBtn = (id, perm) => {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('hidden', !hasPermission(perm));
  };
  toggleBtn('btn-open-create-account', 'accounts.create');
  toggleBtn('btn-add-partner', 'promo.manage');
  toggleBtn('btn-add-campaign', 'promo.manage');
  toggleBtn('btn-add-groupbuy', 'groupbuy.manage');
  toggleBtn('btn-add-media', 'media.manage');
  toggleBtn('btn-add-api', 'api.manage');
  toggleBtn('btn-clear-old-audit', 'logs.delete');
  toggleBtn('btn-purge-ai', 'logs.delete');

  saveStore();
}

// 修改 app.js 第 538 行附近
function renderTopbar() {
  const user = currentUser();
  if (!user) return; // 安全檢查

  document.getElementById('role-display').textContent = roleLabel(user.role);
  document.getElementById('current-admin').textContent = user.displayName || "未知用戶";
  document.getElementById('sidebar-name').textContent = user.displayName || "未知用戶";
  document.getElementById('sidebar-role').textContent = `${roleLabel(user.role)} ・ ${user.systemId || ""}`;

  const avatarEl = document.getElementById('sidebar-avatar');
  // 如果資料中有頭像網址 (假設欄位是 photoURL 或 avatar)，就抓 jpg
  if (user.photoURL) {
    avatarEl.innerHTML = `<img src="${user.photoURL}" style="width:100%; height:100%; object-fit:cover; border-radius:14px;">`;
  } else {
    // 防呆處理：如果名字不存在，給予預設值 "U"
    avatarEl.textContent = (user.displayName || "U").slice(0, 1);
  }
}

function renderSidebarForRole() {
  const map = {
    'tab-dashboard': 'dashboard.view', 'tab-accounts': 'accounts.read', 'tab-permissions': 'permissions.manage', 'tab-exp': 'exp.manage',
    'tab-promo': 'promo.view', 'tab-groupbuy': 'groupbuy.view', 'tab-broadcast': 'broadcast.manage', 'tab-media': 'media.manage',
    'tab-billing': 'billing.view', 'tab-support': 'support.view', 'tab-ai': 'ai.view', 'tab-inbox': 'inbox.manage', 'tab-api': 'api.manage', 'tab-config': 'config.manage', 'tab-audit': 'audit.view',
  };
  document.querySelectorAll('.nav-btn').forEach(btn => { const permission = map[btn.dataset.tab]; btn.classList.toggle('hidden', permission && !hasPermission(permission)); });
}

function populateRoleOptions() {
  const roleOptions = Object.keys(ROLE_META).map(key => `<option value="${key}">${ROLE_META[key].label}</option>`).join('');
  ['create-role', 'edit-role', 'role-template-select'].forEach(id => { document.getElementById(id).innerHTML = roleOptions; });
  renderAccountSelectors(); renderAccountRoleFilter();
}
function renderAccountRoleFilter() { document.getElementById('account-role-filter').innerHTML = `<option value="all">全部身份</option>${Object.entries(ROLE_META).map(([key, meta]) => `<option value="${key}">${meta.label}</option>`).join('')}`; }
function renderAccountSelectors() { document.getElementById('perm-account-select').innerHTML = state.store.users.map(user => `<option value="${user.id}">${escapeHtml(user.displayName)}｜${escapeHtml(user.systemId)}｜${escapeHtml(roleLabel(user.role))}</option>`).join(''); }

function renderCreatePermissions() {
  document.getElementById('create-permissions').innerHTML = PERMISSIONS.map(permission => `
    <div class="perm-item">
      <label><div><strong>${escapeHtml(permission.label)}</strong><small>${escapeHtml(permission.description)}</small></div><input type="checkbox" data-create-perm="${permission.key}"></label>
    </div>`).join('');
  document.getElementById('create-role').value = 'user';
  syncCreateRolePreset();
}
function syncCreateRolePreset() {
  const template = state.store.roleTemplates[document.getElementById('create-role').value] || buildPermissionMap([]);
  document.querySelectorAll('[data-create-perm]').forEach(input => { input.checked = !!template[input.dataset.createPerm]; });
}
function syncEditRolePreset() {
  const template = state.store.roleTemplates[document.getElementById('edit-role').value] || buildPermissionMap([]);
  document.querySelectorAll('[data-edit-perm]').forEach(input => { input.checked = !!template[input.dataset.editPerm]; });
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

function openCreateAccountModal() {
  ['create-email', 'create-password', 'create-name', 'create-system-id', 'create-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('create-status').value = 'active'; document.getElementById('create-role').value = 'user';
  ['create-own-partner-only', 'create-own-groupbuy-only', 'create-can-support-only'].forEach(id => document.getElementById(id).checked = false);
  ['create-feature-partner', 'create-feature-groupbuy'].forEach(id => document.getElementById(id).checked = true);
  syncCreateRolePreset(); openModal('create-account-modal');
}

async function createAccountFromModal() {
  if (!hasPermission('accounts.create')) return;
  const email = document.getElementById('create-email').value.trim().toLowerCase();
  const password = document.getElementById('create-password').value.trim();
  const displayName = document.getElementById('create-name').value.trim();
  if (!email || !password || !displayName || password.length < 6) { return toast('資料填寫不全或密碼過短', 'warning'); }
  if (state.store.users.some(u => (u.email||'').toLowerCase() === email)) { return toast('此信箱已存在', 'error'); }

  const newUser = {
    id: uid('USER'), authUid: uid('AUTH').toUpperCase(), email, password, displayName,
    systemId: document.getElementById('create-system-id').value.trim() || uid('LD-SYS'),
    role: document.getElementById('create-role').value, status: document.getElementById('create-status').value,
    permissions: gatherCheckboxPermissions('[data-create-perm]', 'createPerm'), exp: 0,
    note: document.getElementById('create-note').value.trim(),
    ownPartnerOnly: document.getElementById('create-own-partner-only').checked, ownGroupbuyOnly: document.getElementById('create-own-groupbuy-only').checked, supportOnly: document.getElementById('create-can-support-only').checked,
    features: { promo: document.getElementById('create-feature-partner').checked, groupbuy: document.getElementById('create-feature-groupbuy').checked },
    createdAt: nowISO(), lastLoginAt: '', lastLoginIp: '', lastLoginDevice: '', tutorialCompleted: false, createdBy: currentUser().id,
  };

  try {
    await dbSet('users', newUser);
    state.store.users.unshift(newUser);
    renderAccountSelectors(); renderAccounts();
    logAudit('account.create', `建立帳號 ${displayName}`);
    saveStore(); closeModal(document.getElementById('create-account-modal'));
    toast('帳號已成功建立！');
  } catch (e) {
    // 錯誤已由 dbSet 的 showError 處理
  }
}

function gatherCheckboxPermissions(selector, dataKey) {
  const map = {}; document.querySelectorAll(selector).forEach(input => { map[input.dataset[dataKey]] = input.checked; }); return map;
}

function renderAccounts() {
  if (!hasPermission('accounts.read')) return;
  const keyword = document.getElementById('account-search').value.trim().toLowerCase();
  const roleFilter = document.getElementById('account-role-filter').value;
  const showAudit = state.store.featureFlags['feature.login_audit'];

  const filtered = state.store.users.filter(u => roleFilter === 'all' || u.role === roleFilter).filter(u => !keyword || [u.authUid, u.systemId, u.email, u.displayName, u.lastLoginIp].join(' ').toLowerCase().includes(keyword));
  const tbody = document.getElementById('account-table-body');
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">${generateEmptyState('fa-solid fa-users', '無相符帳號', '系統中目前沒有符合搜尋條件的帳號。')}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(user => `
      <tr>
        <td>
          <div class="table-account">
            <div class="user-dot">${escapeHtml((user.displayName || "U").slice(0, 1))}</div>
            <div>
              <strong>${escapeHtml(user.displayName)}</strong>
              <div class="muted tiny">${escapeHtml(user.email)}</div>
              ${showAudit && user.lastLoginIp ? `<div class="muted tiny mt-4"><i class="fa-solid fa-network-wired"></i> ${escapeHtml(user.lastLoginIp)}</div>` : ''}
            </div>
          </div>
        </td>
        <td>${roleBadge(user.role)}</td>
        <td><div class="tag-list">${user.features?.promo ? '<span class="badge badge-success">合作</span>' : ''}${user.features?.groupbuy ? '<span class="badge badge-info">開團</span>' : ''}${user.supportOnly ? '<span class="badge badge-warning">客服</span>' : ''}</div></td>
        <td>${escapeHtml(user.systemId || '-')}</td><td>${user.exp ?? 0}</td><td>${statusBadge(user.status)}</td><td>${formatDate(user.lastLoginAt || user.createdAt)}</td>
        <td><div class="table-actions">
          ${hasPermission('accounts.update') ? `<button class="btn btn-ghost" data-action="edit-account" data-id="${user.id}"><i class="fa-solid fa-pen"></i></button>` : ''}
          ${hasPermission('exp.manage') ? `<button class="btn btn-ghost" data-action="quick-exp" data-id="${user.id}">+EXP</button>` : ''}
        </div></td>
      </tr>
    `).join('');
  tbody.querySelectorAll('[data-action="edit-account"]').forEach(btn => btn.addEventListener('click', () => openEditAccountModal(btn.dataset.id)));
  tbody.querySelectorAll('[data-action="quick-exp"]').forEach(btn => btn.addEventListener('click', () => quickGrantSingleExp(btn.dataset.id)));
}

function statusBadge(status) {
  const map = { active: ['badge-success', '啟用中'], pending: ['badge-warning', '待啟用'], suspended: ['badge-danger', '停權'], draft: ['badge-gray', '草稿'], review: ['badge-warning', '待審核'], live: ['badge-success', '上架中'], ended: ['badge-gray', '已結束'], open: ['badge-warning', '待處理'], closed: ['badge-gray', '已結案'], paused: ['badge-danger', '停用'], success: ['badge-success', '成功'] };
  const [klass, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${klass}">${escapeHtml(label)}</span>`;
}

function openEditAccountModal(userId) {
  const user = state.store.users.find(item => item.id === userId);
  if (!user) return;
  document.getElementById('edit-doc-id').value = user.id; document.getElementById('edit-name').value = user.displayName; document.getElementById('edit-role').value = user.role; document.getElementById('edit-uid').value = user.authUid; document.getElementById('edit-system-id').value = user.systemId || ''; document.getElementById('edit-email').value = user.email || ''; document.getElementById('edit-status').value = user.status; document.getElementById('edit-exp').value = user.exp ?? 0; document.getElementById('edit-note').value = user.note || '';
  document.getElementById('edit-own-partner-only').checked = !!user.ownPartnerOnly; document.getElementById('edit-own-groupbuy-only').checked = !!user.ownGroupbuyOnly; document.getElementById('edit-can-support-only').checked = !!user.supportOnly;
  document.getElementById('edit-permissions').innerHTML = PERMISSIONS.map(permission => `<div class="perm-item"><label><div><strong>${escapeHtml(permission.label)}</strong><small>${escapeHtml(permission.description)}</small></div><input type="checkbox" data-edit-perm="${permission.key}" ${user.permissions?.[permission.key] ? 'checked' : ''}></label></div>`).join('');
  document.getElementById('btn-delete-account').classList.toggle('hidden', !hasPermission('accounts.delete'));
  openModal('account-modal');
}

async function saveAccountModal() {
  if (!hasPermission('accounts.update')) return;
  const user = state.store.users.find(item => item.id === document.getElementById('edit-doc-id').value);
  if (!user) return;
  user.displayName = document.getElementById('edit-name').value.trim(); user.role = document.getElementById('edit-role').value; user.systemId = document.getElementById('edit-system-id').value.trim(); user.email = document.getElementById('edit-email').value.trim().toLowerCase(); user.status = document.getElementById('edit-status').value; user.exp = Number(document.getElementById('edit-exp').value || 0); user.note = document.getElementById('edit-note').value.trim();
  user.ownPartnerOnly = document.getElementById('edit-own-partner-only').checked; user.ownGroupbuyOnly = document.getElementById('edit-own-groupbuy-only').checked; user.supportOnly = document.getElementById('edit-can-support-only').checked; user.permissions = gatherCheckboxPermissions('[data-edit-perm]', 'editPerm'); user.updatedAt = nowISO();

  try {
    await dbSet('users', user);
    logAudit('account.update', `更新帳號 ${user.displayName}`); saveStore(); renderAll(); closeModal(document.getElementById('account-modal')); toast('帳號已更新');
  } catch(e) {}
}

async function deleteCurrentAccount() {
  if (!hasPermission('accounts.delete')) return;
  const id = document.getElementById('edit-doc-id').value;
  const result = await Swal.fire({ title: '確定要刪除？', text: '帳號刪除後將無法復原。', icon: 'warning', showCancelButton: true, confirmButtonText: '永久刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;

  const isDeletingSelf = (id === state.currentUserId);
  try {
    await dbDelete('users', id);
    state.store.users = state.store.users.filter(item => item.id !== id);
    if (isDeletingSelf) { toast('您已刪除自己的帳號，即將登出。', 'info'); return logout(); }
    logAudit('account.delete', `刪除帳號 UID: ${id}`); saveStore(); renderAll(); closeModal(document.getElementById('account-modal')); toast('帳號已刪除');
  } catch(e) {}
}

function renderDashboard() {
  document.getElementById('st-users').textContent = state.store.users.length;
  document.getElementById('st-staff').textContent = state.store.users.filter(user => ['engineer', 'admin', 'broadcaster'].includes(user.role)).length;
  document.getElementById('st-tickets').textContent = state.store.supportTickets.filter(ticket => ticket.status !== 'closed').length;
  document.getElementById('st-partners').textContent = state.store.partners.length + state.store.groupBuys.length;
  document.getElementById('st-exp').textContent = state.store.users.filter(user => (user.exp || 0) < 100).length;
  document.getElementById('st-ai').textContent = state.store.aiLogs.length + state.store.apiRegistry.length;
  
  const tl = document.getElementById('top-users-list');
  if(state.store.users.length) {
    tl.innerHTML = state.store.users.slice().sort((a, b) => (ROLE_META[b.role]?.level || 0) - (ROLE_META[a.role]?.level || 0)).slice(0, 5).map(user => `<div class="summary-row"><div><h4>${escapeHtml(user.displayName)}</h4><div class="muted tiny">${escapeHtml(user.systemId)} ・ ${escapeHtml(roleLabel(user.role))}</div></div><div class="tag-list">${roleBadge(user.role)}</div></div>`).join('');
  } else { tl.innerHTML = generateEmptyState('fa-solid fa-user-slash', '無資料', ''); }

  document.getElementById('feature-summary').innerHTML = FEATURE_FLAGS.map(flag => `<div class="summary-row"><div><h4>${escapeHtml(flag.label)}</h4><div class="muted tiny">${escapeHtml(flag.description)}</div></div>${state.store.featureFlags[flag.key] ? '<span class="badge badge-success">開啟</span>' : '<span class="badge badge-gray">關閉</span>'}</div>`).join('');
  
  const al = document.getElementById('home-audit-list');
  if(state.store.auditLogs.length) {
    al.innerHTML = state.store.auditLogs.slice(0, 5).map(log => `<div class="audit-row"><div><h4>${escapeHtml(log.action)}</h4><div class="muted tiny">${escapeHtml(log.actor)} ・ ${formatDate(log.createdAt)}</div><div class="tiny">${escapeHtml(log.detail)}</div></div></div>`).join('');
  } else { al.innerHTML = generateEmptyState('fa-solid fa-clipboard', '無資料', ''); }

  renderTrendChart();
}

function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  const last7 = Array.from({ length: 7 }, (_, index) => { const d = new Date(); d.setDate(d.getDate() - (6 - index)); return `${d.getMonth() + 1}/${d.getDate()}`; });
  const ticketCount = Array.from({ length: 7 }, (_, i) => (state.store.supportTickets.length + i) % 6 + 2);
  if (state.trendChart) state.trendChart.destroy();
  state.trendChart = new Chart(canvas, { type: 'line', data: { labels: last7, datasets: [{ label: '平台活動量', data: ticketCount, borderWidth: 3, tension: .4, fill: true, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,.12)', pointRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } });
}

function renderPermissionControls() {
  if (!hasPermission('permissions.manage')) return;
  document.getElementById('role-template-select').value ||= 'engineer';
  renderRolePermissionEditor(); renderAccountSelectors(); renderAccountPermissionEditor(); renderFeatureFlags(); renderPermissionMatrix();
}

function renderRolePermissionEditor() {
  const map = state.store.roleTemplates[document.getElementById('role-template-select').value || 'engineer'] || buildPermissionMap([]);
  document.getElementById('role-permission-grid').innerHTML = PERMISSIONS.map(p => `<div class="perm-item"><label><div><strong>${escapeHtml(p.label)}</strong><small>${escapeHtml(p.description)}</small></div><input type="checkbox" data-role-perm="${p.key}" ${map[p.key] ? 'checked' : ''}></label></div>`).join('');
}

function renderAccountPermissionEditor() {
  const user = state.store.users.find(item => item.id === (document.getElementById('perm-account-select').value || state.store.users[0]?.id));
  if (!user) return;
  document.getElementById('permission-editor-grid').innerHTML = PERMISSIONS.map(p => `<div class="perm-item"><label><div><strong>${escapeHtml(p.label)}</strong><small>${escapeHtml(p.description)}</small></div><input type="checkbox" data-account-perm="${p.key}" ${user.permissions?.[p.key] ? 'checked' : ''}></label></div>`).join('');
}

function renderFeatureFlags() { document.getElementById('feature-flag-grid').innerHTML = FEATURE_FLAGS.map(flag => `<div class="feature-item"><label><div><strong>${escapeHtml(flag.label)}</strong><small>${escapeHtml(flag.description)}</small></div><input type="checkbox" data-flag="${flag.key}" ${state.store.featureFlags[flag.key] ? 'checked' : ''}></label></div>`).join(''); }

function renderPermissionMatrix() {
  document.getElementById('permission-matrix').innerHTML = Object.entries(state.store.roleTemplates).map(([role, map]) => {
    const active = PERMISSIONS.filter(p => map[p.key]).map(p => p.label);
    return `<div class="matrix-card"><div class="record-head"><div class="record-title"><h4>${escapeHtml(roleLabel(role))}</h4>${roleBadge(role)}</div><span class="badge badge-info">${active.length} 項</span></div><div class="tag-list mt-12">${active.map(label => `<span class="badge badge-gray">${escapeHtml(label)}</span>`).join('')}</div></div>`;
  }).join('');
}

async function saveRoleTemplate() {
  const role = document.getElementById('role-template-select').value;
  state.store.roleTemplates[role] = gatherCheckboxPermissions('[data-role-perm]', 'rolePerm');
  try {
    await dbSysSet('roleTemplates', state.store.roleTemplates);
    logAudit('permissions.role_template', `更新角色模板：${roleLabel(role)}`); saveStore(); renderPermissionMatrix(); toast('角色模板已儲存');
  } catch(e){}
}

async function saveAccountPermissionEditor() {
  const user = state.store.users.find(item => item.id === document.getElementById('perm-account-select').value);
  if (!user) return;
  user.permissions = gatherCheckboxPermissions('[data-account-perm]', 'accountPerm'); user.updatedAt = nowISO();
  try {
    await dbSet('users', user);
    logAudit('permissions.account', `更新權限：${user.displayName}`); saveStore(); renderAccounts(); toast('帳號權限已儲存');
  } catch(e){}
}

function applyRolePresetToSelectedAccount() {
  const user = state.store.users.find(item => item.id === document.getElementById('perm-account-select').value);
  if (!user) return;
  user.permissions = deepClone(state.store.roleTemplates[user.role] || buildPermissionMap([]));
  renderAccountPermissionEditor(); toast('已預覽套用，請點擊儲存以生效');
}

async function saveFeatureFlags() {
  document.querySelectorAll('[data-flag]').forEach(input => { state.store.featureFlags[input.dataset.flag] = input.checked; });
  try {
    await dbSysSet('featureFlags', state.store.featureFlags);
    logAudit('feature_flags.update', '更新功能開關'); saveStore(); renderDashboard(); toast('功能開關已儲存');
  } catch(e){}
}

function renderExp() {
  if (!hasPermission('exp.manage')) return;
  const list = document.getElementById('exp-user-list');
  if(state.store.users.length) {
    list.innerHTML = state.store.users.slice().sort((a, b) => (b.exp || 0) - (a.exp || 0)).map(user => `<div class="exp-row"><div><h4>${escapeHtml(user.displayName)}</h4><div class="muted tiny">${escapeHtml(roleLabel(user.role))} ・ ${escapeHtml(user.systemId)}</div></div><div class="inline-actions"><span class="badge badge-pink">EXP ${user.exp || 0}</span><button class="btn btn-ghost" data-exp-user="${user.id}">調整</button></div></div>`).join('');
    list.querySelectorAll('[data-exp-user]').forEach(btn => btn.addEventListener('click', () => quickGrantSingleExp(btn.dataset.expUser)));
  } else { list.innerHTML = generateEmptyState('fa-solid fa-star', '無用戶資料', ''); }

  const logList = document.getElementById('exp-log-list');
  if(state.store.expLogs.length) {
    logList.innerHTML = state.store.expLogs.slice(0, 40).map(log => `<div class="audit-row"><div><h4>${escapeHtml(log.targetName)} ${log.amount > 0 ? `+${log.amount}` : log.amount} EXP</h4><div class="muted tiny">${formatDate(log.createdAt)}</div><div class="tiny">原因：${escapeHtml(log.reason || '-')}</div></div><span class="badge badge-info">${escapeHtml(log.type)}</span></div>`).join('');
  } else { logList.innerHTML = generateEmptyState('fa-solid fa-list-ul', '尚無異動紀錄', '發放 EXP 後將顯示於此。'); }
}

async function quickGrantSingleExp(userId) {
  if (!hasPermission('exp.manage')) return;
  const user = state.store.users.find(item => item.id === userId); if (!user) return;
  const result = await Swal.fire({ title: `調整 EXP`, html: '<input id="swal-exp-amount" class="swal2-input" type="number" placeholder="輸入數量"><input id="swal-exp-reason" class="swal2-input" placeholder="輸入原因">', focusConfirm: false, preConfirm: () => ({ amount: Number(document.getElementById('swal-exp-amount').value || 0), reason: document.getElementById('swal-exp-reason').value || '手動調整' }), showCancelButton: true, confirmButtonText: '確定' });
  if (!result.isConfirmed) return;
  
  const { amount, reason } = result.value; user.exp = (user.exp || 0) + amount;
  const log = { id: uid('exp'), targetUserId: user.id, targetName: user.displayName, amount, type: amount >= 0 ? 'grant' : 'deduct', reason, createdBy: currentUser().id, createdAt: nowISO() };
  state.store.expLogs.unshift(log);

  try {
    await dbSet('users', user); await dbSet('expLogs', log);
    logAudit('exp.adjust', `調整 ${user.displayName} EXP ${amount}`); saveStore(); renderExp(); renderAccounts(); toast('EXP 已調整');
  } catch(e){}
}

async function submitExpGrant() {
  const targetType = document.getElementById('exp-target-type').value; const targetValue = document.getElementById('exp-target-value').value.trim(); const amount = Number(document.getElementById('exp-amount').value || 0); const reason = document.getElementById('exp-reason').value.trim() || '活動獎勵'; const message = document.getElementById('exp-message').value.trim(); const sendNotice = document.getElementById('exp-send-notice').checked; const writeAudit = document.getElementById('exp-write-audit').checked;
  if (!amount) { return toast('請輸入數量', 'warning'); }
  let targets = [];
  if (targetType === 'all') targets = state.store.users;
  if (targetType === 'role') targets = state.store.users.filter(u => u.role === targetValue);
  if (targetType === 'uid') { const ids = targetValue.split(',').map(i => i.trim()).filter(Boolean); targets = state.store.users.filter(u => ids.includes(u.id) || ids.includes(u.authUid) || ids.includes(u.systemId)); }
  if (!targets.length) { return toast('找不到發放目標', 'warning'); }

  const batch = writeBatch(db);
  targets.forEach(user => {
    user.exp = (user.exp || 0) + amount;
    const log = { id: uid('exp'), targetUserId: user.id, targetName: user.displayName, amount, type: 'grant', reason, createdBy: currentUser().id, createdAt: nowISO() };
    state.store.expLogs.unshift(log);
    batch.update(doc(db, 'users', user.id), { exp: user.exp });
    batch.set(doc(db, 'expLogs', log.id), log);
    if (sendNotice) {
      const bc = { id: uid('bc'), title: 'EXP 發放通知', targetType: 'uid', targetValue: user.id, content: message || `已發放 ${amount} EXP，原因：${reason}`, pin: false, scheduled: false, createdAt: nowISO(), createdBy: currentUser().id };
      state.store.broadcasts.unshift(bc);
      batch.set(doc(db, 'broadcasts', bc.id), bc);
    }
  });

  try {
    await batch.commit();
    if (writeAudit) logAudit('exp.grant', `批次發放 ${amount} EXP 給 ${targets.length} 人`);
    saveStore(); renderAll(); closeModal(document.getElementById('exp-modal')); toast(`已發放給 ${targets.length} 位用戶`);
  } catch(e) { showError('批次發放失敗', '', e); }
}

function canManagePartner(r) { const u = currentUser(); return (!u) ? false : (u.role === 'engineer' || u.role === 'admin' || (!u.ownPartnerOnly && !state.store.featureFlags['feature.partner_self_only']) || r.managerUid === u.id) && hasPermission('promo.manage'); }

function renderPartners() {
  if (!hasPermission('promo.view')) return;
  const pl = document.getElementById('partner-list');
  if (state.store.partners.length) {
    pl.innerHTML = state.store.partners.map(p => `<div class="record-card hover-lift"><div class="record-head"><div class="record-title"><h4>${escapeHtml(p.name)}</h4>${statusBadge(p.status)}</div><div class="record-meta"><span>${escapeHtml(p.type)}</span><span>對應：${escapeHtml(p.owner || '-')}</span></div></div><div class="record-body"><div class="kv-grid"><div class="kv"><span>聯絡人</span>${escapeHtml(p.contact || '-')}</div><div class="kv"><span>聯絡方式</span>${escapeHtml(p.channel || '-')}</div></div><div>${escapeHtml(p.summary || '')}</div></div><div class="record-actions"><button class="btn btn-ghost" ${canManagePartner(p) ? '' : 'disabled'} data-partner-edit="${p.id}"><i class="fa-solid fa-pen"></i>編輯</button><button class="btn btn-danger-soft" ${canManagePartner(p) ? '' : 'disabled'} data-partner-delete="${p.id}"><i class="fa-solid fa-trash"></i>刪除</button></div></div>`).join('');
  } else { pl.innerHTML = generateEmptyState('fa-solid fa-store-slash', '尚無店家', '可點擊上方按鈕建立新的合作店家。'); }

  const cl = document.getElementById('campaign-list');
  if (state.store.campaigns.length) {
    cl.innerHTML = state.store.campaigns.map(c => { const p = state.store.partners.find(i => i.id === c.partnerId); return `<div class="record-card hover-lift"><div class="record-head"><div class="record-title"><h4>${escapeHtml(c.title)}</h4>${statusBadge(c.status)}</div><div class="record-meta"><span>${p ? escapeHtml(p.name) : '未指定'}</span><span>${formatDate(c.dueDate)}</span></div></div><div class="record-body"><div>${escapeHtml(c.deliverables || '')}</div></div><div class="record-actions"><button class="btn btn-danger-soft" data-campaign-delete="${c.id}"><i class="fa-solid fa-trash"></i>刪除</button></div></div>`; }).join('');
  } else { cl.innerHTML = generateEmptyState('fa-solid fa-clapperboard', '尚無專案', '目前沒有進行中的專案排程。'); }

  document.querySelectorAll('[data-partner-edit]').forEach(btn => btn.addEventListener('click', () => openPartnerModal(btn.dataset.partnerEdit)));
  document.querySelectorAll('[data-partner-delete]').forEach(btn => btn.addEventListener('click', () => deletePartner(btn.dataset.partnerDelete)));
  document.querySelectorAll('[data-campaign-delete]').forEach(btn => btn.addEventListener('click', () => deleteCampaign(btn.dataset.campaignDelete)));
}

async function deletePartner(id) {
  const result = await Swal.fire({ title: '確定要刪除合作店家？', text: '這將永久移除店家主檔資料。', icon: 'warning', showCancelButton: true, confirmButtonText: '確定刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('partners', id);
    state.store.partners = state.store.partners.filter(p => p.id !== id);
    logAudit('partner.delete', `刪除合作店家`); saveStore(); renderPartners(); toast('已刪除店家');
  } catch(e) {}
}

async function deleteCampaign(id) {
  const result = await Swal.fire({ title: '確定要刪除合作專案？', icon: 'warning', showCancelButton: true, confirmButtonText: '確定刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('campaigns', id);
    state.store.campaigns = state.store.campaigns.filter(c => c.id !== id);
    logAudit('campaign.delete', `刪除專案`); saveStore(); renderPartners(); toast('已刪除專案');
  } catch(e) {}
}

function openPartnerModal(partnerId = null) {
  const p = state.store.partners.find(item => item.id === partnerId) || {};
  document.getElementById('partner-id').value = p.id || ''; document.getElementById('partner-name').value = p.name || ''; document.getElementById('partner-type').value = p.type || ''; document.getElementById('partner-contact').value = p.contact || ''; document.getElementById('partner-channel').value = p.channel || ''; document.getElementById('partner-logo').value = p.logo || ''; document.getElementById('partner-summary').value = p.summary || ''; document.getElementById('partner-status').value = p.status || 'draft'; document.getElementById('partner-owner').value = p.owner || ''; document.getElementById('partner-manager-uid').value = p.managerUid || currentUser().id; document.getElementById('partner-note').value = p.note || ''; document.getElementById('partner-public').checked = !!p.isPublic; document.getElementById('partner-longterm').checked = !!p.isLongterm; openModal('partner-modal');
}

async function savePartner() {
  if (!hasPermission('promo.manage')) return;
  const id = document.getElementById('partner-id').value;
  const p = { id: id || uid('partner'), name: document.getElementById('partner-name').value.trim(), type: document.getElementById('partner-type').value.trim(), contact: document.getElementById('partner-contact').value.trim(), channel: document.getElementById('partner-channel').value.trim(), logo: document.getElementById('partner-logo').value.trim(), summary: document.getElementById('partner-summary').value.trim(), status: document.getElementById('partner-status').value, owner: document.getElementById('partner-owner').value.trim(), managerUid: document.getElementById('partner-manager-uid').value.trim() || currentUser().id, note: document.getElementById('partner-note').value.trim(), isPublic: document.getElementById('partner-public').checked, isLongterm: document.getElementById('partner-longterm').checked, updatedAt: nowISO(), createdBy: currentUser().id };
  if (!p.name) return toast('請輸入店家名稱', 'warning');
  const existing = state.store.partners.find(item => item.id === id);
  if (existing && !canManagePartner(existing)) return toast('權限不足', 'warning');
  
  if (existing) Object.assign(existing, p); else state.store.partners.unshift({ ...p, createdAt: nowISO() });
  
  try {
    await dbSet('partners', existing ? existing : state.store.partners[0]);
    logAudit('partner.save', `儲存店家：${p.name}`); saveStore(); renderPartners(); closeModal(document.getElementById('partner-modal')); toast('儲存成功');
  } catch(e) {}
}

async function quickCreateCampaign() {
  if (!hasPermission('promo.manage')) return;
  if(state.store.partners.length === 0) return toast('請先建立合作店家', 'warning');
  const result = await Swal.fire({ title: '新增合作專案', html: '<input id="swal-campaign-title" class="swal2-input" placeholder="專案名稱"><textarea id="swal-campaign-deliverables" class="swal2-textarea" placeholder="交付項目"></textarea>', input: 'select', inputOptions: Object.fromEntries(state.store.partners.map(p => [p.id, p.name])), inputPlaceholder: '選擇店家', showCancelButton: true, confirmButtonText: '建立', confirmButtonColor: '#f472b6', preConfirm: partnerId => ({ partnerId, title: document.getElementById('swal-campaign-title').value, deliverables: document.getElementById('swal-campaign-deliverables').value }) });
  if (!result.isConfirmed) return;
  const c = { id: uid('campaign'), partnerId: result.value.partnerId, title: result.value.title || '未命名專案', status: 'draft', dueDate: nowISO(), deliverables: result.value.deliverables || '', note: '', createdAt: nowISO() };
  state.store.campaigns.unshift(c);
  
  try {
    await dbSet('campaigns', c);
    logAudit('campaign.create', `建立專案：${c.title}`); saveStore(); renderPartners(); toast('專案已建立');
  } catch(e) {}
}

function canManageGroupbuy(r) { const u = currentUser(); return (!u) ? false : (u.role === 'engineer' || u.role === 'admin' || (!u.ownGroupbuyOnly && !state.store.featureFlags['feature.groupbuy_self_only']) || r.managerUid === u.id) && hasPermission('groupbuy.manage'); }

function renderGroupbuys() {
  if (!hasPermission('groupbuy.view')) return;
  const board = document.getElementById('groupbuy-board');
  if (state.store.groupBuys.length === 0) {
    board.innerHTML = `<div style="grid-column:1/-1;">${generateEmptyState('fa-solid fa-box-open', '無開團資料', '目前沒有任何商品或開團活動。')}</div>`;
    return;
  }
  const columns = [{ key: 'draft', label: '草稿' }, { key: 'review', label: '待審核' }, { key: 'live', label: '上架中' }, { key: 'ended', label: '已結束' }];
  board.innerHTML = columns.map(col => {
    const items = state.store.groupBuys.filter(item => item.status === col.key);
    return `<div class="kanban-col"><div class="kanban-col-head"><strong>${escapeHtml(col.label)}</strong><span class="badge badge-info">${items.length}</span></div><div class="kanban-drop">${items.map(item => `<div class="groupbuy-card hover-lift"><div class="groupbuy-cover">${item.cover ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title)}">` : ''}</div><div class="record-title"><h4>${escapeHtml(item.title)}</h4></div><div class="muted tiny">${escapeHtml(item.productName)} ・ ${escapeHtml(item.brand)}</div><div class="groupbuy-price mt-12"><strong>${formatCurrency(item.salePrice)}</strong><del>${formatCurrency(item.originalPrice)}</del></div><div class="tag-list mt-12">${item.freeShipping ? '<span class="badge badge-success">免運</span>' : `<span class="badge badge-gray">運費 ${formatCurrency(item.shippingFee)}</span>`}${item.featured ? '<span class="badge badge-pink">置頂</span>' : ''}</div><div class="record-actions"><button class="btn btn-ghost" ${canManageGroupbuy(item) ? '' : 'disabled'} data-gb-edit="${item.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger-soft" ${canManageGroupbuy(item) ? '' : 'disabled'} data-gb-delete="${item.id}"><i class="fa-solid fa-trash"></i></button></div></div>`).join('')}</div></div>`;
  }).join('');
  document.querySelectorAll('[data-gb-edit]').forEach(btn => btn.addEventListener('click', () => openGroupBuyModal(btn.dataset.gbEdit)));
  document.querySelectorAll('[data-gb-delete]').forEach(btn => btn.addEventListener('click', () => deleteGroupbuy(btn.dataset.gbDelete)));
}

async function deleteGroupbuy(id) {
  const result = await Swal.fire({ title: '確定要刪除開團？', text: '這將移除此商品所有設定與排程。', icon: 'warning', showCancelButton: true, confirmButtonText: '確定刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('groupBuys', id);
    state.store.groupBuys = state.store.groupBuys.filter(g => g.id !== id);
    logAudit('groupbuy.delete', `刪除開團`); saveStore(); renderGroupbuys(); toast('開團已刪除');
  } catch(e) {}
}

function openGroupBuyModal(id = null) {
  const item = state.store.groupBuys.find(record => record.id === id) || {};
  document.getElementById('groupbuy-id').value = item.id || ''; document.getElementById('gb-title').value = item.title || ''; document.getElementById('gb-product-name').value = item.productName || ''; document.getElementById('gb-category').value = item.category || ''; document.getElementById('gb-brand').value = item.brand || ''; document.getElementById('gb-link').value = item.link || ''; document.getElementById('gb-cover').value = item.cover || ''; document.getElementById('gb-original-price').value = item.originalPrice ?? ''; document.getElementById('gb-sale-price').value = item.salePrice ?? ''; document.getElementById('gb-discount-label').value = item.discountLabel || ''; document.getElementById('gb-shipping-fee').value = item.shippingFee ?? 0; document.getElementById('gb-free-shipping').checked = !!item.freeShipping; document.getElementById('gb-show-commission').checked = !!item.showCommission; document.getElementById('gb-commission').value = item.commission ?? ''; document.getElementById('gb-status').value = item.status || 'draft'; document.getElementById('gb-start-at').value = item.startAt ? item.startAt.slice(0, 16) : ''; document.getElementById('gb-end-at').value = item.endAt ? item.endAt.slice(0, 16) : ''; document.getElementById('gb-manager-uid').value = item.managerUid || currentUser().id; document.getElementById('gb-sold-count').value = item.soldCount ?? 0; document.getElementById('gb-featured').checked = !!item.featured; document.getElementById('gb-published').checked = !!item.published; document.getElementById('gb-highlights').value = item.highlights || ''; document.getElementById('gb-qa').value = item.qa || ''; document.getElementById('gb-policy').value = item.policy || ''; openModal('groupbuy-modal');
}

async function saveGroupBuy() {
  if (!hasPermission('groupbuy.manage')) return;
  const id = document.getElementById('groupbuy-id').value; const existing = state.store.groupBuys.find(item => item.id === id);
  if (existing && !canManageGroupbuy(existing)) return toast('只能管理自己的內容', 'warning');
  const payload = { id: id || uid('gb'), title: document.getElementById('gb-title').value.trim(), productName: document.getElementById('gb-product-name').value.trim(), category: document.getElementById('gb-category').value.trim(), brand: document.getElementById('gb-brand').value.trim(), link: document.getElementById('gb-link').value.trim(), cover: document.getElementById('gb-cover').value.trim(), originalPrice: Number(document.getElementById('gb-original-price').value || 0), salePrice: Number(document.getElementById('gb-sale-price').value || 0), discountLabel: document.getElementById('gb-discount-label').value.trim(), shippingFee: Number(document.getElementById('gb-shipping-fee').value || 0), freeShipping: document.getElementById('gb-free-shipping').checked, showCommission: document.getElementById('gb-show-commission').checked, commission: Number(document.getElementById('gb-commission').value || 0), status: document.getElementById('gb-status').value, startAt: document.getElementById('gb-start-at').value, endAt: document.getElementById('gb-end-at').value, managerUid: document.getElementById('gb-manager-uid').value.trim() || currentUser().id, soldCount: Number(document.getElementById('gb-sold-count').value || 0), featured: document.getElementById('gb-featured').checked, published: document.getElementById('gb-published').checked, highlights: document.getElementById('gb-highlights').value.trim(), qa: document.getElementById('gb-qa').value.trim(), policy: document.getElementById('gb-policy').value.trim(), updatedAt: nowISO(), createdBy: currentUser().id };
  if (!payload.title || !payload.productName) return toast('請填寫標題與商品名稱', 'warning');
  
  if (existing) Object.assign(existing, payload); else state.store.groupBuys.unshift({ ...payload, createdAt: nowISO() });
  
  try {
    await dbSet('groupBuys', existing ? existing : state.store.groupBuys[0]);
    logAudit('groupbuy.save', `儲存開團：${payload.title}`); saveStore(); renderGroupbuys(); closeModal(document.getElementById('groupbuy-modal')); toast('開團已儲存');
  } catch(e) {}
}

function renderBroadcasts() {
  const bl = document.getElementById('broadcast-list');
  if (state.store.broadcasts.length) {
    bl.innerHTML = state.store.broadcasts.map(item => `<div class="record-card hover-lift"><div class="record-head"><div class="record-title"><h4>${escapeHtml(item.title)}</h4>${item.pin ? '<span class="badge badge-pink">置頂</span>' : ''}</div><div class="record-meta"><span>${formatDate(item.createdAt)}</span><span>範圍：${escapeHtml(item.targetType)}</span></div></div><div class="record-body"><div>${escapeHtml(item.content)}</div></div><div class="record-actions"><button class="btn btn-danger-soft" data-bc-delete="${item.id}"><i class="fa-solid fa-trash"></i>撤回訊息</button></div></div>`).join('');
    document.querySelectorAll('[data-bc-delete]').forEach(btn => btn.addEventListener('click', () => deleteBroadcast(btn.dataset.bcDelete)));
  } else { bl.innerHTML = generateEmptyState('fa-solid fa-bullhorn', '無推播訊息', '這裡將顯示所有系統全域與個人訊息。'); }
}

async function deleteBroadcast(id) {
  const result = await Swal.fire({ title: '確定要撤回訊息？', text: '撤回後將從用戶端消失。', icon: 'warning', showCancelButton: true, confirmButtonText: '撤回', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('broadcasts', id);
    state.store.broadcasts = state.store.broadcasts.filter(b => b.id !== id);
    logAudit('broadcast.delete', `撤回訊息`); saveStore(); renderBroadcasts(); toast('訊息已撤回');
  } catch(e){}
}

async function saveBroadcast() {
  const title = document.getElementById('bc-title').value.trim(); const targetType = document.getElementById('bc-target-type').value; const targetValue = document.getElementById('bc-target-value').value.trim(); const content = document.getElementById('bc-content').value.trim();
  if (!title || !content) return toast('請完整填寫標題與內容', 'warning');
  const bc = { id: uid('bc'), title, targetType, targetValue, content, pin: document.getElementById('bc-pin').checked, scheduled: document.getElementById('bc-schedule').checked, createdAt: nowISO(), createdBy: currentUser().id };
  state.store.broadcasts.unshift(bc);
  try {
    await dbSet('broadcasts', bc);
    logAudit('broadcast.create', `發送訊息：${title}`); saveStore(); renderBroadcasts(); toast('訊息已建立並發送');
  } catch(e){}
}

function openMediaModal(id = null) {
  const media = state.store.mediaAssets.find(item => item.id === id) || {};
  document.getElementById('media-id').value = media.id || ''; document.getElementById('media-title').value = media.title || ''; document.getElementById('media-category').value = media.category || 'logo'; document.getElementById('media-url').value = media.url || ''; document.getElementById('media-usage').value = media.usage || ''; document.getElementById('media-tags').value = (media.tags || []).join(', '); document.getElementById('media-visibility').value = media.visibility || 'private'; document.getElementById('media-preview').src = media.url || ''; openModal('media-modal');
}
function previewMediaFile(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { document.getElementById('media-preview').src = r.result; if (!document.getElementById('media-url').value.trim()) document.getElementById('media-url').value = r.result; }; r.readAsDataURL(f); }
function previewMediaUrl() { document.getElementById('media-preview').src = document.getElementById('media-url').value.trim(); }

async function saveMediaAsset() {
  const id = document.getElementById('media-id').value;
  const payload = { id: id || uid('media'), title: document.getElementById('media-title').value.trim(), category: document.getElementById('media-category').value, url: document.getElementById('media-url').value.trim(), usage: document.getElementById('media-usage').value.trim(), tags: document.getElementById('media-tags').value.split(',').map(item => item.trim()).filter(Boolean), visibility: document.getElementById('media-visibility').value, createdAt: nowISO(), createdBy: currentUser().id };
  if (!payload.title || !payload.url) return toast('請填寫標題與圖片來源', 'warning');
  const existing = state.store.mediaAssets.find(item => item.id === id);
  if (existing) Object.assign(existing, payload); else state.store.mediaAssets.unshift(payload);
  
  try {
    await dbSet('mediaAssets', existing ? existing : state.store.mediaAssets[0]);
    logAudit('media.save', `儲存素材：${payload.title}`); saveStore(); renderMedia(); closeModal(document.getElementById('media-modal')); toast('素材已儲存');
  } catch(e){}
}

function renderMedia() {
  const ml = document.getElementById('media-list');
  if (state.store.mediaAssets.length) {
    ml.innerHTML = state.store.mediaAssets.map(item => `<div class="media-card hover-lift"><img src="${escapeHtml(item.url)}"><div class="media-card-body"><strong>${escapeHtml(item.title)}</strong><div class="muted tiny">${escapeHtml(item.category)} ・ ${escapeHtml(item.visibility)}</div><div class="tag-list">${(item.tags || []).map(tag => `<span class="badge badge-gray">${escapeHtml(tag)}</span>`).join('')}</div><div class="record-actions"><button class="btn btn-ghost" data-media-edit="${item.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger-soft" data-media-delete="${item.id}"><i class="fa-solid fa-trash"></i></button></div></div></div>`).join('');
    document.querySelectorAll('[data-media-edit]').forEach(btn => btn.addEventListener('click', () => openMediaModal(btn.dataset.mediaEdit)));
    document.querySelectorAll('[data-media-delete]').forEach(btn => btn.addEventListener('click', () => deleteMedia(btn.dataset.mediaDelete)));
  } else { ml.innerHTML = `<div style="grid-column:1/-1;">${generateEmptyState('fa-solid fa-images', '圖片庫空空如也', '趕快上傳第一張素材吧！')}</div>`; }
}

async function deleteMedia(id) {
  const result = await Swal.fire({ title: '確定刪除圖片？', icon: 'warning', showCancelButton: true, confirmButtonText: '刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('mediaAssets', id);
    state.store.mediaAssets = state.store.mediaAssets.filter(item => item.id !== id);
    logAudit('media.delete', `刪除素材`); saveStore(); renderMedia(); toast('已刪除素材');
  } catch(e){}
}

function renderBilling() {
  const bl = document.getElementById('billing-list');
  if(state.store.billingRecords.length) {
    bl.innerHTML = state.store.billingRecords.map(item => `<div class="record-card hover-lift"><div class="record-head"><div class="record-title"><h4>${escapeHtml(item.title)}</h4>${statusBadge(item.status)}</div><div class="record-meta"><span>${formatCurrency(item.amount)}</span><span>${formatDate(item.createdAt)}</span></div></div><div class="record-body">${escapeHtml(item.note || '')}</div></div>`).join('');
  } else { bl.innerHTML = generateEmptyState('fa-solid fa-file-invoice-dollar', '無帳務資料', '太棒了，目前沒有待處理的帳務紀錄。'); }
}

function renderSupport() {
  const keyword = document.getElementById('ticket-search').value.trim().toLowerCase();
  const tickets = state.store.supportTickets.filter(t => !keyword || [t.userName, t.userEmail, t.topic, ...t.messages.map(m => m.text)].join(' ').toLowerCase().includes(keyword));
  document.getElementById('badge-ticket').textContent = state.store.supportTickets.filter(t => t.status !== 'closed').length;
  document.getElementById('badge-ticket').classList.toggle('hidden', !state.store.supportTickets.length);
  
  const tl = document.getElementById('ticket-list');
  if (tickets.length) {
    tl.innerHTML = tickets.map(t => `<div class="ticket-item ${t.id === state.selectedTicketId ? 'active' : ''}" data-ticket-id="${t.id}"><div class="record-head"><div><strong>${escapeHtml(t.topic)}</strong><div class="muted tiny">${escapeHtml(t.userName)}</div></div>${statusBadge(t.status)}</div><div class="muted tiny mt-4">更新：${formatDate(t.updatedAt)}</div></div>`).join('');
    document.querySelectorAll('[data-ticket-id]').forEach(item => item.addEventListener('click', () => { state.selectedTicketId = item.dataset.ticketId; renderSupport(); }));
  } else { tl.innerHTML = generateEmptyState('fa-solid fa-headset', '收件匣為空', '所有工單皆已處理完畢。'); }
  if (state.selectedTicketId) renderSelectedTicket();
}

function renderSelectedTicket() {
  const t = state.store.supportTickets.find(item => item.id === state.selectedTicketId); if (!t) return;
  document.getElementById('support-detail-header').innerHTML = `<div><h3>${escapeHtml(t.topic)}</h3><div class="sub-text">${escapeHtml(t.userName)} ・ ${escapeHtml(t.userEmail)} ・ ${formatDate(t.updatedAt)}</div></div>${statusBadge(t.status)}`;
  document.getElementById('support-thread').innerHTML = [...t.messages.map(m => `<div class="chat-bubble ${m.role === 'user' ? 'user' : 'agent'}"><div class="bubble-meta">${escapeHtml(m.sender)} ・ ${formatDate(m.createdAt)}</div><div>${escapeHtml(m.text)}</div></div>`), ...t.notes.map(n => `<div class="chat-bubble note"><div class="bubble-meta">內部註記</div><div>${escapeHtml(n)}</div></div>`)].join('');
  document.getElementById('ticket-note').value = ''; document.getElementById('ticket-reply').value = '';
}

async function saveTicketNote() {
  const t = state.store.supportTickets.find(item => item.id === state.selectedTicketId); const text = document.getElementById('ticket-note').value.trim(); if (!t || !text) return;
  t.notes.push(text); t.updatedAt = nowISO();
  try {
    await dbSet('supportTickets', t);
    logAudit('support.note', `備註：${t.topic}`); saveStore(); renderSelectedTicket(); renderSupport(); toast('備註已儲存');
  } catch(e){}
}

async function replyTicket() {
  const t = state.store.supportTickets.find(item => item.id === state.selectedTicketId); const text = document.getElementById('ticket-reply').value.trim(); if (!t || !text) return;
  t.messages.push({ id: uid('msg'), role: 'agent', sender: currentUser().displayName, text, createdAt: nowISO() }); t.status = 'open'; t.updatedAt = nowISO();
  try {
    await dbSet('supportTickets', t);
    logAudit('support.reply', `回覆：${t.topic}`); saveStore(); renderSelectedTicket(); renderSupport(); toast('回覆已送出');
  } catch(e){}
}

function maskPii(text) { return state.aiMask ? String(text).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '***@***').replace(/會員[\u4e00-\u9fa5A-Za-z0-9_-]+/g, '會員***') : text; }

function renderAiLogs() {
  document.getElementById('ai-mask-toggle').checked = state.aiMask;
  const al = document.getElementById('ai-list');
  if (state.store.aiLogs.length) {
    al.innerHTML = state.store.aiLogs.map(log => `<div class="record-card hover-lift"><div class="record-head"><div class="record-title"><h4>${escapeHtml(maskPii(log.userName))}</h4>${statusBadge(log.status)}<span class="api-pill">${escapeHtml(log.model)}</span></div><div class="record-meta"><span>UID：${escapeHtml(maskPii(log.userId))}</span><span>${formatDate(log.createdAt)}</span></div></div><div class="record-body"><div class="kv-grid"><div class="kv"><span>來源模組</span>${escapeHtml(log.module)}</div><div class="kv"><span>耗時/Token</span>${escapeHtml(log.latencyMs)}ms / ${escapeHtml(log.tokenUsage)}</div></div><div class="kv"><span>提問</span>${escapeHtml(maskPii(log.prompt))}</div><div class="kv"><span>回覆</span>${escapeHtml(maskPii(log.response))}</div></div><div class="record-actions"><button class="btn btn-danger-soft" data-ai-delete="${log.id}"><i class="fa-solid fa-trash"></i></button></div></div>`).join('');
    document.querySelectorAll('[data-ai-delete]').forEach(btn => btn.addEventListener('click', () => deleteAiLog(btn.dataset.aiDelete)));
  } else { al.innerHTML = generateEmptyState('fa-solid fa-robot', '無 AI 觀測紀錄', '系統目前尚未收錄任何對話。'); }
}

async function deleteAiLog(id) {
  const result = await Swal.fire({ title: '確定刪除此紀錄？', icon: 'warning', showCancelButton: true, confirmButtonText: '刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('aiLogs', id);
    state.store.aiLogs = state.store.aiLogs.filter(log => log.id !== id); logAudit('ai.delete', `刪除 AI 紀錄`); saveStore(); renderAiLogs(); toast('紀錄已刪除'); 
  } catch(e){}
}

async function purgeOldAiLogs() {
  const result = await Swal.fire({ title: '清除舊資料', text: '將依照保留政策刪除過期資料', icon: 'warning', showCancelButton: true, confirmButtonText: '執行清檔', confirmButtonColor: '#f43f5e' });
  if(!result.isConfirmed) return;

  const cutoff = Date.now() - (state.store.config.retentionDays || 30) * 86400000;
  const toDelete = state.store.aiLogs.filter(log => new Date(log.createdAt).getTime() < cutoff);
  state.store.aiLogs = state.store.aiLogs.filter(log => new Date(log.createdAt).getTime() >= cutoff);
  
  const batch = writeBatch(db);
  toDelete.forEach(log => batch.delete(doc(db, 'aiLogs', log.id)));
  try {
    await batch.commit();
    logAudit('ai.purge', `清理 ${toDelete.length} 筆舊記錄`); saveStore(); renderAiLogs(); toast(`已清理 ${toDelete.length} 筆紀錄`);
  } catch(e){ showError('清理失敗', '', e); }
}

function renderInbox() {
  const keyword = document.getElementById('thread-search').value.trim().toLowerCase();
  const threads = state.store.internalThreads.filter(t => !keyword || [t.title, t.summary, ...t.messages.map(m => m.text)].join(' ').toLowerCase().includes(keyword));
  if (!state.selectedThreadId && threads[0]) state.selectedThreadId = threads[0].id;
  
  const tl = document.getElementById('thread-list');
  if (threads.length) {
    tl.innerHTML = threads.map(t => `<div class="thread-item ${t.id === state.selectedThreadId ? 'active' : ''}" data-thread-id="${t.id}"><strong>${escapeHtml(t.title)}</strong><div class="muted tiny">${escapeHtml(t.summary || '')}</div><div class="muted tiny">${formatDate(t.updatedAt)}</div></div>`).join('');
    document.querySelectorAll('[data-thread-id]').forEach(item => item.addEventListener('click', () => { state.selectedThreadId = item.dataset.threadId; renderInbox(); }));
  } else { tl.innerHTML = generateEmptyState('fa-regular fa-comments', '無訊息串', '點擊建立以發起團隊對話'); }
  renderSelectedThread();
}

function renderSelectedThread() {
  const t = state.store.internalThreads.find(item => item.id === state.selectedThreadId);
  if (!t) { document.getElementById('thread-header').innerHTML = generateEmptyState('fa-regular fa-message', '', '請選擇左側對話'); document.getElementById('thread-messages').innerHTML = ''; return; }
  document.getElementById('thread-header').innerHTML = `<div><h3>${escapeHtml(t.title)}</h3><div class="sub-text">${escapeHtml(t.summary || '')} ・ ${t.members.length} 位參與者</div></div>`;
  document.getElementById('thread-messages').innerHTML = t.messages.map(m => `<div class="chat-message ${m.senderId === currentUser().id ? 'me' : ''}"><div class="bubble-meta">${escapeHtml(m.senderName)} ・ ${formatDate(m.createdAt)}</div><div>${escapeHtml(m.text)}</div><div class="bubble-tools"><button class="icon-btn" data-thread-msg-delete="${m.id}"><i class="fa-solid fa-trash"></i></button></div></div>`).join('');
  document.querySelectorAll('[data-thread-msg-delete]').forEach(btn => btn.addEventListener('click', () => deleteThreadMessage(btn.dataset.threadMsgDelete)));
}

async function createThread() {
  const title = document.getElementById('new-thread-title').value.trim(); const msg = document.getElementById('new-thread-message').value.trim();
  if (!title) return toast('請輸入標題', 'warning');
  const thread = { id: uid('thread'), title, summary: document.getElementById('new-thread-summary').value.trim(), members: [currentUser().id, ...document.getElementById('new-thread-members').value.trim().split(/[,\n]/).map(i => i.trim()).filter(Boolean)], messages: msg ? [{ id: uid('msg'), senderId: currentUser().id, senderName: currentUser().displayName, text: msg, createdAt: nowISO() }] : [], updatedAt: nowISO(), createdAt: nowISO() };
  state.store.internalThreads.unshift(thread); state.selectedThreadId = thread.id;
  try {
    await dbSet('internalThreads', thread);
    logAudit('thread.create', `建立聊天室：${title}`); saveStore(); renderInbox(); closeModal(document.getElementById('thread-modal'));
  } catch(e){}
}

async function sendThreadMessage() {
  const t = state.store.internalThreads.find(item => item.id === state.selectedThreadId); const text = document.getElementById('thread-message').value.trim(); if (!t || !text) return;
  t.messages.push({ id: uid('msg'), senderId: currentUser().id, senderName: currentUser().displayName, text, createdAt: nowISO() }); t.updatedAt = nowISO();
  try {
    await dbSet('internalThreads', t);
    document.getElementById('thread-message').value = ''; saveStore(); renderInbox();
  } catch(e){}
}

async function deleteThreadMessage(msgId) {
  const t = state.store.internalThreads.find(item => item.id === state.selectedThreadId); if (!t) return;
  t.messages = t.messages.filter(m => m.id !== msgId); t.updatedAt = nowISO();
  try { await dbSet('internalThreads', t); saveStore(); renderSelectedThread(); } catch(e){}
}

async function deleteSelectedThread() {
  if (!state.selectedThreadId) return;
  const result = await Swal.fire({ title: '確定刪除對話？', icon: 'warning', showCancelButton: true, confirmButtonText: '刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('internalThreads', state.selectedThreadId);
    state.store.internalThreads = state.store.internalThreads.filter(item => item.id !== state.selectedThreadId);
    state.selectedThreadId = state.store.internalThreads[0]?.id || null; saveStore(); renderInbox(); toast('聊天室已刪除');
  } catch(e){}
}

function renderApis() {
  const al = document.getElementById('api-list');
  if(state.store.apiRegistry.length) {
    al.innerHTML = state.store.apiRegistry.map(api => `<div class="record-card hover-lift"><div class="record-head"><div class="record-title"><h4>${escapeHtml(api.name)}</h4>${statusBadge(api.status)}<span class="api-pill">${escapeHtml(api.method)}</span></div><div class="record-meta"><span>${escapeHtml(api.provider)}</span></div></div><div class="record-body"><div class="kv-grid"><div class="kv"><span>Endpoint</span>${escapeHtml(api.endpoint)}</div><div class="kv"><span>用途</span>${escapeHtml(api.purpose)}</div></div></div><div class="record-actions"><button class="btn btn-ghost" data-api-edit="${api.id}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-ghost" data-api-test="${api.id}">測試</button><button class="btn btn-danger-soft" data-api-delete="${api.id}"><i class="fa-solid fa-trash"></i></button></div></div>`).join('');
    document.querySelectorAll('[data-api-edit]').forEach(btn => btn.addEventListener('click', () => openApiModal(btn.dataset.apiEdit)));
    document.querySelectorAll('[data-api-test]').forEach(btn => btn.addEventListener('click', () => testApi(btn.dataset.apiTest)));
    document.querySelectorAll('[data-api-delete]').forEach(btn => btn.addEventListener('click', () => deleteApi(btn.dataset.apiDelete)));
  } else { al.innerHTML = generateEmptyState('fa-solid fa-plug-circle-bolt', '無 API 設定', '系統尚未綁定任何外部服務。'); }
}

function openApiModal(id = null) {
  const api = state.store.apiRegistry.find(item => item.id === id) || {};
  document.getElementById('api-id').value = api.id || ''; document.getElementById('api-name').value = api.name || ''; document.getElementById('api-endpoint').value = api.endpoint || ''; document.getElementById('api-method').value = api.method || 'POST'; document.getElementById('api-provider').value = api.provider || ''; document.getElementById('api-purpose').value = api.purpose || ''; document.getElementById('api-model').value = api.model || ''; document.getElementById('api-rate-limit').value = api.rateLimit || ''; document.getElementById('api-key-mask').value = api.keyMask || ''; document.getElementById('api-status').value = api.status || 'active'; document.getElementById('api-note').value = api.note || ''; openModal('api-modal');
}

async function saveApi() {
  const id = document.getElementById('api-id').value;
  const payload = { id: id || uid('api'), name: document.getElementById('api-name').value.trim(), endpoint: document.getElementById('api-endpoint').value.trim(), method: document.getElementById('api-method').value, provider: document.getElementById('api-provider').value.trim(), purpose: document.getElementById('api-purpose').value.trim(), model: document.getElementById('api-model').value.trim(), rateLimit: document.getElementById('api-rate-limit').value.trim(), keyMask: document.getElementById('api-key-mask').value.trim(), status: document.getElementById('api-status').value, note: document.getElementById('api-note').value.trim(), lastTestAt: nowISO(), failCount: 0 };
  const existing = state.store.apiRegistry.find(item => item.id === id);
  if (existing) Object.assign(existing, payload); else state.store.apiRegistry.unshift(payload);
  try {
    await dbSet('apiRegistry', existing ? existing : state.store.apiRegistry[0]);
    logAudit('api.save', `儲存 API：${payload.name}`); saveStore(); renderApis(); closeModal(document.getElementById('api-modal'));
  } catch(e){}
}

async function testApi(id) {
  const api = state.store.apiRegistry.find(item => item.id === id); if (!api) return;
  api.lastTestAt = nowISO(); const success = Math.random() > 0.1; api.status = success ? 'active' : 'paused'; if (!success) api.failCount = (api.failCount || 0) + 1;
  try {
    await dbSet('apiRegistry', api);
    logAudit('api.test', `測試 API：${api.name}（${success ? '成功' : '失敗'}）`); saveStore(); renderApis();
    await Swal.fire({ icon: success ? 'success' : 'error', title: success ? '測試成功' : '測試連線失敗', confirmButtonColor: '#f472b6' });
  } catch(e){}
}

async function deleteApi(id) { 
  const result = await Swal.fire({ title: '確定刪除 API？', icon: 'warning', showCancelButton: true, confirmButtonText: '刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('apiRegistry', id);
    state.store.apiRegistry = state.store.apiRegistry.filter(item => item.id !== id); saveStore(); renderApis(); toast('已刪除 API');
  } catch(e){}
}

function renderConfig() {
  const cfg = state.store.config;
  document.getElementById('cfg-create-user-api').value = cfg.createUserApi || ''; document.getElementById('cfg-ai-api').value = cfg.aiApi || ''; document.getElementById('cfg-storage-path').value = cfg.storagePath || ''; document.getElementById('cfg-ai-prompt').value = cfg.aiPrompt || ''; document.getElementById('cfg-mask-pii').checked = !!cfg.maskPii; document.getElementById('cfg-save-raw-prompt').checked = !!cfg.saveRawPrompt; document.getElementById('cfg-save-raw-response').checked = !!cfg.saveRawResponse; document.getElementById('cfg-enable-audit').checked = !!cfg.enableAudit; document.getElementById('cfg-enable-cute').checked = !!cfg.enableCute; document.getElementById('cfg-retention-days').value = cfg.retentionDays || 30; document.getElementById('cfg-icon-theme').value = cfg.iconTheme || ''; document.getElementById('cfg-note').value = cfg.note || '';
}

async function saveConfig() {
  state.store.config = { createUserApi: document.getElementById('cfg-create-user-api').value.trim(), aiApi: document.getElementById('cfg-ai-api').value.trim(), storagePath: document.getElementById('cfg-storage-path').value.trim(), aiPrompt: document.getElementById('cfg-ai-prompt').value.trim(), maskPii: document.getElementById('cfg-mask-pii').checked, saveRawPrompt: document.getElementById('cfg-save-raw-prompt').checked, saveRawResponse: document.getElementById('cfg-save-raw-response').checked, enableAudit: document.getElementById('cfg-enable-audit').checked, enableCute: document.getElementById('cfg-enable-cute').checked, retentionDays: Number(document.getElementById('cfg-retention-days').value || 30), iconTheme: document.getElementById('cfg-icon-theme').value.trim(), note: document.getElementById('cfg-note').value.trim() };
  state.aiMask = state.store.config.maskPii; state.cuteMode = state.store.config.enableCute; applyCuteMode();
  try {
    await dbSysSet('config', state.store.config);
    logAudit('config.save', '更新設定'); saveStore(); renderAiLogs(); toast('全域設定已安全儲存');
  } catch(e){}
}

function renderAudit() {
  const al = document.getElementById('audit-list');
  if(state.store.auditLogs.length) {
    al.innerHTML = state.store.auditLogs.map(log => `<div class="audit-row"><div><h4>${escapeHtml(log.action)}</h4><div class="muted tiny">${escapeHtml(log.actor)} ・ ${formatDate(log.createdAt)}</div><div class="tiny">${escapeHtml(log.detail)}</div></div>${hasPermission('logs.delete') ? `<div class="inline-actions"><button class="btn btn-danger-soft" data-audit-delete="${log.id}"><i class="fa-solid fa-trash"></i></button></div>` : ''}</div>`).join('');
    document.querySelectorAll('[data-audit-delete]').forEach(btn => btn.addEventListener('click', () => deleteAudit(btn.dataset.auditDelete)));
  } else { al.innerHTML = generateEmptyState('fa-solid fa-clipboard-check', '無紀錄', '目前查無稽核紀錄'); }
}

async function deleteAudit(id) { 
  const result = await Swal.fire({ title: '確定刪除單筆日誌？', icon: 'warning', showCancelButton: true, confirmButtonText: '刪除', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;
  try {
    await dbDelete('auditLogs', id);
    state.store.auditLogs = state.store.auditLogs.filter(log => log.id !== id); saveStore(); renderAudit(); toast('刪除成功'); 
  } catch(e){}
}

async function clearOldAudit() {
  const result = await Swal.fire({ title: '清理舊日誌？', text: '系統將自動清除過期歷史檔案，釋放空間', icon: 'warning', showCancelButton: true, confirmButtonText: '執行清檔', confirmButtonColor: '#f43f5e' });
  if (!result.isConfirmed) return;

  const cutoff = Date.now() - (state.store.config.retentionDays || 30) * 86400000;
  const toDelete = state.store.auditLogs.filter(log => new Date(log.createdAt).getTime() < cutoff);
  state.store.auditLogs = state.store.auditLogs.filter(log => new Date(log.createdAt).getTime() >= cutoff);
  
  const batch = writeBatch(db);
  toDelete.forEach(log => batch.delete(doc(db, 'auditLogs', log.id)));
  try {
    await batch.commit();
    saveStore(); renderAudit(); toast(`已成功清理 ${toDelete.length} 筆空間`);
  } catch(e){ showError('清理失敗', '', e); }
}

function toast(title, icon = 'success') { Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1800, timerProgressBar: true, icon, title, background: 'var(--panel-solid)', color: 'var(--text)' }); }

document.addEventListener('DOMContentLoaded', init);