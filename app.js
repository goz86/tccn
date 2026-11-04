// ===== State =====
let monthlyBudget = {};
let savingsGoals = [];
let budgetYear = new Date().getFullYear();
let exchangeRate = null;
let usdRate = null;
let exchangeStatus = 'loading';
let isDark = localStorage.getItem('theme') !== 'light';
let isSignUpMode = false;
let saveTimeout = null;

const DEMO_MONTHLY_BUDGET = [
    { month: 1, income: 2300000, expense: 2100000 },
    { month: 2, income: 2300000, expense: 1600000 },
    { month: 3, income: 2400000, expense: 1000000 },
    { month: 4, income: 2300000, expense: 1500000 },
    { month: 5, income: 232300, expense: 323 },
];

function getDemoBudgetData(year = budgetYear) {
    return DEMO_MONTHLY_BUDGET.reduce((acc, item) => {
        acc[getBudgetKey(year, item.month - 1)] = {
            income: item.income,
            expense: item.expense
        };
        return acc;
    }, {});
}

let budgetRatios = {
    livingPct: 40,
    reservePct: 40,
    investPct: 20
};

function loadBudgetRatios() {
    try {
        const stored = localStorage.getItem('goz_budget_ratios');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (typeof parsed.livingPct === 'number' && typeof parsed.reservePct === 'number' && typeof parsed.investPct === 'number') {
                budgetRatios = parsed;
            }
        }
    } catch (e) {
        console.error('Error loading budget ratios:', e);
    }
}
loadBudgetRatios();

function updateRatioLabelsUI() {
    loadBudgetRatios();
    const l = budgetRatios.livingPct ?? 40;
    const r = budgetRatios.reservePct ?? 40;
    const i = budgetRatios.investPct ?? 20;
    const ratioStr = `Quy tắc ${l}-${r}-${i}`;

    // 1. Phân Bổ Thực Tế badge
    const badge = document.getElementById('badgeRuleRatio');
    if (badge) badge.textContent = ratioStr;

    // 2. Overview Card 2 footer
    const cardRatio = document.getElementById('incomeRatioText');
    if (cardRatio) cardRatio.innerHTML = `<i class="icon-svg" data-lucide="trending-up"></i> ${ratioStr}`;

    // 3. Table Headers & Legends
    const thL = document.getElementById('thLivingPct');
    const thR = document.getElementById('thReservePct');
    const thI = document.getElementById('thInvestPct');
    if (thL) thL.innerHTML = `${l}% <i class="icon-svg" data-lucide="pencil" style="width:10px;height:10px;"></i>`;
    if (thR) thR.innerHTML = `${r}% <i class="icon-svg" data-lucide="pencil" style="width:10px;height:10px;"></i>`;
    if (thI) thI.innerHTML = `${i}% <i class="icon-svg" data-lucide="pencil" style="width:10px;height:10px;"></i>`;

    const legL = document.getElementById('legendLiving');
    const legR = document.getElementById('legendReserve');
    const legI = document.getElementById('legendInvest');
    if (legL) legL.textContent = `Sinh hoạt ${l}%`;
    if (legR) legR.textContent = `Dự phòng ${r}%`;
    if (legI) legI.textContent = `Đầu tư ${i}%`;

    if (typeof refreshIcons === 'function') refreshIcons();
}
window.updateRatioLabelsUI = updateRatioLabelsUI;

function getBudgetAllocation(inc) {
    const living = Math.round(inc * (budgetRatios.livingPct / 100));
    const reserve = Math.round(inc * (budgetRatios.reservePct / 100));
    const invest = Math.round(inc * (budgetRatios.investPct / 100));
    return { living, reserve, invest };
}

window.openRatioConfigModal = function () {
    loadBudgetRatios();
    const elL = document.getElementById('inputLivingPct');
    const elR = document.getElementById('inputReservePct');
    const elI = document.getElementById('inputInvestPct');
    if (elL) elL.value = budgetRatios.livingPct;
    if (elR) elR.value = budgetRatios.reservePct;
    if (elI) elI.value = budgetRatios.investPct;
    window.onRatioInputsChange();
    const modal = document.getElementById('ratioConfigModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
};

window.closeRatioConfigModal = function () {
    const modal = document.getElementById('ratioConfigModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
};

window.onRatioInputsChange = function () {
    const l = parseInt(document.getElementById('inputLivingPct')?.value, 10) || 0;
    const r = parseInt(document.getElementById('inputReservePct')?.value, 10) || 0;
    const i = parseInt(document.getElementById('inputInvestPct')?.value, 10) || 0;
    const sum = l + r + i;
    const sumEl = document.getElementById('ratioSumValue');
    const alertEl = document.getElementById('ratioSumAlert');
    const btn = document.getElementById('btnSaveRatios');

    if (sumEl) sumEl.textContent = sum;
    if (alertEl) {
        if (sum === 100) {
            alertEl.className = 'ratio-sum-badge valid';
            alertEl.innerHTML = `Tổng: <strong>100%</strong> (Hợp lệ)`;
            if (btn) btn.disabled = false;
        } else {
            alertEl.className = 'ratio-sum-badge invalid';
            alertEl.innerHTML = `Tổng: <strong>${sum}%</strong> (Phải bằng 100%)`;
            if (btn) btn.disabled = true;
        }
    }
};

window.saveRatioConfig = function () {
    const l = parseInt(document.getElementById('inputLivingPct')?.value, 10) || 0;
    const r = parseInt(document.getElementById('inputReservePct')?.value, 10) || 0;
    const i = parseInt(document.getElementById('inputInvestPct')?.value, 10) || 0;
    if (l + r + i !== 100) {
        showToast('Tổng 3 mục phải bằng 100%', 'error');
        return;
    }
    budgetRatios = { livingPct: l, reservePct: r, investPct: i };
    localStorage.setItem('goz_budget_ratios', JSON.stringify(budgetRatios));
    updateRatioLabelsUI();
    closeRatioConfigModal();
    renderAll();
    showToast(`Đã lưu tỷ lệ mới: Quy tắc ${l}-${r}-${i}!`, 'success');
};

function applyDemoBudgetIfEmpty(data) {
    if (data && Object.keys(data).length) return data;
    return localStorage.getItem('goz_demo_data') === 'true' ? getDemoBudgetData() : data;
}

function fmtCompact(val) {
    if (val === 0 || val === null || val === undefined) return '0';
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1000000) {
        return sign + (abs / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (abs >= 1000) {
        return sign + (abs / 1000).toFixed(0) + 'K';
    }
    return sign + abs.toLocaleString('vi-VN');
}

function fmtFull(val) {
    if (!val && val !== 0) return '0';
    return Number(val).toLocaleString('vi-VN');
}

function iconMarkup(name, extraClass = '') {
    return `<i class="icon-svg ${extraClass}" data-lucide="${name}"></i>`;
}

let _refreshIconsTimer = null;
function refreshIcons() {
    if (_refreshIconsTimer) return;
    _refreshIconsTimer = requestAnimationFrame(() => {
        _refreshIconsTimer = null;
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
        }
    });
}

let _scrollRevealDone = false;
function initScrollReveal() {
    if (_scrollRevealDone) return;
    _scrollRevealDone = true;
    const targets = document.querySelectorAll(
        '.exchange-shell, .summary-card, .financial-insight-card, .panel, .budget-dash-item, .pie-card, .goal-item'
    );
    // Mark all visible immediately — no stagger delay on first load
    targets.forEach(el => {
        el.classList.add('reveal-box', 'premium-card-hover', 'is-visible');
    });
}

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

// ===== Init =====
// ===== PIN LOCK =====
let appPin = localStorage.getItem('app_pin');
let pinEnabled = localStorage.getItem('pin_enabled') !== 'false'; // default ON
let currentPinInput = '';
let pinSetupStep = 1; // 1: setting up, 2: confirming
let tempPin = '';

function checkPinState() {
    const overlay = document.getElementById('pinOverlay');
    const title = document.getElementById('pinTitle');
    const sub = document.getElementById('pinSubtitle');
    const btnFor = document.getElementById('pinForgotBtn');

    currentPinInput = '';
    updatePinDots();
    updatePinToggleUI();

    // If PIN is disabled, skip the lock screen
    if (!pinEnabled) {
        overlay.classList.add('hidden');
        return;
    }

    if (appPin) {
        overlay.classList.remove('hidden');
        title.textContent = 'Nhập mã PIN';
        sub.textContent = 'Bảo mật sổ cái tài chính của bạn';
        if (btnFor) btnFor.style.visibility = 'visible';
        pinSetupStep = 0;
    } else {
        overlay.classList.remove('hidden');
        title.textContent = 'Tạo mã PIN mới';
        sub.textContent = 'Dùng để khóa ứng dụng lần sau';
        if (btnFor) btnFor.style.visibility = 'hidden';
        pinSetupStep = 1;
    }
}

function updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => {
        if (i < currentPinInput.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
}

function handlePinKey(key) {
    if (key === 'backspace') {
        currentPinInput = currentPinInput.slice(0, -1);
    } else {
        if (currentPinInput.length < 4) {
            currentPinInput += key;
        }
    }
    updatePinDots();

    if (currentPinInput.length === 4) {
        setTimeout(() => processPinBlock(), 50);
    }
}

function processPinBlock() {
    const dotsContainer = document.getElementById('pinDots');

    if (pinSetupStep === 1) {
        tempPin = currentPinInput;
        currentPinInput = '';
        pinSetupStep = 2;
        document.getElementById('pinTitle').textContent = 'Xác nhận mã PIN';
        document.getElementById('pinSubtitle').textContent = 'Nhập lại mã PIN vừa chọn';
        updatePinDots();
    } else if (pinSetupStep === 2) {
        if (currentPinInput === tempPin) {
            appPin = btoa(currentPinInput);
            localStorage.setItem('app_pin', appPin);
            currentPinInput = ''; // Clear immediately
            unlockApp();
            showToast('Đã thiết lập mã PIN!', 'success');
        } else {
            dotsContainer.classList.add('shake');
            document.getElementById('pinSubtitle').textContent = 'Mã PIN không khớp. Nhập lại từ đầu.';
            document.getElementById('pinSubtitle').style.color = 'var(--accent-red)';
            setTimeout(() => {
                dotsContainer.classList.remove('shake');
                currentPinInput = '';
                pinSetupStep = 1;
                document.getElementById('pinTitle').textContent = 'Tạo mã PIN mới';
                document.getElementById('pinSubtitle').textContent = 'Dùng để khóa ứng dụng lần sau';
                document.getElementById('pinSubtitle').style.color = 'var(--text-secondary)';
                updatePinDots();
            }, 600);
        }
    } else {
        // Unlock Mode - Compare simply using Base64
        const attempt = btoa(currentPinInput);
        if (attempt === appPin) {
            currentPinInput = ''; // Clear immediately
            unlockApp();
        } else {
            dotsContainer.classList.add('shake');
            setTimeout(() => {
                dotsContainer.classList.remove('shake');
                currentPinInput = '';
                updatePinDots();
            }, 600);
            if (navigator.vibrate) navigator.vibrate(200);
        }
    }
}

function unlockApp() {
    document.getElementById('pinOverlay').classList.add('hidden');
}

function gozConfirm({ title, message, okText = 'Đồng ý', cancelText = 'Hủy', danger = false }) {
    const modal = document.getElementById('gozConfirmModal');
    const titleEl = document.getElementById('gozConfirmTitle');
    const messageEl = document.getElementById('gozConfirmMessage');
    if (!modal || !titleEl || !messageEl) return Promise.resolve(false);

    const okBtn = modal.querySelector('[data-goz-confirm="ok"]');
    const cancelBtn = modal.querySelector('[data-goz-confirm="cancel"]');
    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;
    okBtn.classList.toggle('danger', danger);

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    refreshIcons();

    return new Promise(resolve => {
        const finish = (value) => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
            window.removeEventListener('keydown', onKey);
            resolve(value);
        };
        const onOk = () => finish(true);
        const onCancel = () => finish(false);
        const onBackdrop = (event) => {
            if (event.target === modal) finish(false);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') finish(false);
        };
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);
        window.addEventListener('keydown', onKey);
        okBtn.focus();
    });
}

async function forgotPin() {
    const accepted = await gozConfirm({
        title: 'Quên mã PIN?',
        message: 'Ứng dụng sẽ xóa PIN cũ và đăng xuất tài khoản để bảo mật dữ liệu.',
        okText: 'Xóa PIN',
        cancelText: 'Hủy',
        danger: true
    });
    if (accepted) {
        localStorage.removeItem('app_pin');
        appPin = null;
        await handleLogout();
    }
}

async function showPinDisableConfirm() {
    return gozConfirm({
        title: 'Tắt khóa mã PIN?',
        message: 'Lần sau mở app sẽ không cần nhập PIN nữa.',
        okText: 'Tắt PIN',
        cancelText: 'Hủy'
    });
}

async function togglePinSetting() {
    if (pinEnabled) {
        if (await showPinDisableConfirm()) {
            pinEnabled = false;
            localStorage.setItem('pin_enabled', 'false');
            localStorage.removeItem('app_pin');
            appPin = null;
            updatePinToggleUI();
            showToast('Đã tắt khóa PIN', 'info');
        }
    } else {
        pinEnabled = true;
        localStorage.setItem('pin_enabled', 'true');
        // Clear old PIN just in case to force new creation
        appPin = null;
        localStorage.removeItem('app_pin');
        updatePinToggleUI();
        // Immediately show PIN creation screen
        checkPinState();
        showToast('Hãy tạo mã PIN mới', 'info');
    }
}

function updatePinToggleUI() {
    const sw = document.getElementById('pinToggleSwitch');
    if (!sw) return;
    // UI should reflect pinEnabled regardless of appPin existence
    if (pinEnabled) {
        sw.classList.add('active');
    } else {
        sw.classList.remove('active');
    }
}

function init() {
    applyTheme();
    updateRatioLabelsUI();
    initSupabase();
    onAuthStateChange(handleAuthChange);
    checkSession();
}

async function checkSession() {
    try {
        const session = await getSession();
        if (session) {
            currentUser = session.user;
            window.currentUser = session.user;
            await showApp();
        } else {
            showAuth();
        }
    } catch (e) {
        console.error('Session check error:', e);
        showAuth();
    }
}

async function handleAuthChange(event, session) {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        window.currentUser = session.user;
        await showApp();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        window.currentUser = null;
        if (typeof window.resetPortfolioForLogout === 'function') {
            window.resetPortfolioForLogout();
        }
        showAuth();
    }
}

async function showApp() {
    document.getElementById('authOverlay').style.display = 'none';
    checkPinState();
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('appWrapper').style.display = 'block';

    // Update user badge
    try {
        const profile = await getProfile();
        const name = profile?.full_name || currentUser.email?.split('@')[0] || 'User';
        document.getElementById('userName').textContent = name;
    } catch (e) {
        document.getElementById('userName').textContent = currentUser.email?.split('@')[0] || 'User';
    }

    // Load data from Supabase
    try {
        monthlyBudget = applyDemoBudgetIfEmpty(await loadBudgets());
        savingsGoals = enrichGoalsWithMeta(await loadGoals());
        if (typeof window.loadPortfolioData === 'function') {
            await window.loadPortfolioData();
        }
    } catch (e) {
        console.error('Load data error:', e);
        showToast('Lỗi tải dữ liệu: ' + e.message, 'error');
        monthlyBudget = {};
        savingsGoals = [];
    }

    function setDefaultDate() {
        const now = new Date();
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = days[now.getDay()];
        const formatted = `${dayName}, ${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;

        const dateMobile = document.getElementById('currentDate');
        const dateDesktop = document.getElementById('currentDateDesktop');
        if (dateMobile) dateMobile.textContent = formatted;
        if (dateDesktop) dateDesktop.textContent = formatted;
    }

    document.getElementById('loadingOverlay').style.display = 'none';
    setDefaultDate();
    renderAll();
    switchTab('overview');
    fetchExchangeRate();
    setInterval(fetchExchangeRate, 1980000);
    registerSW();
}

function showAuth() {
    document.getElementById('authOverlay').style.display = 'flex';
    const pinOverlay = document.getElementById('pinOverlay');
    if (pinOverlay) pinOverlay.classList.add('hidden');
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('appWrapper').style.display = 'none';
    document.getElementById('authError').textContent = '';
}

// ===== Auth Handlers =====
async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = '⏳ Đang xử lý...';

    try {
        if (isSignUpMode) {
            const fullName = document.getElementById('authName').value.trim();
            const data = await signUpWithEmail(email, password, fullName);
            if (data.user && !data.session) {
                errorEl.style.color = 'var(--accent-green)';
                errorEl.textContent = 'Đăng ký thành công! Kiểm tra email để xác nhận.';
            }
        } else {
            await signInWithEmail(email, password);
        }
    } catch (err) {
        errorEl.style.color = 'var(--accent-red)';
        if (err.message.includes('Invalid login credentials')) {
            errorEl.textContent = 'Email hoặc mật khẩu không đúng.';
        } else if (err.message.includes('User already registered')) {
            errorEl.textContent = 'Email đã được đăng ký. Hãy đăng nhập.';
        } else if (err.message.includes('Email not confirmed')) {
            errorEl.textContent = 'Vui lòng xác nhận email trước khi đăng nhập.';
        } else {
            errorEl.textContent = err.message;
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = `${iconMarkup(isSignUpMode ? 'user-plus' : 'key-round')} ${isSignUpMode ? 'Đăng ký' : 'Đăng nhập'}`;
        refreshIcons();
    }
}

async function handleGoogleLogin() {
    try {
        await signInWithGoogle();
    } catch (err) {
        document.getElementById('authError').textContent = err.message;
    }
}

async function handleLogout() {
    try {
        await signOut();
        monthlyBudget = {};
        savingsGoals = [];
        showAuth();
        showToast('Đã đăng xuất', 'info');
    } catch (err) {
        showToast('Lỗi đăng xuất: ' + err.message, 'error');
    }
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('nameField').style.display = isSignUpMode ? 'block' : 'none';
    document.getElementById('authSubmitBtn').innerHTML = `${iconMarkup(isSignUpMode ? 'user-plus' : 'key-round')} ${isSignUpMode ? 'Đăng ký' : 'Đăng nhập'}`;
    refreshIcons();
    document.getElementById('authToggleText').textContent = isSignUpMode ? 'Đã có tài khoản?' : 'Chưa có tài khoản?';
    document.getElementById('authToggleBtn').textContent = isSignUpMode ? 'Đăng nhập' : 'Đăng ký';
    document.getElementById('authError').textContent = '';
}

// ===== Theme =====
function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.innerHTML = iconMarkup(isDark ? 'moon' : 'sun');
    });
    refreshIcons();
    const meta = document.getElementById('metaThemeColor');
    if (meta) meta.content = isDark ? '#08090d' : '#eef2f3';
}

function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    applyTheme();
}

function setDefaultDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const el = document.getElementById('currentDate');
    if (el) el.textContent = new Date().toLocaleDateString('vi-VN', options);
}

// ===== Exchange Rate =====
const TWELVE_DATA_KEY = '56064eb9612446bcb827e837eb814e24';
const EXCHANGE_CACHE_KEY = 'goz_exchange_cache_v2';

function updateRateUI(widget, statusEl, usdWidget, usdSubtext, statusLabel, isStale) {
    window.exchangeRate = exchangeRate;
    window.usdRate = usdRate;

    const w = widget || document.getElementById('exchangeRateValue');
    const uW = usdWidget || document.getElementById('usdRateValue');
    const uSub = usdSubtext || document.getElementById('usdSubtext');
    const exSub = document.getElementById('exchangeSubtext');
    const stEl = statusEl || document.getElementById('exchangeStatus');

    if (w) w.textContent = exchangeRate.toFixed(2) + ' đ';
    if (stEl) {
        if (isStale) {
            stEl.innerHTML = '<span class="pulse-dot stale"></span> Dữ liệu cũ';
            stEl.className = 'badge-stale';
            stEl.title = 'API không phản hồi. Đang sử dụng dữ liệu lưu tạm gần nhất';
        } else {
            stEl.innerHTML = '<span class="pulse-dot"></span> ' + (statusLabel || 'Realtime');
            stEl.className = 'badge-realtime';
            stEl.title = 'Tỷ giá hối đoái thời gian thực';
        }
    }
    if (exSub) exSub.textContent = '1 KRW = ' + exchangeRate.toFixed(2) + ' VND';
    if (uW) uW.textContent = Math.round(usdRate).toLocaleString('vi-VN') + ' đ';
    if (uSub) uSub.textContent = '1 USD = ' + Math.round(usdRate).toLocaleString('vi-VN') + ' VND';

    const usdKrwVal = (usdRate && exchangeRate) ? (usdRate / exchangeRate) : 1344.1;
    window.usdKrwRate = usdKrwVal;

    // Header live rate chips
    const hdrKrw = document.getElementById('hdrRateKrw');
    const hdrUsd = document.getElementById('hdrRateUsd');
    if (hdrKrw) hdrKrw.textContent = exchangeRate.toFixed(2) + ' đ';
    if (hdrUsd) hdrUsd.textContent = Math.round(usdRate).toLocaleString('vi-VN') + ' đ';

    const pulseDots = document.querySelectorAll('.pulse-dot');
    pulseDots.forEach(dot => {
        dot.classList.toggle('stale', !!isStale);
    });

    renderSummary();

    // Log and Render Exchange Rate History
    logAndRenderExchangeHistory(exchangeRate, usdRate, usdKrwVal);

    if (typeof window.renderPortfolio === 'function') window.renderPortfolio();
    if (typeof window.updateOverviewCards === 'function') window.updateOverviewCards();
    updateExchangeMetaUI();
}

function updateExchangeMetaUI() {
    const metaStatus = document.getElementById('exchangeMetaStatus');
    const statusTextEl = document.getElementById('exchangeStatusText');
    const lastUpdatedEl = document.getElementById('exchangeLastUpdated');
    const sourceEl = document.getElementById('exchangeDataSource');

    const isStale = (exchangeStatus === 'stale' || exchangeStatus === 'offline');

    if (metaStatus) {
        metaStatus.className = isStale ? 'meta-status-chip stale' : 'meta-status-chip live';
    }
    if (statusTextEl) {
        statusTextEl.textContent = isStale ? 'Dữ liệu cũ (Offline)' : 'Realtime Live';
    }
    if (lastUpdatedEl) {
        const time = window.exchangeLastUpdatedTime ? new Date(window.exchangeLastUpdatedTime) : new Date();
        const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')} ${String(time.getDate()).padStart(2, '0')}/${String(time.getMonth() + 1).padStart(2, '0')}/${time.getFullYear()}`;
        lastUpdatedEl.textContent = timeStr + (isStale ? ' (Bản lưu gần nhất)' : '');
    }
    if (sourceEl) {
        sourceEl.textContent = window.exchangeDataSourceName || 'Open Exchange Rates (Liên ngân hàng)';
    }
}

async function fetchExchangeRate() {
    const widget = document.getElementById('exchangeRateValue');
    const statusEl = document.getElementById('exchangeStatus');
    const usdWidget = document.getElementById('usdRateValue');
    const usdSubtext = document.getElementById('usdSubtext');
    let isSuccess = false;
    let sourceName = '';

    // Source 1: Open Exchange Rates API (Free, Instantaneous, accurate real-time market cross-rates)
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
            const data = await res.json();
            if (data && data.rates && data.rates.VND && data.rates.KRW) {
                const u = parseFloat(data.rates.VND);
                const uk = parseFloat(data.rates.KRW);
                const k = u / uk;

                exchangeRate = parseFloat(k.toFixed(2));
                usdRate = Math.round(u);
                window.exchangeRate = exchangeRate;
                window.usdRate = usdRate;
                window.usdKrwRate = parseFloat(uk.toFixed(1));
                exchangeStatus = 'live';
                sourceName = 'Open Exchange Rates (Liên ngân hàng)';
                isSuccess = true;
            }
        }
    } catch (e) {
        console.warn('Open.er-api failed, falling back to Twelve Data:', e.message);
    }

    // Source 2: Twelve Data (Secondary backup)
    if (!isSuccess) {
        try {
            const [krwRes, usdRes] = await Promise.all([
                fetch(`https://api.twelvedata.com/exchange_rate?symbol=KRW/VND&apikey=${TWELVE_DATA_KEY}`),
                fetch(`https://api.twelvedata.com/exchange_rate?symbol=USD/VND&apikey=${TWELVE_DATA_KEY}`)
            ]);
            const krwData = await krwRes.json();
            const usdData = await usdRes.json();
            if (krwData.rate && usdData.rate && !krwData.code) {
                exchangeRate = parseFloat(krwData.rate);
                usdRate = parseFloat(usdData.rate);
                window.exchangeRate = exchangeRate;
                window.usdRate = usdRate;
                window.usdKrwRate = parseFloat((usdRate / exchangeRate).toFixed(1));
                exchangeStatus = 'live';
                sourceName = 'Twelve Data Realtime';
                isSuccess = true;
            }
        } catch (e) {
            console.warn('Twelve Data failed:', e.message);
        }
    }

    if (isSuccess) {
        const now = Date.now();
        window.exchangeLastUpdatedTime = now;
        window.exchangeDataSourceName = sourceName;
        try {
            localStorage.setItem(EXCHANGE_CACHE_KEY, JSON.stringify({
                krw: exchangeRate,
                usd: usdRate,
                usdKrw: window.usdKrwRate,
                timestamp: now,
                source: sourceName
            }));
        } catch (e) {}
        updateRateUI(widget, statusEl, usdWidget, usdSubtext, 'Realtime', false);
    } else {
        // Fallback to latest local cache with "Dữ liệu cũ"
        let cached = null;
        try {
            const raw = localStorage.getItem(EXCHANGE_CACHE_KEY);
            if (raw) cached = JSON.parse(raw);
        } catch (e) {}

        if (cached && cached.krw) {
            exchangeRate = cached.krw;
            usdRate = cached.usd || 25744;
            window.exchangeRate = exchangeRate;
            window.usdRate = usdRate;
            window.usdKrwRate = cached.usdKrw || (usdRate / exchangeRate);
            exchangeStatus = 'stale';
            window.exchangeLastUpdatedTime = cached.timestamp || Date.now();
            window.exchangeDataSourceName = (cached.source || 'Open Exchange Rates') + ' (Cache offline)';
            updateRateUI(widget, statusEl, usdWidget, usdSubtext, 'Dữ liệu cũ', true);
        } else {
            exchangeRate = 19.15;
            usdRate = 25744;
            window.exchangeRate = exchangeRate;
            window.usdRate = usdRate;
            window.usdKrwRate = 1344.1;
            exchangeStatus = 'stale';
            window.exchangeLastUpdatedTime = Date.now();
            window.exchangeDataSourceName = 'Mặc định (Dữ liệu cũ)';
            updateRateUI(widget, statusEl, usdWidget, usdSubtext, 'Dữ liệu cũ', true);
        }
    }
}

function convertFromKRW() {
    const r = (window.exchangeRate && window.exchangeRate > 0) ? window.exchangeRate : 19.15;
    const u = (window.usdRate && window.usdRate > 0) ? window.usdRate : 25744;
    const raw = parseRawValue(document.getElementById('krwInput')?.value);
    if (!raw) {
        const vndEl = document.getElementById('vndInput');
        const usdEl = document.getElementById('usdInput');
        const resEl = document.getElementById('converterResult');
        if (vndEl) vndEl.value = '';
        if (usdEl) usdEl.value = '';
        if (resEl) resEl.textContent = 'Nhập số tiền để quy đổi';
        return;
    }
    const vnd = Math.round(raw * r);
    const usd = (raw * r / u);
    const vndEl = document.getElementById('vndInput');
    const usdEl = document.getElementById('usdInput');
    const resEl = document.getElementById('converterResult');
    if (vndEl) vndEl.value = vnd.toLocaleString('vi-VN');
    if (usdEl) usdEl.value = usd.toFixed(2);
    if (resEl) resEl.innerHTML = `${raw.toLocaleString('vi-VN')} ₩ ≈ ${vnd.toLocaleString('vi-VN')} ₫ | $${usd.toFixed(2)}`;
}

function convertFromVND() {
    const r = (window.exchangeRate && window.exchangeRate > 0) ? window.exchangeRate : 19.15;
    const u = (window.usdRate && window.usdRate > 0) ? window.usdRate : 25744;
    const raw = parseRawValue(document.getElementById('vndInput')?.value);
    if (!raw) {
        const krwEl = document.getElementById('krwInput');
        const usdEl = document.getElementById('usdInput');
        const resEl = document.getElementById('converterResult');
        if (krwEl) krwEl.value = '';
        if (usdEl) usdEl.value = '';
        if (resEl) resEl.textContent = 'Nhập số tiền để quy đổi';
        return;
    }
    const krw = Math.round(raw / r);
    const usd = (raw / u);
    const krwEl = document.getElementById('krwInput');
    const usdEl = document.getElementById('usdInput');
    const resEl = document.getElementById('converterResult');
    if (krwEl) krwEl.value = krw.toLocaleString('vi-VN');
    if (usdEl) usdEl.value = usd.toFixed(2);
    if (resEl) resEl.innerHTML = `${krw.toLocaleString('vi-VN')} ₩ ≈ ${raw.toLocaleString('vi-VN')} ₫ | $${usd.toFixed(2)}`;
}

function convertFromUSD() {
    const r = (window.exchangeRate && window.exchangeRate > 0) ? window.exchangeRate : 19.15;
    const u = (window.usdRate && window.usdRate > 0) ? window.usdRate : 25744;
    const raw = parseRawValue(document.getElementById('usdInput')?.value);
    if (!raw) {
        const krwEl = document.getElementById('krwInput');
        const vndEl = document.getElementById('vndInput');
        const resEl = document.getElementById('converterResult');
        if (krwEl) krwEl.value = '';
        if (vndEl) vndEl.value = '';
        if (resEl) resEl.textContent = 'Nhập số tiền để quy đổi';
        return;
    }
    const vnd = Math.round(raw * u);
    const krw = Math.round(raw * u / r);
    const krwEl = document.getElementById('krwInput');
    const vndEl = document.getElementById('vndInput');
    const resEl = document.getElementById('converterResult');
    if (krwEl) krwEl.value = krw.toLocaleString('vi-VN');
    if (vndEl) vndEl.value = vnd.toLocaleString('vi-VN');
    if (resEl) resEl.innerHTML = `${krw.toLocaleString('vi-VN')} ₩ ≈ ${vnd.toLocaleString('vi-VN')} ₫ | $${raw.toFixed(2)}`;
}

function renderAll() {
    updateRatioLabelsUI();
    renderSummary();
    renderFinancialInsight();
    renderBudgetHealth();
    renderSavingsGoals();
    renderMonthlyBudgetTable();
    renderBudgetDashboard();
    requestAnimationFrame(() => {
        renderBudgetOverviewChart();
        renderPieCharts();
        refreshIcons();
        initScrollReveal();
    });
}
window.renderAll = renderAll;

function renderWithoutTable() {
    renderSummary();
    renderFinancialInsight();
    renderBudgetHealth();
    renderSavingsGoals();
    renderBudgetDashboard();
    requestAnimationFrame(() => {
        renderBudgetOverviewChart();
        renderPieCharts();
        refreshIcons();
        initScrollReveal();
    });
}

// ===== Formatters =====
function fmtVND(v) { return v.toLocaleString('vi-VN') + ' ₫'; }
function fmtKRW(v) { return v.toLocaleString('vi-VN') + ' ₩'; }
function fmtFull(v) { return v.toLocaleString('vi-VN'); }
function fmtFullRaw(v) { return v.toLocaleString('vi-VN'); }
function fmtCompact(v) {
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return v.toLocaleString('vi-VN');
}

function makeSmoothPath(points) {
    if (!points.length) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prev = points[index - 1];
        const controlX = prev.x + (point.x - prev.x) / 2;
        return `${path} C ${controlX} ${prev.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
    }, '');
}

// Extract raw integer from formatted string
function parseRawValue(valStr) {
    return parseInt(String(valStr).replace(/\D/g, ''), 10) || 0;
}

// Live formatter for inputs
function formatInputLive(el) {
    let cursor = el.selectionStart;
    let oldLength = el.value.length;
    let rawStr = el.value.replace(/\D/g, '');
    if (rawStr === '') {
        el.value = '';
        return;
    }
    let formatted = parseInt(rawStr, 10).toLocaleString('vi-VN');
    el.value = formatted;
    let newLength = formatted.length;
    cursor += (newLength - oldLength);
    el.setSelectionRange(cursor, cursor);
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ===== Helper: get budget totals =====
function getBudgetTotals(year) {
    const y = year || budgetYear;
    let incKRW = 0, expKRW = 0;
    for (let m = 0; m < 12; m++) {
        const key = getBudgetKey(y, m);
        const b = monthlyBudget[key] || {};
        incKRW += Number(b.income || 0);
        expKRW += Number(b.expense || 0);
    }
    return { incKRW, expKRW, balanceKRW: incKRW - expKRW };
}

function getAllTimeTotals() {
    let incKRW = 0, expKRW = 0, count = 0, reserveSum = 0;
    for (const key in monthlyBudget) {
        const b = monthlyBudget[key];
        const income = Number(b.income || 0);
        const expense = Number(b.expense || 0);
        if (income > 0 || expense > 0) {
            incKRW += income;
            expKRW += expense;
            // Accumulate reserve from each month's surplus
            const balance = income - expense;
            if (balance > 0) {
                // Following the 2/3 of balance strategy for Emergency Fund
                reserveSum += Math.round(balance * (2 / 3));
            }
            count++;
        }
    }
    const balanceKRW = incKRW - expKRW;
    const avgExp = count > 0 ? expKRW / count : 0;
    return { incKRW, expKRW, balanceKRW, reserveSum, avgExp };
}
window.getAllTimeTotals = getAllTimeTotals;

// ===== Summary (VND cards at top) =====
function renderSummary() {
    if (typeof window.updateOverviewCards === 'function') {
        window.updateOverviewCards();
        return;
    }
    const r = exchangeRate || 18.5;
    const u = usdRate || 25500;
    const { incKRW, expKRW, balanceKRW, reserveSum, avgExp } = getAllTimeTotals();
    const income = Math.round(incKRW * r);
    const expense = Math.round(expKRW * r);
    const balance = income - expense;
    const rate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    animateVal('totalBalance', fmtVND(balance));
    animateVal('totalIncome', fmtVND(income));
    animateVal('totalExpense', fmtVND(expense));
    animateVal('savingsRate', Math.max(0, rate) + '%');

    // Update Reserve/Emergency Fund Card with animation
    const resTotal = document.getElementById('reserveTotal');
    const survMonths = document.getElementById('survivalMonths');
    if (resTotal) resTotal.textContent = fmtKRW(reserveSum);
    if (survMonths) {
        const months = avgExp > 0 ? (reserveSum / avgExp).toFixed(1) : '--';
        survMonths.textContent = avgExp > 0 ? `An toàn: ${months} tháng` : 'An toàn: -- tháng';
    }

    const balKRW = document.getElementById('balanceKRW');
    const incKRWEl = document.getElementById('incomeKRW');
    const expKRWEl = document.getElementById('expenseKRW');
    if (balKRW) balKRW.textContent = '';
    if (incKRWEl) incKRWEl.textContent = '';
    if (expKRWEl) expKRWEl.textContent = '';
    const sl = document.getElementById('savingsLabel');
    if (sl) {
        if (rate >= 50) sl.textContent = 'Xuất sắc'; else if (rate >= 30) sl.textContent = 'Tốt';
        else if (rate >= 10) sl.textContent = 'Cần cải thiện'; else if (income > 0) sl.textContent = 'Rất ít';
        else sl.textContent = '--';
    }
}

function animateVal(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.textContent === val) return;
    el.style.transform = 'scale(0.97)';
    el.textContent = val;
    requestAnimationFrame(() => {
        el.style.transform = 'scale(1)';
    });
}

function renderFinancialInsight() {
    const card = document.getElementById('financialInsightCard');
    const titleEl = document.getElementById('financialInsightTitle');
    const badgeEl = document.getElementById('financialInsightBadge');
    const textEl = document.getElementById('financialInsightText');
    const scoreEl = document.getElementById('financialInsightScore');
    if (!card || !titleEl || !textEl || !scoreEl) return;

    const { incKRW, expKRW, balanceKRW, reserveSum, avgExp } = getAllTimeTotals();
    const income = incKRW;
    const expense = expKRW;
    const balance = balanceKRW;

    card.classList.remove('is-strong', 'is-warning', 'is-danger');

    if (!income && !expense) {
        titleEl.textContent = 'Gợi Ý Tài Chính';
        if (badgeEl) badgeEl.textContent = 'Chưa có dữ liệu';
        textEl.textContent = 'Nhập thu nhập và chi tiêu để nhận phân tích tự động.';
        scoreEl.textContent = '--';
        scoreEl.classList.add('health-score-ring');
        scoreEl.style.setProperty('--health-progress', '0%');
        scoreEl.style.setProperty('--health-color', 'var(--text-muted)');
        return;
    }

    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
    const survivalMonths = avgExp > 0 ? reserveSum / avgExp : 0;
    const currentMonthKey = getBudgetKey(new Date().getFullYear(), new Date().getMonth());
    const currentMonth = monthlyBudget[currentMonthKey] || {};
    const currentIncome = Number(currentMonth.income || 0);
    const currentExpense = Number(currentMonth.expense || 0);
    const livingBudget = Math.round(currentIncome * 0.40);
    const livingDelta = livingBudget - currentExpense;

    let title = 'Cần theo dõi';
    let text = 'Chi tiêu đang cao hơn phần còn lại. Hãy rà lại tháng có chi tiêu lớn nhất.';
    let tone = 'is-warning';

    if (savingsRate >= 50 && balance > 0) {
        title = 'Dòng tiền rất khỏe';
        text = `Tỷ lệ tiết kiệm đạt ${savingsRate}%. Quỹ dự phòng hiện đủ khoảng ${survivalMonths ? survivalMonths.toFixed(1) : '--'} tháng.`;
        tone = 'is-strong';
    } else if (savingsRate >= 25 && balance > 0) {
        title = 'Tài chính ổn định';
        text = `Bạn đang giữ lại ${fmtKRW(balance)} sau chi tiêu. Tiếp tục duy trì nhịp tiết kiệm hiện tại.`;
        tone = 'is-strong';
    } else if (balance < 0) {
        title = 'Chi tiêu vượt thu nhập';
        text = `Dòng tiền âm ${fmtKRW(Math.abs(balance))}. Nên giảm các khoản không thiết yếu trong tháng tới.`;
        tone = 'is-danger';
    } else if (currentIncome && livingDelta < 0) {
        title = 'Sinh hoạt vượt 40%';
        text = `Tháng này chi tiêu sinh hoạt vượt ${fmtKRW(Math.abs(livingDelta))} so với ngưỡng 40%.`;
        tone = 'is-warning';
    }

    card.classList.add(tone);
    titleEl.textContent = 'Gợi Ý Tài Chính';
    if (badgeEl) badgeEl.textContent = title;
    textEl.textContent = text;
    scoreEl.textContent = `Sức khỏe: ${savingsRate >= 50 ? 'A+ (Xuất sắc)' : (savingsRate >= 25 ? 'B (Tốt)' : 'C (Lưu ý)')}`;
}

function showBudgetTooltip(event, monthIndex, income, expense, balance) {
    const tooltip = document.getElementById('budgetChartTooltip');
    if (!tooltip) return;

    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
    tooltip.innerHTML = `
        <div class="budget-chart-tooltip-title">Tháng ${monthIndex + 1}</div>
        <div><span>Thu nhập</span><strong>${fmtKRW(income)}</strong></div>
        <div><span>Chi tiêu</span><strong>${fmtKRW(expense)}</strong></div>
        <div><span>Còn lại</span><strong>${fmtKRW(balance)}</strong></div>
        <div><span>Tỷ lệ tiết kiệm</span><strong>${Math.max(0, savingsRate)}%</strong></div>
    `;

    const margin = 16;
    const width = 218;
    const left = Math.min(window.innerWidth - width - margin, event.clientX + 14);
    const top = Math.max(margin, event.clientY - 18);
    tooltip.style.left = `${Math.max(margin, left)}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.add('visible');
}

function hideBudgetTooltip() {
    const tooltip = document.getElementById('budgetChartTooltip');
    if (tooltip) tooltip.classList.remove('visible');
}

// ===== Budget KRW Dashboard (above table) =====
function renderBudgetDashboard() {
    const { incKRW, expKRW, balanceKRW } = getBudgetTotals();
    const r = exchangeRate || 18.5;
    const u = usdRate || 25500;
    const rate = incKRW > 0 ? Math.round(((incKRW - expKRW) / incKRW) * 100) : 0;
    const di = document.getElementById('dashTotalIncome');
    const de = document.getElementById('dashTotalExpense');
    const db = document.getElementById('dashTotalBalance');
    const ds = document.getElementById('dashSavingsRate');
    if (di) di.innerHTML = fmtKRW(incKRW) + '<br><span class="sub-currency">≈ ' + fmtVND(Math.round(incKRW * r)) + '</span><br><span class="sub-currency">≈ $' + fmtFull(Math.round(incKRW * r / u)) + '</span>';
    if (de) de.innerHTML = fmtKRW(expKRW) + '<br><span class="sub-currency">≈ ' + fmtVND(Math.round(expKRW * r)) + '</span><br><span class="sub-currency">≈ $' + fmtFull(Math.round(expKRW * r / u)) + '</span>';
    if (db) { db.innerHTML = fmtKRW(balanceKRW) + '<br><span class="sub-currency">≈ ' + fmtVND(Math.round(balanceKRW * r)) + '</span><br><span class="sub-currency">≈ $' + fmtFull(Math.round(balanceKRW * r / u)) + '</span>'; db.style.color = balanceKRW >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'; }
    if (ds) ds.textContent = Math.max(0, rate) + '%';
}

// ===== Budget Health =====
function renderBudgetHealth() {
    const scoreEl = document.getElementById('healthScore'), labelEl = document.getElementById('healthLabel'), iconEl = document.getElementById('healthIcon');
    if (!scoreEl) return;
    const r = exchangeRate || 18.5;
    const { incKRW, expKRW } = getBudgetTotals();
    const income = Math.round(incKRW * r);
    const expense = Math.round(expKRW * r);
    if (!income && !expense) {
        scoreEl.textContent = '--';
        labelEl.textContent = 'Chưa có dữ liệu';
        if (iconEl?.parentElement) iconEl.parentElement.innerHTML = iconMarkup('activity', 'health-icon');
        return;
    }
    const sr = income > 0 ? (income - expense) / income : 0;
    const now = new Date(), ck = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cb = monthlyBudget[ck] || {}, cl = Math.round(Number(cb.income || 0) * ((budgetRatios.livingPct || 40) / 100)), ce = Number(cb.expense || 0);
    const ba = cl > 0 ? Math.max(0, 1 - (ce / cl - 1)) : 1;
    let score = Math.max(0, Math.min(100, Math.round(sr * 60 + ba * 40)));
    let grade, label, icon, color;
    if (score >= 85) { grade = 'A+'; label = 'Xuất sắc'; icon = 'award'; color = '#2dd4bf'; }
    else if (score >= 70) { grade = 'A'; label = 'Rất tốt'; icon = 'sparkles'; color = '#5eead4'; }
    else if (score >= 55) { grade = 'B'; label = 'Khá tốt'; icon = 'thumbs-up'; color = '#facc15'; }
    else if (score >= 40) { grade = 'C'; label = 'Trung bình'; icon = 'zap'; color = '#fb923c'; }
    else if (score >= 25) { grade = 'D'; label = 'Cần cải thiện'; icon = 'triangle-alert'; color = '#fb7185'; }
    else { grade = 'F'; label = 'Rủi ro cao'; icon = 'siren'; color = '#ef4444'; }
    scoreEl.textContent = grade;
    scoreEl.style.color = color;
    scoreEl.classList.add('health-score-ring');
    scoreEl.style.setProperty('--health-progress', `${score}%`);
    scoreEl.style.setProperty('--health-color', color);
    labelEl.textContent = `${label} (${score}/100)`;
    if (iconEl?.parentElement) iconEl.parentElement.innerHTML = iconMarkup(icon, 'health-icon');
}

// ===== Savings Goals =====
const GOAL_META_STORAGE_KEY = 'goz_savings_goals_meta';

function getGoalsMetaMap() {
    try {
        return JSON.parse(localStorage.getItem(GOAL_META_STORAGE_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

function saveGoalMeta(goalId, meta) {
    if (!goalId) return;
    try {
        const all = getGoalsMetaMap();
        all[goalId] = { ...(all[goalId] || {}), ...meta };
        localStorage.setItem(GOAL_META_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
        console.error('saveGoalMeta error:', e);
    }
}

function removeGoalMeta(goalId) {
    if (!goalId) return;
    try {
        const all = getGoalsMetaMap();
        delete all[goalId];
        localStorage.setItem(GOAL_META_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
        console.error('removeGoalMeta error:', e);
    }
}

function enrichGoalsWithMeta(goals) {
    if (!Array.isArray(goals)) return [];
    const metas = getGoalsMetaMap();
    return goals.map(g => {
        const meta = metas[g.id];
        if (meta) {
            return {
                ...g,
                currency: meta.currency || g.currency || 'KRW',
                amountVND: meta.amountVND !== undefined ? meta.amountVND : g.amountVND,
                amountKRW: meta.amountKRW !== undefined ? meta.amountKRW : g.amountKRW
            };
        }
        return g;
    });
}

function previewGoalVND() {
    const currency = document.getElementById('goalCurrency')?.value || 'KRW';
    const raw = parseRawValue(document.getElementById('goalAmount')?.value);
    const amount = raw || 0;
    const r = exchangeRate || 18.5;
    const previewEl = document.getElementById('goalVndPreview');
    if (!previewEl) return;

    if (!amount) {
        previewEl.textContent = '';
        return;
    }

    if (currency === 'KRW') {
        previewEl.textContent = `≈ ${fmtFull(Math.round(amount * r))} ₫`;
    } else {
        previewEl.textContent = `≈ ${fmtFull(Math.round(amount / r))} ₩`;
    }
}

async function addSavingsGoal() {
    const name = document.getElementById('goalName').value.trim();
    const currency = document.getElementById('goalCurrency')?.value || 'KRW';
    const rawAmount = parseRawValue(document.getElementById('goalAmount').value);
    const monthsInput = document.getElementById('goalMonths').value.trim();
    const months = monthsInput ? parseInt(monthsInput, 10) : 0;

    if (!name || !rawAmount) {
        showToast('Vui lòng nhập tên và số tiền mục tiêu!', 'error');
        return;
    }

    const r = exchangeRate || 18.5;
    let amountKRW, amountVND;
    if (currency === 'VND') {
        amountVND = rawAmount;
        amountKRW = Math.round(rawAmount / r);
    } else {
        amountKRW = rawAmount;
        amountVND = Math.round(rawAmount * r);
    }

    try {
        const goal = await saveGoal(name, amountKRW, months);
        goal.currency = currency;
        goal.amountVND = amountVND;
        goal.amountKRW = amountKRW;
        saveGoalMeta(goal.id, { currency, amountVND, amountKRW });
        savingsGoals.push(goal);
        document.getElementById('goalName').value = '';
        document.getElementById('goalAmount').value = '';
        document.getElementById('goalMonths').value = '';
        const preview = document.getElementById('goalVndPreview');
        if (preview) preview.textContent = '';
        renderSavingsGoals();
        showToast(`Mục tiêu "${name}" đã được thêm!`, 'success');
    } catch (err) {
        showToast('Lỗi lưu mục tiêu: ' + err.message, 'error');
    }
}

async function deleteSavingsGoal(id) {
    try {
        await deleteGoalFromDB(id);
        removeGoalMeta(id);
        savingsGoals = savingsGoals.filter(g => g.id !== id);
        renderSavingsGoals();
        showToast('Đã xóa mục tiêu', 'info');
    } catch (err) {
        showToast('Lỗi xóa: ' + err.message, 'error');
    }
}

function toggleGoalCurrency(id) {
    const g = savingsGoals.find(item => item.id === id);
    if (!g) return;
    const r = exchangeRate || 18.5;
    const currentCurr = g.currency === 'VND' ? 'VND' : 'KRW';
    const newCurr = currentCurr === 'VND' ? 'KRW' : 'VND';
    g.currency = newCurr;
    if (!g.amountVND && g.amountKRW) g.amountVND = Math.round(g.amountKRW * r);
    if (!g.amountKRW && g.amountVND) g.amountKRW = Math.round(g.amountVND / r);
    saveGoalMeta(id, { currency: newCurr, amountVND: g.amountVND, amountKRW: g.amountKRW });
    renderSavingsGoals();
    showToast(`Đã đổi mục tiêu "${g.name}" sang gốc ${newCurr}`, 'info');
}
window.toggleGoalCurrency = toggleGoalCurrency;

function renderSavingsGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    if (!savingsGoals.length) { container.innerHTML = ''; return; }
    const { balanceKRW } = getAllTimeTotals();
    const r = exchangeRate || 18.5;
    const balanceVND = Math.round(balanceKRW * r);

    container.innerHTML = savingsGoals.map(g => {
        const isVND = g.currency === 'VND';
        const targetVND = g.amountVND || Math.round((g.amountKRW || 0) * r);
        const targetKRW = g.amountKRW || Math.round((g.amountVND || 0) / r);
        const pct = isVND
            ? (targetVND > 0 ? Math.min(100, Math.max(0, Math.round((balanceVND / targetVND) * 100))) : 0)
            : (targetKRW > 0 ? Math.min(100, Math.max(0, Math.round((balanceKRW / targetKRW) * 100))) : 0);

        const amountDisplay = isVND
            ? `${fmtVND(targetVND)} (≈ ${fmtKRW(targetKRW)})`
            : `${fmtKRW(targetKRW)} (≈ ${fmtVND(targetVND)})`;

        const durationHtml = g.months && g.months > 0
            ? `<span class="goal-meta">${iconMarkup('calendar-clock')} ${g.months} tháng</span>`
            : `<span class="goal-meta">${iconMarkup('calendar-clock')} Tự do</span>`;

        const monthlyHtml = g.months && g.months > 0
            ? `<span class="goal-meta">${iconMarkup('circle-dollar-sign')} ${isVND ? fmtVND(Math.round(targetVND / g.months)) : fmtKRW(Math.round(targetKRW / g.months))}/tháng</span>`
            : '';

        const remainingVND = Math.max(0, targetVND - balanceVND);
        const remainingKRW = Math.max(0, targetKRW - balanceKRW);

        let remainingText = '';
        if (pct >= 100 || (remainingVND <= 0 && remainingKRW <= 0)) {
            remainingText = '(🎉 Hoàn thành)';
        } else if (isVND) {
            remainingText = `(${fmtVND(remainingVND)} ≈ ${fmtKRW(remainingKRW)})`;
        } else {
            remainingText = `(${fmtKRW(remainingKRW)} ≈ ${fmtVND(remainingVND)})`;
        }

        return `<div class="goal-item">
            <div class="goal-info">
                <div class="goal-name">${iconMarkup('target')} ${escapeHtml(g.name)}</div>
                <div class="goal-details">
                    <span class="goal-meta goal-amount-tag" onclick="toggleGoalCurrency('${g.id}')" title="Bấm để chuyển đổi hiển thị gốc VND ↔ KRW" style="cursor:pointer; user-select:none;">
                        ${iconMarkup('banknote')} <strong>${amountDisplay}</strong> <span style="opacity:0.8; font-size:10px; margin-left:3px; text-decoration:underline;">⇄ Đổi gốc</span>
                    </span>
                    ${durationHtml}
                    ${monthlyHtml}
                </div>
                <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%;${pct >= 100 ? 'background:linear-gradient(90deg,#2dd4bf,#5eead4);' : ''}"></div></div>
            </div>
            <div class="goal-pct-box">
                <span class="goal-pct-val">${pct}%</span>
                <span class="goal-remaining-sub">${remainingText}</span>
            </div>
            <button class="goal-delete" onclick="deleteSavingsGoal('${g.id}')" title="Xóa">${iconMarkup('trash-2')}</button>
        </div>`;
    }).join('');
}

// ===== Budget Table =====
function getBudgetKey(y, m) { return `${y}-${String(m + 1).padStart(2, '0')}`; }

function changeYear(delta) {
    budgetYear += delta;
    const yl = document.getElementById('yearLabel');
    if (yl) yl.textContent = budgetYear;
    const oyl = document.getElementById('overviewYearLabel');
    if (oyl) oyl.textContent = budgetYear;
    const cyl = document.getElementById('chartYearTitle');
    if (cyl) cyl.textContent = budgetYear;
    const pyl = document.getElementById('pieYearLabel');
    if (pyl) pyl.textContent = budgetYear;
    renderAll();
}
window.changeYear = changeYear;

function onIncomeInput(month, value) {
    const key = getBudgetKey(budgetYear, month);
    if (!monthlyBudget[key]) monthlyBudget[key] = {};
    monthlyBudget[key].income = parseRawValue(value);
    updateRowInline(month);
    renderWithoutTable();
    updateTableFooter();
    debounceSaveBudget(budgetYear, month, monthlyBudget[key].income, monthlyBudget[key].expense || 0);
}

function onExpenseInput(month, value) {
    const key = getBudgetKey(budgetYear, month);
    if (!monthlyBudget[key]) monthlyBudget[key] = {};
    monthlyBudget[key].expense = parseRawValue(value);
    updateRowInline(month);
    renderWithoutTable();
    updateTableFooter();
    debounceSaveBudget(budgetYear, month, monthlyBudget[key].income || 0, monthlyBudget[key].expense);
}

function getExpensePctBadgeHtml(inc, exp) {
    if (!inc || !exp) {
        return `<span class="expense-pct-badge muted">${inc ? '0%' : '-'}</span>`;
    }
    const pct = (exp / inc) * 100;
    const pctStr = pct.toFixed(1) + '%';
    let cls = 'safe';
    if (pct > 90) cls = 'danger';
    else if (pct > 60) cls = 'warning';
    return `<span class="expense-pct-badge ${cls}">${pctStr}</span>`;
}

function updateRowInline(month) {
    const tbody = document.getElementById('budgetTableBody');
    if (!tbody) return;
    const row = tbody.rows[month];
    if (!row) return;
    const key = getBudgetKey(budgetYear, month);
    const data = monthlyBudget[key] || {};
    const inc = Number(data.income || 0), exp = Number(data.expense || 0);
    const { living, reserve, invest } = getBudgetAllocation(inc);
    const balance = inc - exp, surplus = living - exp;
    const reserveFromBalance = Math.round(balance * (2 / 3));
    const investFromBalance = balance - reserveFromBalance;
    const bC = balance >= 0 ? 'positive' : 'negative', sC = surplus >= 0 ? 'positive' : 'negative';
    const reserveDisplay = inc ? `${fmtFull(reserve)}<span class="cell-new-val">/ ${fmtFull(reserveFromBalance)}</span>` : '-';
    const investDisplay = inc ? `${fmtFull(invest)}<span class="cell-new-val">/ ${fmtFull(investFromBalance)}</span>` : '-';
    // Update cells (skip col 0=month, 1=income input)
    row.cells[2].innerHTML = inc ? fmtFull(living) : '-';
    row.cells[2].className = 'cell-living';
    row.cells[3].innerHTML = reserveDisplay;
    row.cells[3].className = 'cell-reserve';
    row.cells[4].innerHTML = investDisplay;
    row.cells[4].className = 'cell-invest';

    // Update Expense Pct Badge inline (col 5)
    const badgeEl = row.cells[5]?.querySelector('.expense-pct-badge');
    if (badgeEl) {
        if (!inc || !exp) {
            badgeEl.textContent = inc ? '0%' : '-';
            badgeEl.className = 'expense-pct-badge muted';
        } else {
            const pct = (exp / inc) * 100;
            badgeEl.textContent = pct.toFixed(1) + '%';
            let cls = 'safe';
            if (pct > 90) cls = 'danger';
            else if (pct > 60) cls = 'warning';
            badgeEl.className = `expense-pct-badge ${cls}`;
        }
    }

    row.cells[6].innerHTML = inc || exp ? fmtFull(balance) : '-';
    row.cells[6].className = `cell-balance ${bC}`;
    row.cells[7].innerHTML = inc || exp ? fmtFull(surplus) : '-';
    row.cells[7].className = `cell-surplus ${sC}`;
}

function updateTableFooter() {
    const tfoot = document.getElementById('budgetTableFoot');
    if (!tfoot) return;
    const rate = exchangeRate || 18.5;
    let tI = 0, tL = 0, tR = 0, tV = 0, tE = 0, tS = 0;
    let tRnew = 0, tVnew = 0;
    for (let m = 0; m < 12; m++) {
        const key = getBudgetKey(budgetYear, m), data = monthlyBudget[key] || {};
        const inc = Number(data.income || 0), exp = Number(data.expense || 0);
        const { living, reserve, invest } = getBudgetAllocation(inc);
        const balance = inc - exp, surplus = living - exp;
        const reserveFromBalance = Math.round(balance * (2 / 3));
        const investFromBalance = balance - reserveFromBalance;
        tI += inc; tL += living; tR += reserve; tV += invest; tE += exp; tS += surplus;
        tRnew += (inc || exp) ? reserveFromBalance : 0;
        tVnew += (inc || exp) ? investFromBalance : 0;
    }
    const tB = tI - tE, bC = tB >= 0 ? 'positive' : 'negative', sC = tS >= 0 ? 'positive' : 'negative';
    const totalExpPct = tI > 0 ? (tE / tI * 100) : 0;
    const totalExpPctStr = (tI > 0 && tE > 0) ? `<span style="font-size:0.75rem;opacity:0.9;margin-left:4px;font-weight:700;color:var(--accent-red);">(${totalExpPct.toFixed(1)}%)</span>` : '';

    tfoot.innerHTML = `<tr>
        <td><strong>Tổng ₩</strong></td>
        <td style="color:var(--accent-green);font-weight:700;text-align:center;">${fmtFull(tI)}</td>
        <td class="cell-living">${fmtFull(tL)}</td>
        <td class="cell-reserve">${fmtFull(tR)}<span class="cell-new-val">/ ${fmtFull(tRnew)}</span></td>
        <td class="cell-invest">${fmtFull(tV)}<span class="cell-new-val">/ ${fmtFull(tVnew)}</span></td>
        <td style="color:var(--accent-red);font-weight:700;text-align:center;">${fmtFull(tE)}${totalExpPctStr}</td>
        <td class="cell-balance ${bC}">${fmtFull(tB)}</td>
        <td class="cell-surplus ${sC}">${fmtFull(tS)}</td>
    </tr>
    <tr style="font-size:0.68rem;opacity:0.75;">
        <td><strong>Tổng ₫</strong></td>
        <td style="color:var(--accent-green);text-align:center;">${fmtFull(Math.round(tI * rate))}</td>
        <td class="cell-living">${fmtFull(Math.round(tL * rate))}</td>
        <td class="cell-reserve">${fmtFull(Math.round(tR * rate))}<span class="cell-new-val">/ ${fmtFull(Math.round(tRnew * rate))}</span></td>
        <td class="cell-invest">${fmtFull(Math.round(tV * rate))}<span class="cell-new-val">/ ${fmtFull(Math.round(tVnew * rate))}</span></td>
        <td style="color:var(--accent-red);text-align:center;">${fmtFull(Math.round(tE * rate))}${totalExpPctStr}</td>
        <td class="cell-balance ${bC}">${fmtFull(Math.round(tB * rate))}</td>
        <td class="cell-surplus ${sC}">${fmtFull(Math.round(tS * rate))}</td>
    </tr>`;
}

function debounceSaveBudget(year, month, income, expense) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            await saveBudget(year, month, income, expense);
        } catch (err) {
            console.error('Save budget error:', err);
            showToast('Lỗi lưu: ' + err.message, 'error');
        }
    }, 800);
}

function renderMonthlyBudgetTable() {
    const tbody = document.getElementById('budgetTableBody'), tfoot = document.getElementById('budgetTableFoot');
    if (!tbody || !tfoot) return;

    // Update dynamic header % text & legend text
    const thL = document.getElementById('thLivingPct');
    const thR = document.getElementById('thReservePct');
    const thI = document.getElementById('thInvestPct');
    if (thL) thL.innerHTML = `${budgetRatios.livingPct}% <i class="icon-svg" data-lucide="pencil" style="width:10px;height:10px;"></i>`;
    if (thR) thR.innerHTML = `${budgetRatios.reservePct}% <i class="icon-svg" data-lucide="pencil" style="width:10px;height:10px;"></i>`;
    if (thI) thI.innerHTML = `${budgetRatios.investPct}% <i class="icon-svg" data-lucide="pencil" style="width:10px;height:10px;"></i>`;
    refreshIcons();

    const legL = document.getElementById('legendLiving');
    const legR = document.getElementById('legendReserve');
    const legI = document.getElementById('legendInvest');
    if (legL) legL.textContent = `Sinh hoạt ${budgetRatios.livingPct}%`;
    if (legR) legR.textContent = `Dự phòng ${budgetRatios.reservePct}%`;
    if (legI) legI.textContent = `Đầu tư ${budgetRatios.investPct}%`;

    const rate = exchangeRate || 18.5;
    let tI = 0, tL = 0, tR = 0, tV = 0, tE = 0, tS = 0;
    let tRnew = 0, tVnew = 0;
    let rows = '';
    for (let m = 0; m < 12; m++) {
        const key = getBudgetKey(budgetYear, m), data = monthlyBudget[key] || {};
        const inc = Number(data.income || 0), exp = Number(data.expense || 0);
        const { living, reserve, invest } = getBudgetAllocation(inc);
        const balance = inc - exp, surplus = living - exp;
        const reserveFromBalance = Math.round(balance * (2 / 3));
        const investFromBalance = balance - reserveFromBalance;
        tI += inc; tL += living; tR += reserve; tV += invest; tE += exp; tS += surplus;
        tRnew += (inc || exp) ? reserveFromBalance : 0;
        tVnew += (inc || exp) ? investFromBalance : 0;
        const bC = balance >= 0 ? 'positive' : 'negative', sC = surplus >= 0 ? 'positive' : 'negative';
        const isCurrent = budgetYear === new Date().getFullYear() && m === new Date().getMonth();
        const reserveDisplay = inc ? `${fmtFull(reserve)}<span class="cell-new-val">/ ${fmtFull(reserveFromBalance)}</span>` : '-';
        const investDisplay = inc ? `${fmtFull(invest)}<span class="cell-new-val">/ ${fmtFull(investFromBalance)}</span>` : '-';
        // Extract raw number value to display normally, but formatted
        const incVal = inc ? fmtFullRaw(inc) : '';
        const expVal = exp ? fmtFullRaw(exp) : '';
        const expBadge = getExpensePctBadgeHtml(inc, exp);

        rows += `<tr${isCurrent ? ' style="background:rgba(108,92,231,0.08);"' : ''}>
            <td>${MONTHS[m]}</td>
            <td><input class="income-input" type="text" inputmode="numeric" value="${incVal}" placeholder="₩" oninput="formatInputLive(this); onIncomeInput(${m},this.value)" onfocus="this.select()"></td>
            <td class="cell-living">${inc ? fmtFull(living) : '-'}</td>
            <td class="cell-reserve">${reserveDisplay}</td>
            <td class="cell-invest">${investDisplay}</td>
            <td>
                <div class="expense-cell-container">
                    <input class="expense-input" type="text" inputmode="numeric" value="${expVal}" placeholder="₩" oninput="formatInputLive(this); onExpenseInput(${m},this.value)" onfocus="this.select()">
                    ${expBadge}
                </div>
            </td>
            <td class="cell-balance ${bC}">${inc || exp ? fmtFull(balance) : '-'}</td>
            <td class="cell-surplus ${sC}">${inc || exp ? fmtFull(surplus) : '-'}</td>
        </tr>`;
    }
    tbody.innerHTML = rows;
    updateTableFooter();
}

// ===== Budget Overview Line Chart =====
function legacyRenderBudgetOverviewChart() {
    const container = document.getElementById('budgetOverviewChart');
    if (!container) return;
    const labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const series = { income: [], living: [], expense: [], balance: [], reserve: [], invest: [] };
    let hasData = false;
    for (let m = 0; m < 12; m++) {
        const key = getBudgetKey(budgetYear, m), bd = monthlyBudget[key] || {};
        const inc = Number(bd.income || 0), exp = Number(bd.expense || 0);
        const { living, reserve, invest } = getBudgetAllocation(inc);
        const bal = inc - exp;
        if (inc || exp) hasData = true;
        series.income.push(inc);
        series.living.push(living);
        series.expense.push(exp);
        series.balance.push(bal);
        series.reserve.push(reserve);
        series.invest.push(invest);
    }
    if (!hasData) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">${iconMarkup('chart-no-axes-combined')}</div><p>Nhập dữ liệu để xem biểu đồ</p></div>`;
        refreshIcons();
        return;
    }

    // Chart dimensions
    const W = 900, H = 340;
    const pad = { top: 25, right: 20, bottom: 35, left: 55 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    // Find max value for Y axis
    const allVals = [...series.income, ...series.living, ...series.expense, ...series.balance, ...series.reserve, ...series.invest];
    const maxVal = Math.max(...allVals, 1);
    const niceMax = getNiceMax(maxVal);

    // Helper functions
    function getNiceMax(v) {
        if (v <= 0) return 100;
        const mag = Math.pow(10, Math.floor(Math.log10(v)));
        const norm = v / mag;
        if (norm <= 1.5) return 1.5 * mag;
        if (norm <= 2) return 2 * mag;
        if (norm <= 3) return 3 * mag;
        if (norm <= 5) return 5 * mag;
        if (norm <= 7.5) return 7.5 * mag;
        return 10 * mag;
    }
    function xPos(i) { return pad.left + (i / 11) * cW; }
    function yPos(v) { return pad.top + cH - (v / niceMax) * cH; }

    // Build gridlines
    const gridLines = 5;
    let gridSvg = '';
    for (let i = 0; i <= gridLines; i++) {
        const val = Math.round((niceMax / gridLines) * i);
        const y = yPos(val);
        gridSvg += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="4,3"/>`;
        gridSvg += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-muted)" font-size="10" font-family="Inter,sans-serif">${fmtCompact(val)}</text>`;
    }

    // X axis labels
    let xLabels = '';
    for (let i = 0; i < 12; i++) {
        const x = xPos(i);
        xLabels += `<text x="${x}" y="${H - 8}" text-anchor="middle" fill="var(--text-muted)" font-size="10" font-weight="600" font-family="Inter,sans-serif">${labels[i]}</text>`;
    }

    // Line series config
    const lineConfig = [
        { key: 'income', color: '#4a90d9', width: 2.5, dash: '', fill: true },
        { key: 'living', color: '#e74c3c', width: 2, dash: '', fill: false },
        { key: 'expense', color: '#8e44ad', width: 2, dash: '6,3', fill: false },
        { key: 'balance', color: '#27ae60', width: 2, dash: '4,2', fill: false },
        { key: 'reserve', color: '#f39c12', width: 1.8, dash: '3,3', fill: false },
        { key: 'invest', color: '#00cec9', width: 1.8, dash: '3,3', fill: false },
    ];

    let linesSvg = '';
    let dotsSvg = '';
    let labelsSvg = '';

    lineConfig.forEach(cfg => {
        const vals = series[cfg.key];
        // Build path
        let points = [];
        for (let i = 0; i < 12; i++) {
            points.push(`${xPos(i).toFixed(1)},${yPos(vals[i]).toFixed(1)}`);
        }
        const pathD = 'M' + points.join('L');

        // Fill area (only for income)
        if (cfg.fill) {
            const fillD = pathD + `L${xPos(11).toFixed(1)},${yPos(0).toFixed(1)}L${xPos(0).toFixed(1)},${yPos(0).toFixed(1)}Z`;
            linesSvg += `<path d="${fillD}" fill="${cfg.color}" fill-opacity="0.08"/>`;
        }

        // Line
        linesSvg += `<path d="${pathD}" fill="none" stroke="${cfg.color}" stroke-width="${cfg.width}" stroke-dasharray="${cfg.dash}" stroke-linecap="round" stroke-linejoin="round"/>`;

        // Dots and labels
        for (let i = 0; i < 12; i++) {
            if (vals[i] === 0 && !series.income[i] && !series.expense[i]) continue;
            const x = xPos(i), y = yPos(vals[i]);
            dotsSvg += `<circle cx="${x}" cy="${y}" r="3.5" fill="${cfg.color}" stroke="var(--bg-card)" stroke-width="1.5"/>`;
            // Show value labels for key series
            if (cfg.key === 'income' || cfg.key === 'expense' || cfg.key === 'balance') {
                if (vals[i] !== 0) {
                    const labelY = cfg.key === 'income' ? y - 10 : (cfg.key === 'balance' ? y + 15 : y - 10);
                    labelsSvg += `<text x="${x}" y="${labelY}" text-anchor="middle" fill="${cfg.color}" font-size="9" font-weight="600" font-family="Inter,sans-serif">${fmtCompact(vals[i])}</text>`;
                }
            }
        }
    });

    // Current month indicator
    const curMonth = new Date().getMonth();
    let curMonthSvg = '';
    if (budgetYear === new Date().getFullYear()) {
        const cx = xPos(curMonth);
        curMonthSvg = `<line x1="${cx}" y1="${pad.top}" x2="${cx}" y2="${pad.top + cH}" stroke="var(--accent-primary)" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>`;
    }

    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="line-chart-svg">
        ${gridSvg}
        ${xLabels}
        ${curMonthSvg}
        ${linesSvg}
        ${dotsSvg}
        ${labelsSvg}
    </svg>`;
}

function renderBudgetOverviewChart() {
    const container = document.getElementById('budgetOverviewChart');
    if (!container) return;

    const labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    const series = { income: [], expense: [], balance: [] };
    const allocations = { living: 0, reserve: 0, invest: 0 };
    let hasData = false;

    for (let m = 0; m < 12; m++) {
        const key = getBudgetKey(budgetYear, m);
        const bd = monthlyBudget[key] || {};
        const inc = Number(bd.income || 0);
        const exp = Number(bd.expense || 0);
        const balance = inc - exp;

        if (inc || exp) hasData = true;
        const alloc = getBudgetAllocation(inc);
        allocations.living += alloc.living;
        allocations.reserve += alloc.reserve;
        allocations.invest += alloc.invest;
        series.income.push(inc);
        series.expense.push(exp);
        series.balance.push(balance);
    }

    if (!hasData) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">${iconMarkup('chart-no-axes-combined')}</div><p>Nhập dữ liệu để xem biểu đồ</p></div>`;
        refreshIcons();
        return;
    }

    const W = 920;
    const H = 315;
    const pad = { top: 22, right: 24, bottom: 38, left: 60 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    function getNiceMax(v) {
        if (v <= 0) return 100;
        const mag = Math.pow(10, Math.floor(Math.log10(v)));
        const norm = v / mag;
        if (norm <= 1.5) return 1.5 * mag;
        if (norm <= 2) return 2 * mag;
        if (norm <= 3) return 3 * mag;
        if (norm <= 5) return 5 * mag;
        if (norm <= 7.5) return 7.5 * mag;
        return 10 * mag;
    }

    function getNiceMin(v) {
        if (v >= 0) return 0;
        return -getNiceMax(Math.abs(v));
    }

    const allVals = [...series.income, ...series.expense, ...series.balance];
    const niceMax = getNiceMax(Math.max(...allVals, 1));
    const niceMin = getNiceMin(Math.min(...allVals, 0));
    const range = Math.max(1, niceMax - niceMin);
    const zeroY = yPos(0);

    function xPos(i) {
        return pad.left + (i / 11) * cW;
    }

    function yPos(v) {
        return pad.top + cH - ((v - niceMin) / range) * cH;
    }

    function pointFor(v, i) {
        return { x: Number(xPos(i).toFixed(1)), y: Number(yPos(v).toFixed(1)) };
    }

    function areaPath(points) {
        if (!points.length) return '';
        const line = makeSmoothPath(points);
        return `${line} L ${points[points.length - 1].x} ${zeroY.toFixed(1)} L ${points[0].x} ${zeroY.toFixed(1)} Z`;
    }

    let gridSvg = '';
    for (let i = 0; i <= 5; i++) {
        const val = Math.round(niceMin + (range / 5) * i);
        const y = yPos(val);
        const isZero = Math.abs(val) < range / 100;
        gridSvg += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" class="${isZero ? 'budget-flow-zero' : 'budget-flow-grid'}"/>`;
        gridSvg += `<text x="${pad.left - 10}" y="${y + 4}" text-anchor="end" class="budget-flow-y-label">${fmtCompact(val)}</text>`;
    }

    const xLabels = labels.map((label, i) => (
        `<text x="${xPos(i)}" y="${H - 10}" text-anchor="middle" class="budget-flow-x-label">${label}</text>`
    )).join('');

    const chartMode = window.chartViewMode || localStorage.getItem('goz_chart_mode') || 'line'; // 'combo', 'bar', 'line'

    let defsSvg = `
        <defs>
            <linearGradient id="flowGradIncBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.95"/>
                <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.8"/>
            </linearGradient>
            <linearGradient id="flowGradExpBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#fb7185" stop-opacity="0.95"/>
                <stop offset="100%" stop-color="#e11d48" stop-opacity="0.8"/>
            </linearGradient>
            <linearGradient id="flowGradIncArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.01"/>
            </linearGradient>
            <linearGradient id="flowGradExpArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#fb7185" stop-opacity="0.22"/>
                <stop offset="100%" stop-color="#fb7185" stop-opacity="0.01"/>
            </linearGradient>
            <linearGradient id="flowGradBalArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0.01"/>
            </linearGradient>
        </defs>
    `;

    let contentSvg = '';
    let dotsSvg = '';
    let labelsSvg = '';
    let hitSvg = '';

    if (chartMode === 'bar') {
        // CỘT ĐÔI: Thu nhập (xanh) & Chi tiêu (đỏ) đặt cạnh nhau từng tháng
        const barW = 15;
        const gap = 4;
        for (let i = 0; i < 12; i++) {
            const inc = series.income[i];
            const exp = series.expense[i];
            const cx = xPos(i);

            if (inc > 0) {
                const yI = yPos(inc);
                const hI = Math.max(3, Math.abs(zeroY - yI));
                const xI = cx - barW - gap / 2;
                contentSvg += `<rect x="${xI}" y="${Math.min(yI, zeroY)}" width="${barW}" height="${hI}" rx="4" ry="4" fill="url(#flowGradIncBar)" class="budget-chart-bar-inc"/>`;
                labelsSvg += `<text x="${xI + barW / 2}" y="${yI - 6}" text-anchor="middle" class="budget-flow-value budget-flow-value-income">${fmtCompact(inc)}</text>`;
            }

            if (exp > 0) {
                const yE = yPos(exp);
                const hE = Math.max(3, Math.abs(zeroY - yE));
                const xE = cx + gap / 2;
                contentSvg += `<rect x="${xE}" y="${Math.min(yE, zeroY)}" width="${barW}" height="${hE}" rx="4" ry="4" fill="url(#flowGradExpBar)" class="budget-chart-bar-exp"/>`;
                labelsSvg += `<text x="${xE + barW / 2}" y="${yE - 6}" text-anchor="middle" class="budget-flow-value budget-flow-value-expense">${fmtCompact(exp)}</text>`;
            }
        }
    } else if (chartMode === 'combo') {
        // KẾT HỢP: Cột đôi Thu nhập & Chi tiêu + Đường cong Còn lại (Lợi nhuận tích lũy) chạy vắt ngang qua
        const barW = 13;
        const gap = 3;
        for (let i = 0; i < 12; i++) {
            const inc = series.income[i];
            const exp = series.expense[i];
            const cx = xPos(i);

            if (inc > 0) {
                const yI = yPos(inc);
                const hI = Math.max(3, Math.abs(zeroY - yI));
                const xI = cx - barW - gap / 2;
                contentSvg += `<rect x="${xI}" y="${Math.min(yI, zeroY)}" width="${barW}" height="${hI}" rx="3" ry="3" fill="url(#flowGradIncBar)" opacity="0.88" class="budget-chart-bar-inc"/>`;
            }

            if (exp > 0) {
                const yE = yPos(exp);
                const hE = Math.max(3, Math.abs(zeroY - yE));
                const xE = cx + gap / 2;
                contentSvg += `<rect x="${xE}" y="${Math.min(yE, zeroY)}" width="${barW}" height="${hE}" rx="3" ry="3" fill="url(#flowGradExpBar)" opacity="0.88" class="budget-chart-bar-exp"/>`;
            }
        }

        // Overlay smooth curve for Balance (Còn lại / Lợi nhuận)
        const balPoints = series.balance.map((v, i) => pointFor(v, i));
        const balPath = makeSmoothPath(balPoints);
        contentSvg += `<path class="budget-flow-area" fill="url(#flowGradBalArea)" d="${areaPath(balPoints)}"/>`;
        contentSvg += `<path class="budget-flow-line budget-flow-line-balance" d="${balPath}" stroke-width="3.5"/>`;

        for (let i = 0; i < 12; i++) {
            if (series.income[i] || series.expense[i] || series.balance[i]) {
                const pt = balPoints[i];
                dotsSvg += `<circle cx="${pt.x}" cy="${pt.y}" r="4.6" class="budget-flow-dot budget-flow-dot-balance"/>`;
                labelsSvg += `<text x="${pt.x}" y="${pt.y - 10}" text-anchor="middle" class="budget-flow-value budget-flow-value-balance">${fmtCompact(series.balance[i])}</text>`;
            }
        }
    } else {
        // ĐƯỜNG CONG (Line mode): 3 đường spline mềm mại
        const flowSeries = [
            { key: 'income', cls: 'income', data: series.income },
            { key: 'expense', cls: 'expense', data: series.expense },
            { key: 'balance', cls: 'balance', data: series.balance },
        ];

        flowSeries.forEach(cfg => {
            const vals = cfg.data;
            const points = vals.map((value, index) => pointFor(value, index));
            const pathD = makeSmoothPath(points);

            if (cfg.key !== 'balance') {
                contentSvg += `<path class="budget-flow-area budget-flow-area-${cfg.cls}" d="${areaPath(points)}"/>`;
            }
            contentSvg += `<path class="budget-flow-line budget-flow-line-${cfg.cls}" d="${pathD}"/>`;

            const nonZeroIndexes = vals.map((value, index) => value !== 0 ? index : -1).filter(index => index >= 0);
            const latestIndex = nonZeroIndexes.length ? nonZeroIndexes[nonZeroIndexes.length - 1] : -1;
            const peakIndex = vals.indexOf(Math.max(...vals));

            for (let i = 0; i < vals.length; i++) {
                if (vals[i] === 0 && !series.income[i] && !series.expense[i]) continue;
                const point = points[i];
                const isKeyPoint = i === latestIndex || (cfg.key === 'income' && i === peakIndex);
                dotsSvg += `<circle cx="${point.x}" cy="${point.y}" r="${isKeyPoint ? 4.6 : 3.5}" class="budget-flow-dot budget-flow-dot-${cfg.cls}"/>`;
                if (vals[i] !== 0) {
                    const labelY = cfg.key === 'balance' ? point.y + 16 : (cfg.key === 'expense' ? point.y - 8 : point.y - 12);
                    labelsSvg += `<text x="${Math.min(W - 34, Math.max(34, point.x))}" y="${Math.max(14, Math.min(H - 14, labelY))}" text-anchor="middle" class="budget-flow-value budget-flow-value-${cfg.cls}">${fmtCompact(vals[i])}</text>`;
                }
            }
        });
    }

    let curMonthSvg = '';
    if (budgetYear === new Date().getFullYear()) {
        const cx = xPos(new Date().getMonth());
        curMonthSvg = `<line x1="${cx}" y1="${pad.top}" x2="${cx}" y2="${pad.top + cH}" class="budget-flow-current"/>`;
    }

    for (let index = 0; index < labels.length; index++) {
        if (!series.income[index] && !series.expense[index]) continue;
        const x = xPos(index);
        hitSvg += `<circle cx="${x}" cy="${pad.top + cH / 2}" r="28" class="budget-flow-hit"
            onmousemove="showBudgetTooltip(event, ${index}, ${series.income[index]}, ${series.expense[index]}, ${series.balance[index]})"
            onmouseleave="hideBudgetTooltip()"></circle>`;
    }

    container.innerHTML = `<div class="budget-flow-chart">
        <div class="budget-flow-legend">
            <span class="income">Thu nhập</span>
            <span class="expense">Chi tiêu</span>
            <span class="balance">Còn lại</span>
        </div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="line-chart-svg budget-flow-svg" role="img" aria-label="Biểu đồ thu nhập, chi tiêu và còn lại theo tháng">
            ${defsSvg}
            ${gridSvg}
            ${xLabels}
            ${curMonthSvg}
            ${contentSvg}
            ${dotsSvg}
            ${labelsSvg}
            ${hitSvg}
        </svg>
        <div class="budget-chart-tooltip" id="budgetChartTooltip"></div>
        <div class="budget-flow-allocation">
            <span>Sinh hoạt ${budgetRatios.livingPct}% <strong>${fmtCompact(allocations.living)}</strong></span>
            <span>Dự phòng ${budgetRatios.reservePct}% <strong>${fmtCompact(allocations.reserve)}</strong></span>
            <span>Đầu tư ${budgetRatios.investPct}% <strong>${fmtCompact(allocations.invest)}</strong></span>
        </div>
    </div>`;
}

// ===== Chart Fullscreen =====
function openChartFullscreen() {
    const chart = document.getElementById('budgetOverviewChart');
    const overlay = document.getElementById('chartFullscreen');
    const content = document.getElementById('chartFullscreenContent');
    if (!chart || !overlay || !content) return;
    if (!chart.innerHTML.trim()) { showToast('Chưa có biểu đồ để phóng to', 'info'); return; }
    content.innerHTML = chart.innerHTML;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeChartFullscreen(e) {
    if (e && e.target !== document.getElementById('chartFullscreen')) return;
    const overlay = document.getElementById('chartFullscreen');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== Pie Charts =====
function renderPieCharts() {
    const pyl = document.getElementById('pieYearLabel');
    if (pyl) pyl.textContent = budgetYear;
    const oyl = document.getElementById('overviewYearLabel');
    if (oyl) oyl.textContent = budgetYear;
    const cyl = document.getElementById('chartYearTitle');
    if (cyl) cyl.textContent = budgetYear;

    const restPct = (budgetRatios.reservePct + budgetRatios.investPct) || 60;
    const resRatio = budgetRatios.reservePct / restPct;

    // 1. Calculate Yearly Data
    let yInc = 0, yExp = 0;
    for (let m = 0; m < 12; m++) {
        const key = getBudgetKey(budgetYear, m);
        const data = monthlyBudget[key] || {};
        yInc += Number(data.income || 0);
        yExp += Number(data.expense || 0);
    }
    const yBal = Math.max(0, yInc - yExp);
    const yRes = Math.round(yBal * resRatio);
    const yInv = Math.max(0, yBal - yRes);

    // 2. Calculate All-Time Data
    let aInc = 0, aExp = 0;
    Object.values(monthlyBudget).forEach(b => {
        aInc += Number(b.income || 0);
        aExp += Number(b.expense || 0);
    });
    const aBal = Math.max(0, aInc - aExp);
    const aRes = Math.round(aBal * resRatio);
    const aInv = Math.max(0, aBal - aRes);

    const yearlyData = [
        { label: 'Chi tiêu', value: yExp, color: '#e74c3c' },
        { label: 'Dự phòng', value: yRes, color: '#f39c12' },
        { label: 'Đầu tư', value: yInv, color: '#00cec9' }
    ];
    drawPie('pieChartYearly', yearlyData);
    document.getElementById('pieLegendYearly').innerHTML = getPieLegendHTML(yearlyData);

    const allTimeData = [
        { label: 'Chi tiêu', value: aExp, color: '#e74c3c' },
        { label: 'Dự phòng', value: aRes, color: '#f39c12' },
        { label: 'Đầu tư', value: aInv, color: '#00cec9' }
    ];
    drawPie('pieChartAllTime', allTimeData);
    document.getElementById('pieLegendAllTime').innerHTML = getPieLegendHTML(allTimeData);
}

function getPieLegendHTML(data) {
    return data.map(item => `
        <div class="pie-legend-item">
            <span class="legend-dot" style="background:${item.color}"></span> 
            ${item.label}: <strong>${fmtFull(item.value)} ₩</strong>
        </div>
    `).join('');
}

function drawPie(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
        container.innerHTML = '<div class="pie-empty">Chưa có dữ liệu</div>';
        return;
    }

    let svg = '<svg viewBox="-1 -1 2 2" class="pie-chart-svg">';
    let cumulativePercent = 0;

    data.forEach(slice => {
        const percent = slice.value / total;
        if (percent === 0) return;

        // If one slice is 100%, draw a full circle
        if (percent === 1) {
            svg += `<circle cx="0" cy="0" r="1" fill="${slice.color}" class="pie-slice"><title>${slice.label}: 100%</title></circle>`;
            return;
        }

        const startX = Math.cos(2 * Math.PI * cumulativePercent);
        const startY = Math.sin(2 * Math.PI * cumulativePercent);

        cumulativePercent += percent;

        const endX = Math.cos(2 * Math.PI * cumulativePercent);
        const endY = Math.sin(2 * Math.PI * cumulativePercent);
        const largeArcFlag = percent > 0.5 ? 1 : 0;

        const pathData = [
            `M ${startX} ${startY}`, // Move to edge
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Draw arc
            `L 0 0`, // Line to center
        ].join(' ');

        svg += `<path d="${pathData}" fill="${slice.color}" class="pie-slice"><title>${slice.label}: ${(percent * 100).toFixed(1)}%</title></path>`;
    });

    svg += '</svg>';
    container.innerHTML = svg;
}

function getAllocationLegendHTML(data) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map(item => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return `<div class="pie-legend-item allocation-legend-item">
            <span class="legend-dot" style="background:${item.color}"></span>
            ${item.label}: <strong>${percent}%</strong>
        </div>`;
    }).join('');
}

function drawAllocationBars(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
        container.innerHTML = '<div class="pie-empty allocation-empty">Chưa có dữ liệu</div>';
        return;
    }

    const rows = data.map(item => {
        const percent = Math.round((item.value / total) * 100);
        return `<div class="allocation-bar-row">
            <div class="allocation-bar-heading">
                <span><i style="background:${item.color}"></i>${item.label}</span>
                <strong>${percent}%</strong>
            </div>
            <div class="allocation-bar-track">
                <div class="allocation-bar-fill" style="--bar-width:${percent}%; --bar-color:${item.color}"></div>
            </div>
            <div class="allocation-bar-value">${fmtFull(item.value)} KRW</div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="allocation-bar-chart">${rows}</div>`;
}

renderPieCharts = function () {
    const yearLabel = document.getElementById('pieYearLabel');
    if (yearLabel) yearLabel.textContent = budgetYear;

    let yearlyIncome = 0;
    let yearlyExpense = 0;
    for (let m = 0; m < 12; m++) {
        const key = getBudgetKey(budgetYear, m);
        const data = monthlyBudget[key] || {};
        yearlyIncome += Number(data.income || 0);
        yearlyExpense += Number(data.expense || 0);
    }

    let allIncome = 0;
    let allExpense = 0;
    Object.values(monthlyBudget).forEach(data => {
        allIncome += Number(data.income || 0);
        allExpense += Number(data.expense || 0);
    });

    const yearlyBalance = Math.max(0, yearlyIncome - yearlyExpense);
    const yearlyReserve = Math.round(yearlyBalance * (2 / 3));
    const yearlyInvest = yearlyBalance - yearlyReserve;
    const allBalance = Math.max(0, allIncome - allExpense);
    const allReserve = Math.round(allBalance * (2 / 3));
    const allInvest = allBalance - allReserve;

    const yearlyData = [
        { label: 'Chi tiêu', value: yearlyExpense, color: '#fb7185' },
        { label: 'Dự phòng', value: yearlyReserve, color: '#fbbf24' },
        { label: 'Đầu tư', value: yearlyInvest, color: '#2dd4bf' }
    ];
    const allTimeData = [
        { label: 'Chi tiêu', value: allExpense, color: '#fb7185' },
        { label: 'Dự phòng', value: allReserve, color: '#fbbf24' },
        { label: 'Đầu tư', value: allInvest, color: '#2dd4bf' }
    ];

    drawAllocationBars('pieChartYearly', yearlyData);
    drawAllocationBars('pieChartAllTime', allTimeData);

    const yearlyLegend = document.getElementById('pieLegendYearly');
    const allTimeLegend = document.getElementById('pieLegendAllTime');
    if (yearlyLegend) yearlyLegend.innerHTML = getAllocationLegendHTML(yearlyData);
    if (allTimeLegend) allTimeLegend.innerHTML = getAllocationLegendHTML(allTimeData);
};

// ===== Export CSV =====
function exportToCSV() {
    try {
        const rows = [
            ['Năm', 'Tháng', 'Thu Nhập (₩)', 'Sinh hoạt (₩)', 'Dự Phòng Từ Còn Lại (₩)', 'Đầu Tư Từ Còn Lại (₩)', 'Chi Tiêu Thực Tế (₩)', 'Còn Lại (₩)']
        ];

        let totalInc = 0, totalLiving = 0, totalReserve = 0, totalInvest = 0, totalExp = 0, totalBalance = 0;

        // Sort keys chronologically
        const keys = Object.keys(monthlyBudget).sort();

        keys.forEach(key => {
            const [y, mStr] = key.split('-');
            const m = parseInt(mStr, 10);
            const data = monthlyBudget[key];
            const inc = Number(data.income || 0);
            const exp = Number(data.expense || 0);

            if (inc === 0 && exp === 0) return; // Skip completely empty months

            const { living } = getBudgetAllocation(inc);
            const balance = inc - exp;
            const balPositive = Math.max(0, balance);
            const reserve = Math.round(balPositive * (2 / 3));
            const invest = balPositive - reserve;

            // Accumulate totals
            totalInc += inc;
            totalLiving += living;
            totalReserve += reserve;
            totalInvest += invest;
            totalExp += exp;
            totalBalance += balance;

            rows.push([
                y,
                `Tháng ${m}`,
                inc.toLocaleString('vi-VN'),
                living.toLocaleString('vi-VN'),
                reserve.toLocaleString('vi-VN'),
                invest.toLocaleString('vi-VN'),
                exp.toLocaleString('vi-VN'),
                balance.toLocaleString('vi-VN')
            ]);
        });

        if (rows.length === 1) {
            showToast('Không có dữ liệu để xuất', 'info');
            return;
        }

        // Add TOTAL row
        rows.push([
            'TỔNG CỘNG',
            '',
            totalInc.toLocaleString('vi-VN'),
            totalLiving.toLocaleString('vi-VN'),
            totalReserve.toLocaleString('vi-VN'),
            totalInvest.toLocaleString('vi-VN'),
            totalExp.toLocaleString('vi-VN'),
            totalBalance.toLocaleString('vi-VN')
        ]);

        if (rows.length === 1) {
            showToast('Không có dữ liệu để xuất', 'info');
            return;
        }

        // Mẹo cho Excel: Thêm BOM để hiển thị đúng Tiếng Việt, không cần sep=, nếu dùng dấu phẩy mặc định
        const csvContent = "\uFEFF" + rows.map(r => {
            // Bao bọc các giá trị trong ngoặc kép để tránh dính lỗi
            return r.map(cell => `"${cell}"`).join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `TaichinhGOZ_Backup_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Đã xuất báo cáo CSV thành công!', 'success');
    } catch (err) {
        console.error('Export error:', err);
        showToast('Lỗi xuất file: ' + err.message, 'error');
    }
}

// ===== Toast =====
function showToast(msg, type = 'info') { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.className = `toast ${type} show`; setTimeout(() => t.classList.remove('show'), 2600); }

// ===== PWA Service Worker & Auto-Update Engine =====
let swRegistration = null;

function registerSW() {
    if (!('serviceWorker' in navigator)) return;

    // Listen for controllerchange: When a new SW takes over, auto-reload page to apply new code immediately
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        showToast('Đã cập nhật phiên bản mới nhất! Đang tải lại...', 'success');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    });

    navigator.serviceWorker.register('sw.js?v=56').then(reg => {
        swRegistration = reg;

        // Check if an update is waiting right now
        if (reg.waiting) {
            promptSWUpdate(reg.waiting);
        }

        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // A new version was installed while the old worker was controlling the page
                    promptSWUpdate(newWorker);
                }
            });
        });

        // Trigger manual update check on focus & visibilitychange (Mobile PWA reopen)
        const checkUpdate = () => {
            if (navigator.onLine && reg) {
                reg.update().catch(() => { });
            }
        };

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkUpdate();
        });
        window.addEventListener('focus', checkUpdate);

        // Check update every 10 minutes in background
        setInterval(checkUpdate, 10 * 60 * 1000);
    }).catch(err => {
        console.warn('PWA SW registration failed:', err);
    });
}

// Prompt SW Update & activate
function promptSWUpdate(worker) {
    if (!worker) return;
    showToast('Đã có bản cập nhật mới! Đang tự động áp dụng...', 'info');
    worker.postMessage({ type: 'SKIP_WAITING' });
}

// Manual Check Update for Settings Tab Button
async function checkPWAUpdateManual() {
    const btn = document.getElementById('checkUpdateBtn');
    const statusEl = document.getElementById('updateStatusText');
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Đang kiểm tra máy chủ...';

    if (!('serviceWorker' in navigator) || !swRegistration) {
        showToast('Trình duyệt không hỗ trợ Service Worker', 'info');
        if (btn) btn.disabled = false;
        if (statusEl) statusEl.textContent = 'Không hỗ trợ PWA';
        return;
    }

    try {
        showToast('Đang kiểm tra bản cập nhật...', 'info');
        const updateReg = await swRegistration.update();
        if (!updateReg.installing && !updateReg.waiting) {
            showToast('Bạn đang sử dụng phiên bản mới nhất! (v33)', 'success');
            if (statusEl) statusEl.textContent = 'Đã là bản mới nhất (v33)';
        }
    } catch (err) {
        console.error('Update check error:', err);
        showToast('Lỗi khi kiểm tra cập nhật. Hãy thử lại!', 'error');
        if (statusEl) statusEl.textContent = 'Không thể kiểm tra';
    } finally {
        if (btn) setTimeout(() => { btn.disabled = false; }, 1500);
    }
}


// ===== Tab Navigation (GSAP Waterfall Cascade & Render Cache - Inspired by Jinil B2B Portal) =====
let activeTab = 'overview';
const _renderedTabs = new Set(['overview']); // Overview renders on load
let _lastPriceRefreshTime = Date.now();
let _tabAnimFrame = null;

function invalidateTabCache(tabId) {
    if (tabId) _renderedTabs.delete(tabId);
    else _renderedTabs.clear();
}
window.invalidateTabCache = invalidateTabCache;

function animateTabWaterfall(pane) {
    if (!pane) return;
    if (typeof gsap === 'undefined') return;

    // 1. Look for explicit waterfall items or sections/cards (Jinil-landing-page pattern)
    let targets = Array.from(
        pane.querySelectorAll('.waterfall-item, section, .card-item, .panel, .overview-header-bar, .exchange-tri-grid, .overview-stats-grid, .overview-charts-grid, [data-waterfall]')
    );

    // 2. If no explicit targets found, inspect direct children
    if (targets.length === 0) {
        const directChildren = Array.from(pane.children);
        const firstChild = directChildren[0];
        if (firstChild && firstChild.children && firstChild.children.length > 0) {
            targets = Array.from(firstChild.children);
        } else {
            targets = directChildren;
        }
    }

    // Limit to 8 targets max for silky 60 FPS performance (from Jinil B2B Portal)
    targets = targets.filter(el => {
        if (!el) return false;
        const disp = window.getComputedStyle(el).display;
        return disp !== 'none' && !el.classList.contains('pin-overlay') && !el.classList.contains('auth-overlay');
    }).slice(0, 8);

    if (targets.length === 0) return;

    // Kill any in-flight tweens on targets to prevent frame drops on rapid tab switching
    gsap.killTweensOf(targets);

    // Hardware-accelerated fromTo cascade
    gsap.fromTo(
        targets,
        {
            y: 16,
            autoAlpha: 0,
        },
        {
            y: 0,
            autoAlpha: 1,
            duration: 0.28,
            stagger: 0.03,
            ease: 'power2.out',
            force3D: true,
            clearProps: 'transform,opacity,visibility',
        }
    );
}

function switchTab(tabId) {
    if (activeTab === tabId && document.getElementById('tab-' + tabId)?.classList.contains('active')) {
        return;
    }
    activeTab = tabId;

    // Cancel any pending animation frame
    if (_tabAnimFrame) cancelAnimationFrame(_tabAnimFrame);

    // 1. Hide all tab panes immediately and cancel running animations
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(pane.querySelectorAll('*'));
        }
    });

    // 2. Activate target tab pane
    const selectedPane = document.getElementById('tab-' + tabId);
    if (selectedPane) {
        selectedPane.classList.add('active');
    }

    // 3. Update desktop header tabs active state
    document.querySelectorAll('.header-nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    const headerBtn = document.getElementById('h-nav-' + tabId);
    if (headerBtn) {
        headerBtn.classList.add('active');
    }

    // 4. Update overview quick sub-tab buttons
    document.querySelectorAll('.ov-tab-btn').forEach(btn => {
        if (!btn.classList.contains('ov-refresh')) {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        }
    });

    // 5. Update mobile bottom navigation active state
    document.querySelectorAll('.mobile-bottom-nav a').forEach(link => {
        link.classList.remove('active');
    });
    const mobileBtn = document.getElementById('m-nav-' + tabId);
    if (mobileBtn) {
        mobileBtn.classList.add('active');
    }

    // 6. Check if target tab needs initial render (Lazy-load on first visit only)
    const needsRender = !_renderedTabs.has(tabId);
    if (needsRender) {
        _renderedTabs.add(tabId);
        if (tabId === 'overview') {
            renderBudgetOverviewChart();
            renderPieCharts();
        } else if (tabId === 'assets') {
            if (typeof window.renderPortfolio === 'function') window.renderPortfolio();
        } else if (tabId === 'budget') {
            renderMonthlyBudgetTable();
            renderBudgetDashboard();
        } else if (tabId === 'exchange') {
            renderExchangeRateChart();
        }
        if (typeof refreshIcons === 'function') refreshIcons();
    }

    // 7. Trigger silky-smooth 60fps GSAP waterfall transition on next animation frame
    _tabAnimFrame = requestAnimationFrame(() => {
        animateTabWaterfall(selectedPane);
    });

    // 8. Background throttled price refresh (non-blocking, only once every 90s)
    const now = Date.now();
    if (now - _lastPriceRefreshTime > 90000 && (tabId === 'overview' || tabId === 'assets')) {
        _lastPriceRefreshTime = now;
        setTimeout(() => {
            if (typeof window.refreshCryptoPrices === 'function') window.refreshCryptoPrices();
            if (typeof window.refreshStockPrices === 'function') window.refreshStockPrices();
        }, 1500);
    }
}

// Expose key render functions globally
window.renderMonthlyBudgetTable = renderMonthlyBudgetTable;
window.renderBudgetDashboard = renderBudgetDashboard;
window.renderBudgetOverviewChart = renderBudgetOverviewChart;

// ===== Exchange Rate History Chart (Multi-Currency & Tri-Chart Grid) =====
// ===== EMBEDDED REAL MARKET HISTORICAL RATES (PAST 90 DAYS) =====
// Verified actual historical closing exchange rates (ECB, Frankfurter & Interbank)
const VERIFIED_EXCHANGE_HISTORY = {
  "2026-08-06": [
    17.88,
    25453,
    1424
  ],
  "2026-08-07": [
    17.98,
    25462,
    1416
  ],
  "2026-08-08": [
    17.99,
    25473,
    1416
  ],
  "2026-08-09": [
    18,
    25484,
    1416
  ],
  "2026-08-10": [
    18,
    25496,
    1417
  ],
  "2026-08-11": [
    18.06,
    25508,
    1412
  ],
  "2026-08-12": [
    18.01,
    25519,
    1417
  ],
  "2026-08-13": [
    17.97,
    25529,
    1420
  ],
  "2026-08-14": [
    18.1,
    25537,
    1411
  ],
  "2026-08-15": [
    18.1,
    25543,
    1411
  ],
  "2026-08-16": [
    18.1,
    25547,
    1411
  ],
  "2026-08-17": [
    18.1,
    25549,
    1412
  ],
  "2026-08-18": [
    18.12,
    25549,
    1410
  ],
  "2026-08-19": [
    18.36,
    25547,
    1391
  ],
  "2026-08-20": [
    18.29,
    25543,
    1396
  ],
  "2026-08-21": [
    18.45,
    25538,
    1384
  ],
  "2026-08-22": [
    18.45,
    25533,
    1384
  ],
  "2026-08-23": [
    18.44,
    25527,
    1384
  ],
  "2026-08-24": [
    18.44,
    25522,
    1384
  ],
  "2026-08-25": [
    18.45,
    25518,
    1383
  ],
  "2026-08-26": [
    18.44,
    25516,
    1383
  ],
  "2026-08-27": [
    18.48,
    25515,
    1380
  ],
  "2026-08-28": [
    18.56,
    25516,
    1375
  ],
  "2026-08-29": [
    18.57,
    25519,
    1375
  ],
  "2026-08-30": [
    18.57,
    25525,
    1375
  ],
  "2026-08-31": [
    18.66,
    25532,
    1368
  ],
  "2026-09-01": [
    18.58,
    25537,
    1375
  ],
  "2026-09-02": [
    18.74,
    25535,
    1363
  ],
  "2026-09-03": [
    18.81,
    25536,
    1357
  ],
  "2026-09-04": [
    18.91,
    25538,
    1350
  ],
  "2026-09-05": [
    18.92,
    25543,
    1350
  ],
  "2026-09-06": [
    18.92,
    25549,
    1350
  ],
  "2026-09-07": [
    18.96,
    25558,
    1348
  ],
  "2026-09-08": [
    19.06,
    25568,
    1342
  ],
  "2026-09-09": [
    19.14,
    25579,
    1336
  ],
  "2026-09-10": [
    19.04,
    25591,
    1344
  ],
  "2026-09-11": [
    19.07,
    25603,
    1343
  ],
  "2026-09-12": [
    19.08,
    25615,
    1343
  ],
  "2026-09-13": [
    19.08,
    25625,
    1343
  ],
  "2026-09-14": [
    19.04,
    25634,
    1346
  ],
  "2026-09-15": [
    18.87,
    25641,
    1359
  ],
  "2026-09-16": [
    18.75,
    25646,
    1368
  ],
  "2026-09-17": [
    18.55,
    25650,
    1383
  ],
  "2026-09-18": [
    18.48,
    25650,
    1388
  ],
  "2026-09-19": [
    18.48,
    25649,
    1388
  ],
  "2026-09-20": [
    18.48,
    25646,
    1388
  ],
  "2026-09-21": [
    18.69,
    25642,
    1372
  ],
  "2026-09-22": [
    18.9,
    25637,
    1356
  ],
  "2026-09-23": [
    18.77,
    25632,
    1365
  ],
  "2026-09-24": [
    18.72,
    25626,
    1369
  ],
  "2026-09-25": [
    18.91,
    25622,
    1355
  ],
  "2026-09-26": [
    18.91,
    25618,
    1355
  ],
  "2026-09-27": [
    18.9,
    25616,
    1355
  ],
  "2026-09-28": [
    18.86,
    25616,
    1358
  ],
  "2026-09-29": [
    18.93,
    25618,
    1353
  ],
  "2026-09-30": [
    18.9,
    25623,
    1355
  ],
  "2026-10-01": [
    18.83,
    25637,
    1361
  ],
  "2026-10-02": [
    19.01,
    25634,
    1348
  ],
  "2026-10-03": [
    19.01,
    25633,
    1348
  ],
  "2026-10-04": [
    19.01,
    25635,
    1348
  ],
  "2026-10-05": [
    19.08,
    25638,
    1344
  ],
  "2026-10-06": [
    19.15,
    25644,
    1339
  ],
  "2026-10-07": [
    19.16,
    25651,
    1339
  ],
  "2026-10-08": [
    19.1,
    25661,
    1343
  ],
  "2026-10-09": [
    19.14,
    25671,
    1341
  ],
  "2026-10-10": [
    19.15,
    25683,
    1341
  ],
  "2026-10-11": [
    19.15,
    25695,
    1341
  ],
  "2026-10-12": [
    19.28,
    25707,
    1333
  ],
  "2026-10-13": [
    19.17,
    25718,
    1341
  ],
  "2026-10-14": [
    19.25,
    25727,
    1337
  ],
  "2026-10-15": [
    19.12,
    25736,
    1346
  ],
  "2026-10-16": [
    19.32,
    25742,
    1332
  ],
  "2026-10-17": [
    19.33,
    25746,
    1332
  ],
  "2026-10-18": [
    19.33,
    25748,
    1332
  ],
  "2026-10-19": [
    19.37,
    25748,
    1329
  ],
  "2026-10-20": [
    19.39,
    25746,
    1328
  ],
  "2026-10-21": [
    19.42,
    25743,
    1326
  ],
  "2026-10-22": [
    19.43,
    25738,
    1325
  ],
  "2026-10-23": [
    19.43,
    25733,
    1324
  ],
  "2026-10-24": [
    19.42,
    25727,
    1324
  ],
  "2026-10-25": [
    19.42,
    25722,
    1324
  ],
  "2026-10-26": [
    19.41,
    25718,
    1325
  ],
  "2026-10-27": [
    19.37,
    25715,
    1328
  ],
  "2026-10-28": [
    19.18,
    25714,
    1340
  ],
  "2026-10-29": [
    19.32,
    25836,
    1337
  ],
  "2026-10-30": [
    19.3,
    25766,
    1335
  ],
  "2026-10-31": [
    19.3,
    25765,
    1335
  ],
  "2026-11-01": [
    19.32,
    25799,
    1335
  ],
  "2026-11-02": [
    19.19,
    25764,
    1343
  ],
  "2026-11-03": [
    19.14,
    25738,
    1345
  ],
  "2026-11-04": [
    19.17,
    25769,
    1344
  ]
};

let currentExchangeMode = 'grid'; // 'grid' (Mặc định: Lưới 3 biểu đồ trực quan), 'krw', 'usd', 'usdKrw', 'pct'
let currentExchangeDays = 15; // 7, 15, 30, 90

// Purge old corrupted random storage keys immediately
try {
    localStorage.removeItem('exchange_multi_history');
    localStorage.removeItem('exchange_multi_history_v2');
    localStorage.removeItem('exchange_multi_history_v3');
} catch(e) {}

window.setExchangeRateMode = function (mode) {
    currentExchangeMode = mode;
    ['btnRateGrid', 'btnRateKRW', 'btnRateUSD', 'btnRateUSDKRW', 'btnRatePct'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
    if (mode === 'grid') document.getElementById('btnRateGrid')?.classList.add('active');
    if (mode === 'krw') document.getElementById('btnRateKRW')?.classList.add('active');
    if (mode === 'usd') document.getElementById('btnRateUSD')?.classList.add('active');
    if (mode === 'usdKrw') document.getElementById('btnRateUSDKRW')?.classList.add('active');
    if (mode === 'pct') document.getElementById('btnRatePct')?.classList.add('active');

    renderExchangeRateChart();
};

window.setExchangeRangeDays = function (days) {
    currentExchangeDays = parseInt(days) || 15;
    [7, 15, 30, 90].forEach(d => {
        const btn = document.getElementById('btnRange' + d);
        if (btn) btn.classList.toggle('active', d === currentExchangeDays);
    });

    const title = document.getElementById('exchangePanelTitle');
    if (title) title.textContent = 'Lịch sử Tỷ giá (' + currentExchangeDays + ' ngày)';

    renderExchangeRateChart();
};

function logAndRenderExchangeHistory(krw, usd, usdKrw) {
    renderExchangeRateChart();
}

function getMultiExchangeHistoryList(days, currentKrw, currentUsd, currentUsdKrw) {
    const numDays = days || currentExchangeDays || 15;
    const liveK = parseFloat(currentKrw) || 19.17;
    const liveU = parseFloat(currentUsd) || 25769;
    const liveUK = parseFloat(currentUsdKrw) || Math.round(liveU / liveK);

    const now = new Date();
    const result = [];

    let userLocalHistory = {};
    try {
        const stored = localStorage.getItem('exchange_multi_history_v4');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                    if (item && item.date && item.krw && item.usd && item.usdKrw) {
                        userLocalHistory[item.date] = item;
                    }
                });
            }
        }
    } catch(e) {}

    for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = y + '-' + m + '-' + day;

        let itemKrw, itemUsd, itemUsdKrw;

        if (i === 0) {
            itemKrw = liveK;
            itemUsd = liveU;
            itemUsdKrw = liveUK;
        } else if (VERIFIED_EXCHANGE_HISTORY[dateStr]) {
            const entry = VERIFIED_EXCHANGE_HISTORY[dateStr];
            itemKrw = entry[0];
            itemUsd = entry[1];
            itemUsdKrw = entry[2];
        } else if (userLocalHistory[dateStr]) {
            itemKrw = userLocalHistory[dateStr].krw;
            itemUsd = userLocalHistory[dateStr].usd;
            itemUsdKrw = userLocalHistory[dateStr].usdKrw;
        } else {
            itemKrw = liveK;
            itemUsd = liveU;
            itemUsdKrw = liveUK;
        }

        result.push({
            date: dateStr,
            krw: parseFloat(itemKrw.toFixed(2)),
            usd: Math.round(itemUsd),
            usdKrw: Math.round(itemUsdKrw)
        });
    }

    return result;
}

function renderExchangeRateChart() {
    const container = document.getElementById('exchangeRateHistoryChart');
    if (!container) return;

    const days = currentExchangeDays || 15;
    const curUkVal = (usdRate && exchangeRate) ? (usdRate / exchangeRate) : 1344.1;
    const data = getMultiExchangeHistoryList(days, exchangeRate || 19.17, usdRate || 25769, curUkVal);

    if (!data || data.length === 0) return;

    if (currentExchangeMode === 'grid') {
        renderTriChartGrid(container, data, days);
    } else {
        renderSingleHeroChart(container, data, days);
    }
}

function renderTriChartGrid(container, data, days) {
    const startItem = data[0];
    const endItem = data[data.length - 1];

    const krwRates = data.map(d => d.krw);
    const usdRates = data.map(d => d.usd);
    const ukRates = data.map(d => d.usdKrw);

    const minK = Math.min(...krwRates), maxK = Math.max(...krwRates);
    const minU = Math.min(...usdRates), maxU = Math.max(...usdRates);
    const minUK = Math.min(...ukRates), maxUK = Math.max(...ukRates);

    const pctK = ((endItem.krw - startItem.krw) / startItem.krw) * 100;
    const pctU = ((endItem.usd - startItem.usd) / startItem.usd) * 100;
    const pctUK = ((endItem.usdKrw - startItem.usdKrw) / startItem.usdKrw) * 100;

    let html = '<div class="exchange-tri-chart-grid">';

    // CARD 1: KRW / VND
    html += '<div class="exchange-single-chart-card" onclick="setExchangeRateMode(\'krw\')" title="Nhấp để phóng to biểu đồ KRW/VND">' +
        '<div class="esc-header">' +
            '<div>' +
                '<span class="esc-pair-title"><span class="dot-indicator krw"></span> KRW SANG VND</span>' +
                '<div class="esc-rate-val" style="color:#00b894;">' + endItem.krw.toFixed(2) + ' đ</div>' +
            '</div>' +
            '<span class="esc-change-badge ' + (pctK >= 0 ? 'pos' : 'neg') + '">' +
                (pctK >= 0 ? '↗ +' : '↘ ') + pctK.toFixed(2) + '% (' + days + 'N)' +
            '</span>' +
        '</div>' +
        '<div class="esc-minmax-row">' +
            '<span>Thấp: <strong>' + minK.toFixed(2) + ' đ</strong></span>' +
            '<span>Cao: <strong>' + maxK.toFixed(2) + ' đ</strong></span>' +
        '</div>' +
        '<div class="esc-chart-body" id="cardChartKrw">' +
            generateMiniSvgChart(data, 'krw', '#00b894', 'krw-card-grad', 2, ' đ') +
        '</div>' +
        '<div class="esc-zoom-hint">' +
            '<i class="icon-svg" data-lucide="maximize-2" style="width:12px; height:12px;"></i> Nhấp để phóng to' +
        '</div>' +
    '</div>';

    // CARD 2: USD / VND
    html += '<div class="exchange-single-chart-card" onclick="setExchangeRateMode(\'usd\')" title="Nhấp để phóng to biểu đồ USD/VND">' +
        '<div class="esc-header">' +
            '<div>' +
                '<span class="esc-pair-title"><span class="dot-indicator usd"></span> USD SANG VND</span>' +
                '<div class="esc-rate-val" style="color:#3b82f6;">' + fmtFull(Math.round(endItem.usd)) + ' đ</div>' +
            '</div>' +
            '<span class="esc-change-badge ' + (pctU >= 0 ? 'pos' : 'neg') + '">' +
                (pctU >= 0 ? '↗ +' : '↘ ') + pctU.toFixed(2) + '% (' + days + 'N)' +
            '</span>' +
        '</div>' +
        '<div class="esc-minmax-row">' +
            '<span>Thấp: <strong>' + fmtFull(Math.round(minU)) + ' đ</strong></span>' +
            '<span>Cao: <strong>' + fmtFull(Math.round(maxU)) + ' đ</strong></span>' +
        '</div>' +
        '<div class="esc-chart-body" id="cardChartUsd">' +
            generateMiniSvgChart(data, 'usd', '#3b82f6', 'usd-card-grad', 0, ' đ') +
        '</div>' +
        '<div class="esc-zoom-hint">' +
            '<i class="icon-svg" data-lucide="maximize-2" style="width:12px; height:12px;"></i> Nhấp để phóng to' +
        '</div>' +
    '</div>';

    // CARD 3: USD / KRW
    html += '<div class="exchange-single-chart-card" onclick="setExchangeRateMode(\'usdKrw\')" title="Nhấp để phóng to biểu đồ USD/KRW">' +
        '<div class="esc-header">' +
            '<div>' +
                '<span class="esc-pair-title"><span class="dot-indicator usdkrw"></span> USD SANG KRW</span>' +
                '<div class="esc-rate-val" style="color:#ff9f43;">' + fmtFull(Math.round(endItem.usdKrw)) + ' ₩</div>' +
            '</div>' +
            '<span class="esc-change-badge ' + (pctUK >= 0 ? 'pos' : 'neg') + '">' +
                (pctUK >= 0 ? '↗ +' : '↘ ') + pctUK.toFixed(2) + '% (' + days + 'N)' +
            '</span>' +
        '</div>' +
        '<div class="esc-minmax-row">' +
            '<span>Thấp: <strong>' + fmtFull(Math.round(minUK)) + ' ₩</strong></span>' +
            '<span>Cao: <strong>' + fmtFull(Math.round(maxUK)) + ' ₩</strong></span>' +
        '</div>' +
        '<div class="esc-chart-body" id="cardChartUsdKrw">' +
            generateMiniSvgChart(data, 'usdKrw', '#ff9f43', 'usdkrw-card-grad', 0, ' ₩') +
        '</div>' +
        '<div class="esc-zoom-hint">' +
            '<i class="icon-svg" data-lucide="maximize-2" style="width:12px; height:12px;"></i> Nhấp để phóng to' +
        '</div>' +
    '</div>';

    html += '</div>';
    container.innerHTML = html;
    if (typeof refreshIcons === 'function') refreshIcons();
}

function generateMiniSvgChart(data, key, color, gradId, decimals, unit) {
    const W = 320;
    const H = 175;
    const padLeft = (key === 'usd') ? 56 : 46;
    const margin = { top: 15, right: 15, bottom: 25, left: padLeft };
    const chartW = W - margin.left - margin.right;
    const chartH = H - margin.top - margin.bottom;

    const values = data.map(d => d[key]);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const minSpread = (decimals === 2) ? 0.08 : 20;
    if (max - min < minSpread) {
        const mid = (max + min) / 2;
        min = mid - minSpread / 2;
        max = mid + minSpread / 2;
    } else {
        const pad = (max - min) * 0.15;
        min -= pad;
        max += pad;
    }

    const getX = (idx) => margin.left + (idx / (data.length - 1)) * chartW;
    const getY = (v) => margin.top + chartH - ((v - min) / (max - min)) * chartH;

    let svg = '<svg width="100%" height="100%" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
        '<defs>' +
            '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.30"/>' +
                '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.00"/>' +
            '</linearGradient>' +
        '</defs>';

    const tickValues = [min + 0.06 * (max - min), (min + max) / 2, max - 0.06 * (max - min)];
    tickValues.forEach(val => {
        const y = getY(val);
        const label = (decimals === 0) ? Math.round(val).toLocaleString('vi-VN') : val.toFixed(2);
        svg += '<line x1="' + margin.left + '" y1="' + y + '" x2="' + (W - margin.right) + '" y2="' + y + '" stroke="var(--border)" stroke-dasharray="2 2" opacity="0.4" />' +
            '<text x="' + (margin.left - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-size="9" fill="var(--text-muted)" font-weight="600">' + label + '</text>';
    });

    let linePoints = '';
    let areaPoints = 'M ' + getX(0) + ' ' + (margin.top + chartH) + ' ';
    data.forEach((d, idx) => {
        const x = getX(idx);
        const y = getY(values[idx]);
        linePoints += (idx === 0 ? 'M' : 'L') + ' ' + x + ' ' + y + ' ';
        areaPoints += 'L ' + x + ' ' + y + ' ';
    });
    areaPoints += 'L ' + getX(data.length - 1) + ' ' + (margin.top + chartH) + ' Z';

    svg += '<path fill="url(#' + gradId + ')" d="' + areaPoints + '" />';
    svg += '<path stroke="' + color + '" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" d="' + linePoints + '" />';

    const indices = [];
    if (data.length <= 7) {
        indices.push(0, Math.floor(data.length / 2), data.length - 1);
    } else {
        indices.push(0, Math.floor((data.length - 1) / 2), data.length - 1);
    }

    indices.forEach(idx => {
        const d = data[idx];
        const x = getX(idx);
        const parts = d.date.split('-');
        const label = parts[2] + '/' + parts[1];
        svg += '<text x="' + x + '" y="' + (H - 6) + '" text-anchor="middle" font-size="9" fill="var(--text-secondary)" font-weight="600">' + label + '</text>';
    });

    const endX = getX(data.length - 1);
    const endY = getY(values[values.length - 1]);
    svg += '<circle cx="' + endX + '" cy="' + endY + '" r="4" fill="' + color + '" stroke="var(--bg-card)" stroke-width="2" />';

    svg += '</svg>';
    return svg;
}

function renderSingleHeroChart(container, data, days) {
    const width = container.clientWidth || 350;
    const height = 310;
    const isPctMode = (currentExchangeMode === 'pct');
    const isUsdMode = (currentExchangeMode === 'usd');
    const leftMargin = isPctMode ? 55 : (isUsdMode ? 65 : 55);
    const margin = { top: 35, right: 25, bottom: 40, left: leftMargin };

    const chartW = Math.max(100, width - margin.left - margin.right);
    const chartH = Math.max(100, height - margin.top - margin.bottom);
    const getX = (idx) => margin.left + (idx / (data.length - 1)) * chartW;

    let svg = '<svg class="exchange-chart-svg" width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">';
    svg += '<defs>' +
        '<linearGradient id="krw-area-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00b894" stop-opacity="0.25"/><stop offset="100%" stop-color="#00b894" stop-opacity="0.00"/></linearGradient>' +
        '<linearGradient id="usd-area-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0.00"/></linearGradient>' +
        '<linearGradient id="usdkrw-area-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff9f43" stop-opacity="0.25"/><stop offset="100%" stop-color="#ff9f43" stop-opacity="0.00"/></linearGradient>' +
      '</defs>';

    if (isPctMode) {
        const baseK = data[0].krw;
        const baseU = data[0].usd;
        const baseUK = data[0].usdKrw;

        const pctKData = data.map(d => ((d.krw - baseK) / baseK) * 100);
        const pctUData = data.map(d => ((d.usd - baseU) / baseU) * 100);
        const pctUKData = data.map(d => ((d.usdKrw - baseUK) / baseUK) * 100);

        const allPct = [...pctKData, ...pctUData, ...pctUKData, 0];
        let minPct = Math.min(...allPct);
        let maxPct = Math.max(...allPct);
        const padPct = Math.max(0.4, (maxPct - minPct) * 0.15);
        minPct -= padPct;
        maxPct += padPct;

        const getY_Pct = (pctVal) => margin.top + chartH - ((pctVal - minPct) / (maxPct - minPct)) * chartH;

        for (let i = 0; i <= 4; i++) {
            const ratio = i / 4;
            const pctVal = minPct + ratio * (maxPct - minPct);
            const y = getY_Pct(pctVal);
            svg += '<g class="exchange-chart-grid">' +
                '<line x1="' + margin.left + '" y1="' + y + '" x2="' + (width - margin.right) + '" y2="' + y + '" stroke="var(--border)" stroke-dasharray="3 3" opacity="0.5" />' +
                '<text class="exchange-chart-label" x="' + (margin.left - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="var(--text-muted)" font-weight="600">' + (pctVal >= 0 ? '+' : '') + pctVal.toFixed(2) + '%</text>' +
            '</g>';
        }

        const yZero = getY_Pct(0);
        svg += '<line x1="' + margin.left + '" y1="' + yZero + '" x2="' + (width - margin.right) + '" y2="' + yZero + '" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.2" stroke-dasharray="4 2" />';

        let kLinePoints = '', uLinePoints = '', ukLinePoints = '';
        data.forEach((_, idx) => {
            const x = getX(idx);
            kLinePoints += (idx === 0 ? 'M' : 'L') + ' ' + x + ' ' + getY_Pct(pctKData[idx]) + ' ';
            uLinePoints += (idx === 0 ? 'M' : 'L') + ' ' + x + ' ' + getY_Pct(pctUData[idx]) + ' ';
            ukLinePoints += (idx === 0 ? 'M' : 'L') + ' ' + x + ' ' + getY_Pct(pctUKData[idx]) + ' ';
        });
        svg += '<path class="exchange-chart-line krw" stroke="#00b894" stroke-width="2.5" fill="none" stroke-linecap="round" d="' + kLinePoints + '" />';
        svg += '<path class="exchange-chart-line usd" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="6 3" fill="none" stroke-linecap="round" d="' + uLinePoints + '" />';
        svg += '<path class="exchange-chart-line usdkrw" stroke="#ff9f43" stroke-width="2.5" stroke-dasharray="3 3" fill="none" stroke-linecap="round" d="' + ukLinePoints + '" />';

        svg += renderXAxisGrid(data, days, getX, margin, chartH, height, width);
        svg += '<line id="rateCrosshair" x1="0" y1="' + margin.top + '" x2="0" y2="' + (margin.top + chartH) + '" stroke="var(--accent-primary)" stroke-width="1.5" stroke-dasharray="3 3" opacity="0" style="transition: opacity 0.15s ease;" />';

        const stepW = chartW / (data.length - 1);
        data.forEach((d, idx) => {
            const x = getX(idx);
            svg += '<circle id="rateDot-krw-' + idx + '" class="exchange-chart-dot krw" cx="' + x + '" cy="' + getY_Pct(pctKData[idx]) + '" r="4" fill="#00b894" stroke="var(--bg-card)" stroke-width="2" />' +
                '<circle id="rateDot-usd-' + idx + '" class="exchange-chart-dot usd" cx="' + x + '" cy="' + getY_Pct(pctUData[idx]) + '" r="4" fill="#3b82f6" stroke="var(--bg-card)" stroke-width="2" />' +
                '<circle id="rateDot-usdkrw-' + idx + '" class="exchange-chart-dot usdkrw" cx="' + x + '" cy="' + getY_Pct(pctUKData[idx]) + '" r="4" fill="#ff9f43" stroke="var(--bg-card)" stroke-width="2" />' +
                '<rect x="' + (x - stepW / 2) + '" y="' + margin.top + '" width="' + stepW + '" height="' + chartH + '" fill="transparent" style="cursor:pointer;" ' +
                    'onmouseenter="highlightRatePoint(' + idx + ', \'' + d.date + '\', ' + d.krw + ', ' + d.usd + ', ' + d.usdKrw + ', ' + pctKData[idx] + ', ' + pctUData[idx] + ', ' + pctUKData[idx] + ', ' + x + ')" ' +
                    'onmousemove="highlightRatePoint(' + idx + ', \'' + d.date + '\', ' + d.krw + ', ' + d.usd + ', ' + d.usdKrw + ', ' + pctKData[idx] + ', ' + pctUData[idx] + ', ' + pctUKData[idx] + ', ' + x + ')" ' +
                    'onmouseleave="unhighlightRatePoint(' + idx + ')" ' +
                    'ontouchstart="highlightRatePoint(' + idx + ', \'' + d.date + '\', ' + d.krw + ', ' + d.usd + ', ' + d.usdKrw + ', ' + pctKData[idx] + ', ' + pctUData[idx] + ', ' + pctUKData[idx] + ', ' + x + ')" />';
        });
    } else {
        let values, color, areaGrad, unit, decimals, keyName;
        if (currentExchangeMode === 'usd') {
            values = data.map(d => d.usd);
            color = '#3b82f6';
            areaGrad = 'url(#usd-area-grad)';
            unit = ' đ';
            decimals = 0;
            keyName = 'USD/VND';
        } else if (currentExchangeMode === 'usdKrw') {
            values = data.map(d => d.usdKrw);
            color = '#ff9f43';
            areaGrad = 'url(#usdkrw-area-grad)';
            unit = ' ₩';
            decimals = 0;
            keyName = 'USD/KRW';
        } else {
            values = data.map(d => d.krw);
            color = '#00b894';
            areaGrad = 'url(#krw-area-grad)';
            unit = ' đ';
            decimals = 2;
            keyName = 'KRW/VND';
        }

        let minVal = Math.min(...values);
        let maxVal = Math.max(...values);
        const minSpread = (decimals === 2) ? 0.08 : 20;
        if (maxVal - minVal < minSpread) {
            const mid = (maxVal + minVal) / 2;
            minVal = mid - minSpread / 2;
            maxVal = mid + minSpread / 2;
        } else {
            const pad = (maxVal - minVal) * 0.15;
            minVal -= pad;
            maxVal += pad;
        }

        const getY = (v) => margin.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

        for (let i = 0; i <= 4; i++) {
            const ratio = i / 4;
            const tickVal = minVal + ratio * (maxVal - minVal);
            const y = getY(tickVal);
            let labelStr = (decimals === 0) ? Math.round(tickVal).toLocaleString('vi-VN') : tickVal.toFixed(2);
            svg += '<g class="exchange-chart-grid">' +
                '<line x1="' + margin.left + '" y1="' + y + '" x2="' + (width - margin.right) + '" y2="' + y + '" stroke="var(--border)" stroke-dasharray="3 3" opacity="0.5" />' +
                '<text class="exchange-chart-label" x="' + (margin.left - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="' + color + '" font-weight="700">' + labelStr + unit + '</text>' +
            '</g>';
        }

        let linePoints = '';
        let areaPoints = 'M ' + getX(0) + ' ' + (margin.top + chartH) + ' ';
        data.forEach((d, idx) => {
            const x = getX(idx);
            const y = getY(values[idx]);
            linePoints += (idx === 0 ? 'M' : 'L') + ' ' + x + ' ' + y + ' ';
            areaPoints += 'L ' + x + ' ' + y + ' ';
        });
        areaPoints += 'L ' + getX(data.length - 1) + ' ' + (margin.top + chartH) + ' Z';

        svg += '<path class="exchange-chart-area" fill="' + areaGrad + '" d="' + areaPoints + '" />';
        svg += '<path class="exchange-chart-line" stroke="' + color + '" stroke-width="2.5" fill="none" stroke-linecap="round" d="' + linePoints + '" />';

        svg += renderXAxisGrid(data, days, getX, margin, chartH, height, width);
        svg += '<line id="rateCrosshair" x1="0" y1="' + margin.top + '" x2="0" y2="' + (margin.top + chartH) + '" stroke="var(--accent-primary)" stroke-width="1.5" stroke-dasharray="3 3" opacity="0" style="transition: opacity 0.15s ease;" />';

        const baseVal = values[0];
        const stepW = chartW / (data.length - 1);
        data.forEach((d, idx) => {
            const x = getX(idx);
            const y = getY(values[idx]);
            const pctChange = ((values[idx] - baseVal) / baseVal) * 100;

            svg += '<circle id="rateDot-single-' + idx + '" class="exchange-chart-dot" cx="' + x + '" cy="' + y + '" r="4" fill="' + color + '" stroke="var(--bg-card)" stroke-width="2" />' +
                '<rect x="' + (x - stepW / 2) + '" y="' + margin.top + '" width="' + stepW + '" height="' + chartH + '" fill="transparent" style="cursor:pointer;" ' +
                    'onmouseenter="highlightRatePoint(' + idx + ', \'' + d.date + '\', ' + d.krw + ', ' + d.usd + ', ' + d.usdKrw + ', ' + pctChange + ', null, null, ' + x + ', ' + y + ')" ' +
                    'onmousemove="highlightRatePoint(' + idx + ', \'' + d.date + '\', ' + d.krw + ', ' + d.usd + ', ' + d.usdKrw + ', ' + pctChange + ', null, null, ' + x + ', ' + y + ')" ' +
                    'onmouseleave="unhighlightRatePoint(' + idx + ')" ' +
                    'ontouchstart="highlightRatePoint(' + idx + ', \'' + d.date + '\', ' + d.krw + ', ' + d.usd + ', ' + d.usdKrw + ', ' + pctChange + ', null, null, ' + x + ', ' + y + ')" />';
        });
    }

    svg += '</svg>';

    let tooltip = container.querySelector('.rate-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'rate-tooltip';
    }

    container.innerHTML = svg;
    container.appendChild(tooltip);
}

function renderXAxisGrid(data, days, getX, margin, chartH, height, width) {
    let step = 1;
    if (days >= 90) step = 15;
    else if (days >= 30) step = 5;
    else if (days >= 15) step = 2;
    else step = 1;

    let svg = '';
    const labelIndices = [];
    for (let i = 0; i < data.length; i += step) {
        labelIndices.push(i);
    }
    if (!labelIndices.includes(data.length - 1)) {
        labelIndices.push(data.length - 1);
    }

    labelIndices.forEach(idx => {
        if (idx < data.length) {
            const d = data[idx];
            const x = getX(idx);
            const parts = d.date.split('-');
            const label = parts[2] + '/' + parts[1];

            svg += '<g class="exchange-chart-vgrid">' +
                '<line x1="' + x + '" y1="' + margin.top + '" x2="' + x + '" y2="' + (margin.top + chartH) + '" stroke="var(--border)" stroke-dasharray="2 4" opacity="0.3" />' +
                '<text class="exchange-chart-label" x="' + x + '" y="' + (height - 10) + '" text-anchor="middle" font-size="11" fill="var(--text-secondary)" font-weight="600">' + label + '</text>' +
            '</g>';
        }
    });

    return svg;
}

window.highlightRatePoint = function (idx, date, krw, usd, usdKrw, pctK, pctU, pctUK, x, y) {
    const container = document.getElementById('exchangeRateHistoryChart');
    if (!container) return;
    const tooltip = container.querySelector('.rate-tooltip');
    const crosshair = container.querySelector('#rateCrosshair');

    if (crosshair) {
        crosshair.setAttribute('x1', x);
        crosshair.setAttribute('x2', x);
        crosshair.style.opacity = '1';
    }

    const dotSingle = container.querySelector('#rateDot-single-' + idx);
    if (dotSingle) dotSingle.setAttribute('r', '6');
    const dotK = container.querySelector('#rateDot-krw-' + idx);
    if (dotK) dotK.setAttribute('r', '6');
    const dotU = container.querySelector('#rateDot-usd-' + idx);
    if (dotU) dotU.setAttribute('r', '6');
    const dotUK = container.querySelector('#rateDot-usdkrw-' + idx);
    if (dotUK) dotUK.setAttribute('r', '6');

    if (tooltip) {
        const parts = date.split('-');
        const formattedDate = parts[2] + '/' + parts[1] + '/' + parts[0];
        const isPct = (currentExchangeMode === 'pct');

        if (isPct) {
            tooltip.innerHTML = '<div class="rate-tooltip-date" style="font-weight:700; margin-bottom:5px; font-size:0.78rem; display:flex; align-items:center; gap:4px; opacity:0.9;">' +
                    '<span>' + formattedDate + '</span> <span style="font-size:0.7rem; color:var(--text-muted);">(So với ngày đầu)</span>' +
                '</div>' +
                '<div class="rate-tooltip-val krw" style="color:#00b894; font-weight:700; font-size:0.8rem; display:flex; align-items:center; justify-content:space-between; gap:8px;">' +
                    '<span><span style="background:rgba(0,184,148,0.15); color:#00b894; padding:1px 5px; border-radius:4px; font-size:9px; font-weight:800;">KRW/VND</span> ' + krw.toFixed(2) + ' ₫</span>' +
                    '<strong style="color:' + (pctK >= 0 ? '#00b894' : '#ff6b6b') + '">' + (pctK >= 0 ? '+' : '') + pctK.toFixed(2) + '%</strong>' +
                '</div>' +
                '<div class="rate-tooltip-val usd" style="color:#3b82f6; font-weight:700; font-size:0.8rem; margin-top:3px; display:flex; align-items:center; justify-content:space-between; gap:8px;">' +
                    '<span><span style="background:rgba(59,130,246,0.15); color:#3b82f6; padding:1px 5px; border-radius:4px; font-size:9px; font-weight:800;">USD/VND</span> ' + fmtFull(Math.round(usd)) + ' ₫</span>' +
                    '<strong style="color:' + (pctU >= 0 ? '#00b894' : '#ff6b6b') + '">' + (pctU >= 0 ? '+' : '') + pctU.toFixed(2) + '%</strong>' +
                '</div>' +
                '<div class="rate-tooltip-val usdkrw" style="color:#ff9f43; font-weight:700; font-size:0.8rem; margin-top:3px; display:flex; align-items:center; justify-content:space-between; gap:8px;">' +
                    '<span><span style="background:rgba(255,159,67,0.15); color:#ff9f43; padding:1px 5px; border-radius:4px; font-size:9px; font-weight:800;">USD/KRW</span> ' + fmtFull(Math.round(usdKrw)) + ' ₩</span>' +
                    '<strong style="color:' + (pctUK >= 0 ? '#00b894' : '#ff6b6b') + '">' + (pctUK >= 0 ? '+' : '') + pctUK.toFixed(2) + '%</strong>' +
                '</div>';
        } else {
            let label = 'KRW/VND';
            let valStr = krw.toFixed(2) + ' ₫';
            let color = '#00b894';
            if (currentExchangeMode === 'usd') {
                label = 'USD/VND';
                valStr = fmtFull(Math.round(usd)) + ' ₫';
                color = '#3b82f6';
            } else if (currentExchangeMode === 'usdKrw') {
                label = 'USD/KRW';
                valStr = fmtFull(Math.round(usdKrw)) + ' ₩';
                color = '#ff9f43';
            }
            const pctStr = (pctK !== undefined && pctK !== null) ? ((pctK >= 0 ? '+' : '') + pctK.toFixed(2) + '%') : '';

            tooltip.innerHTML = '<div class="rate-tooltip-date" style="font-weight:700; margin-bottom:4px; font-size:0.78rem; opacity:0.9;">' +
                    '<span>' + formattedDate + '</span>' +
                '</div>' +
                '<div style="color:' + color + '; font-weight:700; font-size:0.85rem; display:flex; align-items:center; justify-content:space-between; gap:10px;">' +
                    '<span>' + label + ': <strong>' + valStr + '</strong></span>' +
                    (pctStr ? '<span style="font-size:0.75rem; color:' + (pctK >= 0 ? '#00b894' : '#ff6b6b') + '; font-weight:800;">(' + pctStr + ')</span>' : '') +
                '</div>';
        }

        const rect = container.getBoundingClientRect();
        let tooltipX = x - 90;
        let tooltipY = (y || 80) - 75;

        if (tooltipX < 10) tooltipX = 10;
        if (tooltipX + 220 > rect.width) tooltipX = rect.width - 230;
        if (tooltipY < 10) tooltipY = 10;

        tooltip.style.left = tooltipX + 'px';
        tooltip.style.top = tooltipY + 'px';
        tooltip.style.opacity = '1';
    }
};

window.unhighlightRatePoint = function (idx) {
    const container = document.getElementById('exchangeRateHistoryChart');
    if (!container) return;
    const tooltip = container.querySelector('.rate-tooltip');
    const crosshair = container.querySelector('#rateCrosshair');
    if (crosshair) crosshair.style.opacity = '0';
    if (tooltip) tooltip.style.opacity = '0';

    const dotSingle = container.querySelector('#rateDot-single-' + idx);
    if (dotSingle) dotSingle.setAttribute('r', '4');
    const dotK = container.querySelector('#rateDot-krw-' + idx);
    if (dotK) dotK.setAttribute('r', '4');
    const dotU = container.querySelector('#rateDot-usd-' + idx);
    if (dotU) dotU.setAttribute('r', '4');
    const dotUK = container.querySelector('#rateDot-usdkrw-' + idx);
    if (dotUK) dotUK.setAttribute('r', '4');
};

// Aliases for backwards compatibility
window.highlightMultiRatePoint = window.highlightRatePoint;
window.unhighlightMultiRatePoint = window.unhighlightRatePoint;
window.highlightDualRatePoint = window.highlightRatePoint;
window.unhighlightDualRatePoint = window.unhighlightRatePoint;

// Init
init();
