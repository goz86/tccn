// ========================================================
// GOZ PRO - PORTFOLIO & ASSET MANAGEMENT MODULE
// ========================================================

const DEFAULT_PORTFOLIO_ASSETS = [
    // Crypto (Matching Image 2)
    { id: 'def_btc', type: 'crypto', symbol: 'BTC', name: 'Bitcoin', amount: 0.085, buy_price: 62500, current_price: 76681.09, currency: 'USD' },
    { id: 'def_eth', type: 'crypto', symbol: 'ETH', name: 'Ethereum', amount: 1.2, buy_price: 2950, current_price: 2249.55, currency: 'USD' },
    { id: 'def_sol', type: 'crypto', symbol: 'SOL', name: 'Solana', amount: 15, buy_price: 142, current_price: 91.74, currency: 'USD' },
    { id: 'def_usdt', type: 'crypto', symbol: 'USDT', name: 'Tether USD', amount: 1250, buy_price: 1.0, current_price: 1.0, currency: 'USD' },
    // Stocks VN (Matching Image 2)
    { id: 'def_fpt', type: 'stock_vn', symbol: 'FPT', name: 'Tập đoàn FPT (Công nghệ)', amount: 680, buy_price: 125000, current_price: 58200, currency: 'VND' },
    { id: 'def_hpg', type: 'stock_vn', symbol: 'HPG', name: 'Tập đoàn Hòa Phát (Thép)', amount: 1200, buy_price: 31000, current_price: 28400, currency: 'VND' },
    { id: 'def_vcb', type: 'stock_vn', symbol: 'VCB', name: 'Ngân hàng Vietcombank', amount: 500, buy_price: 51500, current_price: 53000, currency: 'VND' },
    // Cash & Banks (Matching Image 2 totals)
    { id: 'def_krw_bank', type: 'cash', symbol: 'KRW', name: 'Ngân hàng Hàn Quốc (Shinhan)', amount: 3500000, buy_price: 1, current_price: 1, currency: 'KRW' },
    { id: 'def_vnd_bank', type: 'cash', symbol: 'VND', name: 'Ngân hàng Việt Nam (Techcombank)', amount: 43600000, buy_price: 1, current_price: 1, currency: 'VND' }
];

let portfolioAssets = [];
let currentAssetFilter = 'all'; // 'all', 'crypto', 'stock_vn', 'cash'
let displayCurrency = localStorage.getItem('goz_display_currency') || 'KRW';
let isPrivacyMode = localStorage.getItem('goz_privacy_mode') === 'true';
let chartViewMode = 'combo'; // 'combo', 'bar', 'line'

// Helper: Convert between currencies
function convertCurrency(amount, fromCur, toCur) {
    if (!amount || fromCur === toCur) return Number(amount) || 0;
    const r = (window.exchangeRate && window.exchangeRate > 0) ? window.exchangeRate : 19.15; // 1 KRW = r VND
    const u = (window.usdRate && window.usdRate > 0) ? window.usdRate : 25744;               // 1 USD = u VND
    let inVND = 0;
    if (fromCur === 'VND') inVND = Number(amount);
    else if (fromCur === 'KRW') inVND = Number(amount) * r;
    else if (fromCur === 'USD') inVND = Number(amount) * u;

    if (toCur === 'VND') return inVND;
    if (toCur === 'KRW') return r > 0 ? inVND / r : inVND;
    if (toCur === 'USD') return u > 0 ? inVND / u : inVND;
    return inVND;
}

// Helper: Format amount with active display currency
function fmtDisplayCur(val, cur = displayCurrency) {
    if (isPrivacyMode) return '••••••••';
    const num = Math.round(val);
    if (cur === 'KRW') return num.toLocaleString('vi-VN') + ' ₩';
    if (cur === 'VND') return num.toLocaleString('vi-VN') + ' ₫';
    if (cur === 'USD') return '$' + (Math.round(val * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num.toLocaleString('vi-VN');
}

// Currency Selector
window.setDisplayCurrency = function (cur) {
    displayCurrency = cur;
    localStorage.setItem('goz_display_currency', cur);
    ['curBtnVND', 'curBtnKRW', 'curBtnUSD'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'curBtn' + cur) el.classList.add('active');
            else el.classList.remove('active');
        }
    });
    document.querySelectorAll('.cur-btn').forEach(btn => {
        if (btn.dataset && btn.dataset.cur) {
            if (btn.dataset.cur === cur) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
    if (typeof window.invalidateTabCache === "function") window.invalidateTabCache();
    renderPortfolio();
    updateOverviewCards();
    if (typeof window.showToast === 'function') window.showToast('Đã đổi đơn vị hiển thị: ' + cur, 'info');
};

// Privacy Mode (Lock icon toggle)
window.togglePrivacyMode = function () {
    isPrivacyMode = !isPrivacyMode;
    localStorage.setItem('goz_privacy_mode', isPrivacyMode);
    const icon = document.getElementById('privacyIcon');
    const btn = document.getElementById('privacyToggleBtn');
    if (icon) {
        icon.setAttribute('data-lucide', isPrivacyMode ? 'lock' : 'lock-open');
        if (typeof window.refreshIcons === 'function') window.refreshIcons();
    }
    if (btn) {
        btn.classList.toggle('active', isPrivacyMode);
        btn.setAttribute('title', isPrivacyMode ? 'Đang khóa bảo mật số dư (Bấm để mở)' : 'Khóa bảo mật số dư (Bấm để ẩn)');
    }
    renderPortfolio();
    updateOverviewCards();
    if (typeof window.showToast === 'function') {
        window.showToast(isPrivacyMode ? 'Đã khóa bảo mật số dư' : 'Đã mở khóa hiển thị số dư', 'info');
    }
};


// Filter Category Tabs
window.setAssetFilter = function (filter) {
    currentAssetFilter = filter;
    ['all', 'crypto', 'stock_vn', 'cash'].forEach(f => {
        const pill = document.getElementById('filter-asset-' + f);
        if (pill) {
            if (f === filter) pill.classList.add('active');
            else pill.classList.remove('active');
        }
    });

    const secCrypto = document.getElementById('sectionCrypto');
    const secStocks = document.getElementById('sectionStocks');
    const secCash = document.getElementById('sectionCash');

    if (secCrypto) secCrypto.style.display = (filter === 'all' || filter === 'crypto') ? 'block' : 'none';
    if (secStocks) secStocks.style.display = (filter === 'all' || filter === 'stock_vn') ? 'block' : 'none';
    if (secCash) secCash.style.display = (filter === 'all' || filter === 'cash') ? 'block' : 'none';
};

// Chart Mode Selector
window.chartViewMode = localStorage.getItem('goz_chart_mode') || 'line';
window.setChartTypeMode = function (mode) {
    chartViewMode = mode;
    window.chartViewMode = mode;
    try { localStorage.setItem('goz_chart_mode', mode); } catch (e) {}
    ['btnModeCombo', 'btnModeBar', 'btnModeLine'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if ((mode === 'combo' && id === 'btnModeCombo') ||
                (mode === 'bar' && id === 'btnModeBar') ||
                (mode === 'line' && id === 'btnModeLine')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
    if (typeof window.renderBudgetOverviewChart === 'function') {
        window.renderBudgetOverviewChart();
    }
};

// Synchronized Instant Currency Converter (2-way / 3-way)
window.convertFromKRW = function () {
    const r = window.exchangeRate || 19.15;
    const u = window.usdRate || 25744;
    const raw = (document.getElementById('krwInput').value || '').replace(/[^0-9]/g, '');
    const krw = parseFloat(raw);
    const resEl = document.getElementById('converterResult');
    if (!krw || isNaN(krw)) {
        document.getElementById('vndInput').value = '';
        document.getElementById('usdInput').value = '';
        if (resEl) resEl.textContent = 'Nhập số tiền để quy đổi';
        return;
    }
    const vnd = Math.round(krw * r);
    const usd = (krw * r / u).toFixed(2);
    document.getElementById('vndInput').value = vnd.toLocaleString('vi-VN');
    document.getElementById('usdInput').value = usd;
    if (resEl) {
        resEl.textContent = `${krw.toLocaleString('vi-VN')} ₩ ≈ ${vnd.toLocaleString('vi-VN')} ₫ | $${usd}`;
    }
};

window.convertFromVND = function () {
    const r = window.exchangeRate || 19.15;
    const u = window.usdRate || 25744;
    const raw = (document.getElementById('vndInput').value || '').replace(/[^0-9]/g, '');
    const vnd = parseFloat(raw);
    const resEl = document.getElementById('converterResult');
    if (!vnd || isNaN(vnd)) {
        document.getElementById('krwInput').value = '';
        document.getElementById('usdInput').value = '';
        if (resEl) resEl.textContent = 'Nhập số tiền để quy đổi';
        return;
    }
    const krw = Math.round(vnd / r);
    const usd = (vnd / u).toFixed(2);
    document.getElementById('krwInput').value = krw.toLocaleString('vi-VN');
    document.getElementById('usdInput').value = usd;
    if (resEl) {
        resEl.textContent = `${krw.toLocaleString('vi-VN')} ₩ ≈ ${vnd.toLocaleString('vi-VN')} ₫ | $${usd}`;
    }
};

window.convertFromUSD = function () {
    const r = window.exchangeRate || 19.15;
    const u = window.usdRate || 25744;
    const raw = (document.getElementById('usdInput').value || '').replace(/[^0-9.]/g, '');
    const usd = parseFloat(raw);
    const resEl = document.getElementById('converterResult');
    if (!usd || isNaN(usd)) {
        document.getElementById('krwInput').value = '';
        document.getElementById('vndInput').value = '';
        if (resEl) resEl.textContent = 'Nhập số tiền để quy đổi';
        return;
    }
    const vnd = Math.round(usd * u);
    const krw = Math.round(usd * u / r);
    document.getElementById('vndInput').value = vnd.toLocaleString('vi-VN');
    document.getElementById('krwInput').value = krw.toLocaleString('vi-VN');
    if (resEl) {
        resEl.textContent = `${krw.toLocaleString('vi-VN')} ₩ ≈ ${vnd.toLocaleString('vi-VN')} ₫ | $${usd}`;
    }
};

function isValidUUID(str) {
    return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function generateAssetUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getPortfolioStorageKey() {
    const uid = window.currentUser?.id || 'guest';
    return 'goz_portfolio_assets_' + uid;
}

function savePortfolioToLocal() {
    try {
        const key = getPortfolioStorageKey();
        localStorage.setItem(key, JSON.stringify(portfolioAssets));
        localStorage.setItem('goz_portfolio_assets', JSON.stringify(portfolioAssets));
    } catch (e) {}
}

// Reset portfolio display on user signout
window.resetPortfolioForLogout = function () {
    portfolioAssets = DEFAULT_PORTFOLIO_ASSETS;
    renderPortfolio();
    updateOverviewCards();
};

// Load Portfolio Data with Account-specific Sync
async function loadPortfolioData() {
    const key = getPortfolioStorageKey();
    const local = localStorage.getItem(key) || localStorage.getItem('goz_portfolio_assets');
    let hasLoadedLocal = false;

    if (local) {
        try {
            portfolioAssets = JSON.parse(local);
            hasLoadedLocal = true;
        } catch (e) {
            portfolioAssets = window.currentUser ? [] : DEFAULT_PORTFOLIO_ASSETS;
        }
    } else {
        portfolioAssets = window.currentUser ? [] : DEFAULT_PORTFOLIO_ASSETS;
    }

    // Ensure all items have valid UUIDs
    let hasUpdatedIds = false;
    portfolioAssets.forEach(a => {
        if (!isValidUUID(a.id)) {
            a.id = generateAssetUUID();
            hasUpdatedIds = true;
        }
    });
    if (hasUpdatedIds && hasLoadedLocal) {
        savePortfolioToLocal();
    }

    // Set initial currency toggle button active
    const savedCur = localStorage.getItem('goz_display_currency') || 'KRW';
    displayCurrency = savedCur;
    ['curBtnVND', 'curBtnKRW', 'curBtnUSD'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'curBtn' + savedCur) el.classList.add('active');
            else el.classList.remove('active');
        }
    });
    document.querySelectorAll('.cur-btn').forEach(btn => {
        if (btn.dataset && btn.dataset.cur) {
            if (btn.dataset.cur === savedCur) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    // Privacy mode icon setup
    const pIcon = document.getElementById('privacyIcon');
    const pBtn = document.getElementById('privacyToggleBtn');
    if (pIcon) pIcon.setAttribute('data-lucide', isPrivacyMode ? 'lock' : 'lock-open');
    if (pBtn) {
        pBtn.classList.toggle('active', isPrivacyMode);
        pBtn.setAttribute('title', isPrivacyMode ? 'Đang khóa bảo mật số dư (Bấm để mở)' : 'Khóa bảo mật số dư (Bấm để ẩn)');
    }

    // Sync from Supabase Cloud if user is logged in
    if (window.currentUser && typeof window.loadPortfolioAssets === 'function') {
        try {
            const dbAssets = await window.loadPortfolioAssets();
            if (Array.isArray(dbAssets) && dbAssets.length > 0) {
                // Cloud has assets for this account
                portfolioAssets = dbAssets;
                savePortfolioToLocal();
            } else if (portfolioAssets.length > 0) {
                // Migrate local assets to Cloud on first sync for this account
                for (const a of portfolioAssets) {
                    if (!isValidUUID(a.id)) a.id = generateAssetUUID();
                    await window.savePortfolioAsset(a);
                }
                savePortfolioToLocal();
            }
        } catch (err) {
            console.warn('Supabase portfolio load error:', err.message);
        }
    }

    renderPortfolio();
    updateOverviewCards();
    refreshCryptoPrices();
    refreshStockPrices();
}
window.loadPortfolioData = loadPortfolioData;

// Live Prices from Binance for Any Crypto in Portfolio
async function refreshCryptoPrices() {
    try {
        const userCryptoSymbols = portfolioAssets
            .filter(a => a.type === 'crypto' && a.symbol)
            .map(a => a.symbol.trim().toUpperCase());
        const allSymbols = Array.from(new Set(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', ...userCryptoSymbols]));

        const priceMap = { USDT: 1.0 };
        const changeMap = { USDT: 0.0 };

        const fetchPromises = allSymbols.map(async sym => {
            if (sym === 'USDT') return;
            try {
                const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}USDT`);
                if (res.ok) {
                    const data = await res.json();
                    priceMap[sym] = parseFloat(data.lastPrice);
                    changeMap[sym] = parseFloat(data.priceChangePercent);
                }
            } catch (err) {
                // Ignore individual symbol fetch errors
            }
        });

        await Promise.allSettled(fetchPromises);

        let updated = false;
        portfolioAssets.forEach(a => {
            if (a.type === 'crypto') {
                const sym = (a.symbol || '').toUpperCase().trim();
                if (priceMap[sym] !== undefined && priceMap[sym] > 0) {
                    if (a.current_price !== priceMap[sym]) {
                        a.current_price = priceMap[sym];
                        updated = true;
                    }
                    if (changeMap[sym] !== undefined) {
                        a.change_24h = changeMap[sym];
                    }
                }
            }
        });

        // Update Top Ticker Track
        if (priceMap.BTC) {
            const el = document.getElementById('tkBtcVal');
            if (el) el.textContent = '$' + priceMap.BTC.toLocaleString('en-US', { maximumFractionDigits: 2 });
        }
        if (priceMap.ETH) {
            const el = document.getElementById('tkEthVal');
            if (el) el.textContent = '$' + priceMap.ETH.toLocaleString('en-US', { maximumFractionDigits: 2 });
        }
        if (priceMap.SOL) {
            const el = document.getElementById('tkSolVal');
            if (el) el.textContent = '$' + priceMap.SOL.toLocaleString('en-US', { maximumFractionDigits: 2 });
        }

        if (updated) {
            savePortfolioToLocal();
        }
        renderPortfolio();
        updateOverviewCards();
    } catch (e) {
        console.warn('Binance crypto ticker price fetch warning:', e.message);
    }
}

// Live Prices for Vietnam Stocks from DNSE Entrade Real-time Market Data
async function refreshStockPrices() {
    try {
        const userStockSymbols = portfolioAssets
            .filter(a => a.type === 'stock_vn' && a.symbol)
            .map(a => a.symbol.trim().toUpperCase());
        const allStockSymbols = Array.from(new Set(['FPT', 'HPG', 'VCB', ...userStockSymbols]));

        const stockPriceMap = {};
        const stockChangeMap = {};

        const fetchPromises = allStockSymbols.map(async sym => {
            try {
                const res = await fetch(`https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol=${sym}&resolution=1D`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.c && data.c.length > 0) {
                        const lastC = data.c[data.c.length - 1]; // Value in thousands VND
                        const priceVND = Math.round(lastC * 1000);
                        const openVND = (data.o && data.o.length > 0) ? Math.round(data.o[data.o.length - 1] * 1000) : priceVND;
                        const changePct = openVND > 0 ? ((priceVND - openVND) / openVND) * 100 : 0;
                        stockPriceMap[sym] = priceVND;
                        stockChangeMap[sym] = changePct;
                    }
                }
            } catch (err) {
                // Ignore individual symbol fetch errors
            }
        });

        await Promise.allSettled(fetchPromises);

        let updated = false;
        portfolioAssets.forEach(a => {
            if (a.type === 'stock_vn') {
                const sym = (a.symbol || '').toUpperCase().trim();
                if (stockPriceMap[sym] !== undefined && stockPriceMap[sym] > 0) {
                    if (a.current_price !== stockPriceMap[sym]) {
                        a.current_price = stockPriceMap[sym];
                        updated = true;
                    }
                    if (stockChangeMap[sym] !== undefined) {
                        a.change_24h = stockChangeMap[sym];
                    }
                }
            }
        });

        // Update Top Ticker Track
        Object.keys(stockPriceMap).forEach(sym => {
            const el = document.getElementById('tk' + sym[0] + sym.slice(1).toLowerCase() + 'Val');
            if (el) el.textContent = stockPriceMap[sym].toLocaleString('vi-VN') + ' đ';
        });

        if (updated) {
            savePortfolioToLocal();
        }
        renderPortfolio();
        updateOverviewCards();
    } catch (e) {
        console.warn('Vietnam stock price refresh warning:', e.message);
    }
}

// Background Auto-polling for Real-time Market Prices (Every 25 seconds)
let liveAssetPollingTimer = null;
function startLiveAssetPolling() {
    if (liveAssetPollingTimer) clearInterval(liveAssetPollingTimer);
    liveAssetPollingTimer = setInterval(() => {
        if (document.hidden) return;
        refreshCryptoPrices();
        refreshStockPrices();
    }, 25000);
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        refreshCryptoPrices();
        refreshStockPrices();
    }
});

// Calculate Total Portfolio Value in given currency
function getPortfolioTotals() {
    let cashTotalInCur = 0;
    let cryptoTotalInCur = 0;
    let cryptoCostUSD = 0;
    let cryptoValUSD = 0;
    let stockTotalInCur = 0;
    let stockCostVND = 0;
    let stockValVND = 0;

    portfolioAssets.forEach(a => {
        const amt = Number(a.amount) || 0;
        const buy = Number(a.buy_price) || 0;
        const cur = Number(a.current_price) || buy;

        if (a.type === 'crypto') {
            const valUSD = amt * cur;
            const costUSD = amt * buy;
            cryptoValUSD += valUSD;
            cryptoCostUSD += costUSD;
            const valInDisplay = convertCurrency(valUSD, 'USD', displayCurrency);
            cryptoTotalInCur += valInDisplay;
        } else if (a.type === 'stock_vn') {
            const valVND = amt * cur;
            const costVND = amt * buy;
            stockValVND += valVND;
            stockCostVND += costVND;
            const valInDisplay = convertCurrency(valVND, 'VND', displayCurrency);
            stockTotalInCur += valInDisplay;
        } else if (a.type === 'cash') {
            const valInDisplay = convertCurrency(amt, a.currency || 'KRW', displayCurrency);
            cashTotalInCur += valInDisplay;
        }
    });

    const grandTotal = cashTotalInCur + cryptoTotalInCur + stockTotalInCur;
    return {
        grandTotal,
        cashTotalInCur,
        cryptoTotalInCur,
        stockTotalInCur,
        cryptoCostUSD,
        cryptoValUSD,
        stockCostVND,
        stockValVND
    };
}

// Format cross-currency sub-values for intuitive multi-currency display
function formatCrossCurrenciesHTML(amount, sourceCur = 'KRW') {
    if (isPrivacyMode) {
        return '<span class="metric-sub-val">≈ ••••••••</span><span class="metric-sub-val">≈ ••••••••</span>';
    }
    const r = (window.exchangeRate && window.exchangeRate > 0) ? window.exchangeRate : 19.15;
    const u = (window.usdRate && window.usdRate > 0) ? window.usdRate : 25744;
    const cur = window.displayCurrency || 'KRW';

    // Convert source amount to VND first
    let valVND = 0;
    const num = Number(amount) || 0;
    if (sourceCur === 'VND') valVND = num;
    else if (sourceCur === 'KRW') valVND = num * r;
    else if (sourceCur === 'USD') valVND = num * u;
    else valVND = num;

    const valKRW = r > 0 ? Math.round(valVND / r) : 0;
    const valUSD = u > 0 ? (valVND / u) : 0;
    const roundVND = Math.round(valVND);

    const txtKRW = `≈ ${valKRW.toLocaleString('vi-VN')} ₩`;
    const txtVND = `≈ ${roundVND.toLocaleString('vi-VN')} ₫`;
    const txtUSD = `≈ $${(valUSD > 0 && valUSD < 10)
        ? valUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : Math.round(valUSD).toLocaleString('en-US')}`;

    if (cur === 'VND') {
        return `<span class="metric-sub-val">${txtKRW}</span><span class="metric-sub-val">${txtUSD}</span>`;
    } else if (cur === 'USD') {
        return `<span class="metric-sub-val">${txtKRW}</span><span class="metric-sub-val">${txtVND}</span>`;
    } else {
        // default KRW
        return `<span class="metric-sub-val">${txtVND}</span><span class="metric-sub-val">${txtUSD}</span>`;
    }
}
window.formatCrossCurrenciesHTML = formatCrossCurrenciesHTML;

// Update the 4 Overview Metric Cards - Lấy tổng của tất cả các năm (năm trước đó và năm nay)
function updateOverviewCards() {
    const r = window.exchangeRate || 19.15;
    const u = window.usdRate || 25744;

    // Lấy tổng lũy kế tất cả các năm từ getAllTimeTotals
    let incKRW = 0;
    let expKRW = 0;
    let balanceKRW = 0;

    if (typeof window.getAllTimeTotals === 'function') {
        const att = window.getAllTimeTotals();
        incKRW = att.incKRW || 0;
        expKRW = att.expKRW || 0;
        balanceKRW = att.balanceKRW || 0;
    }

    // 1. SỐ DƯ HIỆN TẠI (Tài sản ròng / Net Worth = Dòng tiền thu chi tích lũy + Toàn bộ danh mục đầu tư)
    const { grandTotal } = (typeof getPortfolioTotals === 'function') ? getPortfolioTotals() : { grandTotal: 0 };
    const balanceInDisplay = convertCurrency(balanceKRW, 'KRW', displayCurrency);
    const netWorthInDisplay = balanceInDisplay + (Number(grandTotal) || 0);

    const totalBalEl = document.getElementById('totalBalance');
    const balKRWEl = document.getElementById('balanceKRW');
    if (totalBalEl) {
        totalBalEl.textContent = fmtDisplayCur(netWorthInDisplay);
        totalBalEl.style.color = netWorthInDisplay < 0 ? 'var(--accent-red)' : 'var(--text-primary)';
    }
    if (balKRWEl) {
        balKRWEl.innerHTML = formatCrossCurrenciesHTML(netWorthInDisplay, displayCurrency);
    }

    // 2. TỔNG THU NHẬP (Tổng thu nhập của tất cả các năm: năm trước đó và năm nay)
    const yrPill = document.getElementById('cardIncomeYear');
    if (yrPill) yrPill.textContent = 'Tất cả các năm';

    const totalIncEl = document.getElementById('totalIncome');
    const incKRWEl = document.getElementById('incomeKRW');
    if (totalIncEl) {
        const incInDisplay = convertCurrency(incKRW, 'KRW', displayCurrency);
        totalIncEl.textContent = fmtDisplayCur(incInDisplay);
    }
    if (incKRWEl) {
        incKRWEl.innerHTML = formatCrossCurrenciesHTML(incKRW, 'KRW');
    }

    // 3. TỔNG CHI TIÊU (Tổng chi tiêu của tất cả các năm)
    const totalExpEl = document.getElementById('totalExpense');
    const expKRWEl = document.getElementById('expenseKRW');
    if (totalExpEl) {
        const expInDisplay = convertCurrency(expKRW, 'KRW', displayCurrency);
        totalExpEl.textContent = fmtDisplayCur(expInDisplay);
    }
    if (expKRWEl) {
        expKRWEl.innerHTML = formatCrossCurrenciesHTML(expKRW, 'KRW');
    }
    const expGrowthEl = document.getElementById('expenseGrowthText');
    if (expGrowthEl) {
        const pctExp = incKRW > 0 ? ((expKRW / incKRW) * 100).toFixed(1) : '0';
        expGrowthEl.innerHTML = `<i class="icon-svg" data-lucide="trending-down"></i> Chiếm ${pctExp}% thu nhập`;
    }

    // 4. TÍCH LŨY RÒNG (Lũy kế dòng tiền thu chi: Thu nhập - Chi tiêu)
    const netSavingsEl = document.getElementById('netSavingsTotal');
    const netSavingsSubEl = document.getElementById('netSavingsSub');
    if (netSavingsEl) {
        const netInDisplay = convertCurrency(balanceKRW, 'KRW', displayCurrency);
        netSavingsEl.textContent = fmtDisplayCur(netInDisplay);
        netSavingsEl.style.color = balanceKRW < 0 ? 'var(--accent-red)' : '';
    }
    if (netSavingsSubEl) {
        netSavingsSubEl.innerHTML = formatCrossCurrenciesHTML(balanceKRW, 'KRW');
    }
    const savingsSubEl = document.getElementById('savingsRateSub');
    if (savingsSubEl) {
        const pct = incKRW > 0 ? Math.round((balanceKRW / incKRW) * 100) : 0;
        savingsSubEl.textContent = 'Tiết kiệm ' + Math.max(0, pct) + '%';
    }

    // Synchronize ratio labels
    if (typeof window.updateRatioLabelsUI === 'function') {
        window.updateRatioLabelsUI();
    }
    if (typeof window.refreshIcons === 'function') {
        window.refreshIcons();
    }
}

// Render Portfolio Function
window.renderPortfolio = function () {
    const {
        grandTotal,
        cashTotalInCur,
        cryptoTotalInCur,
        stockTotalInCur,
        cryptoCostUSD,
        cryptoValUSD,
        stockCostVND,
        stockValVND
    } = getPortfolioTotals();

    const cryptoItems = [];
    const stockItems = [];
    const cashItems = [];

    portfolioAssets.forEach(a => {
        const amt = Number(a.amount) || 0;
        const buy = Number(a.buy_price) || 0;
        const cur = Number(a.current_price) || buy;

        if (a.type === 'crypto') {
            const valUSD = amt * cur;
            const costUSD = amt * buy;
            const valInDisplay = convertCurrency(valUSD, 'USD', displayCurrency);
            cryptoItems.push({ ...a, valUSD, costUSD, valInDisplay });
        } else if (a.type === 'stock_vn') {
            const valVND = amt * cur;
            const costVND = amt * buy;
            const valInDisplay = convertCurrency(valVND, 'VND', displayCurrency);
            stockItems.push({ ...a, valVND, costVND, valInDisplay });
        } else if (a.type === 'cash') {
            const valInDisplay = convertCurrency(amt, a.currency || 'KRW', displayCurrency);
            cashItems.push({ ...a, valInDisplay });
        }
    });

    // Update Hero Card Breakdown & Percentages
    const grandTotalVal = grandTotal > 0 ? grandTotal : 1;
    const cashPct = Math.round((cashTotalInCur / grandTotalVal) * 100);
    const cryptoPct = Math.round((cryptoTotalInCur / grandTotalVal) * 100);
    const stockPct = Math.max(0, 100 - cashPct - cryptoPct);

    const heroTotalEl = document.getElementById('portfolioHeroTotal');
    const heroSubEl = document.getElementById('portfolioHeroSub');
    const heroCashEl = document.getElementById('heroCashTotal');
    const heroCryptoEl = document.getElementById('heroCryptoTotal');
    const heroStockEl = document.getElementById('heroStockTotal');
    const countBadge = document.getElementById('assetTotalCountBadge');

    if (heroTotalEl) heroTotalEl.textContent = fmtDisplayCur(grandTotal);
    if (heroSubEl) heroSubEl.innerHTML = formatCrossCurrenciesHTML(grandTotal, displayCurrency);
    if (heroCashEl) heroCashEl.textContent = fmtDisplayCur(cashTotalInCur);
    if (heroCryptoEl) heroCryptoEl.textContent = fmtDisplayCur(cryptoTotalInCur);
    if (heroStockEl) heroStockEl.textContent = fmtDisplayCur(stockTotalInCur);
    if (countBadge) countBadge.textContent = portfolioAssets.length + ' Mục tài sản';

    const elCashPct = document.getElementById('heroCashPct');
    const elCashBar = document.getElementById('heroCashBar');
    if (elCashPct) elCashPct.textContent = cashPct + '%';
    if (elCashBar) elCashBar.style.width = cashPct + '%';

    const elCryptoPct = document.getElementById('heroCryptoPct');
    const elCryptoBar = document.getElementById('heroCryptoBar');
    const elCryptoNote = document.getElementById('heroCryptoNote');
    if (elCryptoPct) elCryptoPct.textContent = cryptoPct + '%';
    if (elCryptoBar) elCryptoBar.style.width = cryptoPct + '%';
    if (elCryptoNote) {
        const diffUSD = cryptoValUSD - cryptoCostUSD;
        const pct = cryptoCostUSD > 0 ? (diffUSD / cryptoCostUSD) * 100 : 0;
        const sign = diffUSD >= 0 ? '+' : '';
        const usdSign = diffUSD >= 0 ? '+$' : '-$';
        elCryptoNote.className = 'sub-card-note ' + (diffUSD >= 0 ? 'pos' : 'neg');
        elCryptoNote.textContent = `${sign}${pct.toFixed(1)}% (${usdSign}${Math.round(Math.abs(diffUSD))})`;
    }

    const elStockPct = document.getElementById('heroStockPct');
    const elStockBar = document.getElementById('heroStockBar');
    const elStockNote = document.getElementById('heroStockNote');
    if (elStockPct) elStockPct.textContent = stockPct + '%';
    if (elStockBar) elStockBar.style.width = stockPct + '%';
    if (elStockNote) {
        const diffVND = stockValVND - stockCostVND;
        const pct = stockCostVND > 0 ? (diffVND / stockCostVND) * 100 : 0;
        const sign = diffVND >= 0 ? '+' : '';
        elStockNote.className = 'sub-card-note ' + (diffVND >= 0 ? 'pos' : 'neg');
        const diffM = Math.abs(diffVND) >= 1000000 ? (Math.abs(diffVND) / 1000000).toFixed(1) + 'tr' : Math.round(Math.abs(diffVND)).toLocaleString('vi-VN');
        elStockNote.textContent = `${sign}${pct.toFixed(1)}% (${sign}${diffM})`;
    }

    // Update Filter Counts
    const elCountAll = document.getElementById('filterCountAll');
    const elCountCrypto = document.getElementById('filterCountCrypto');
    const elCountStocks = document.getElementById('filterCountStocks');
    const elCountCash = document.getElementById('filterCountCash');
    if (elCountAll) elCountAll.textContent = portfolioAssets.length;
    if (elCountCrypto) elCountCrypto.textContent = cryptoItems.length;
    if (elCountStocks) elCountStocks.textContent = stockItems.length;
    if (elCountCash) elCountCash.textContent = cashItems.length;

    // Update Section Subtitles
    const cryptoSub = document.getElementById('cryptoSummarySub');
    if (cryptoSub) {
        const diffUSD = cryptoValUSD - cryptoCostUSD;
        const pct = cryptoCostUSD > 0 ? (diffUSD / cryptoCostUSD) * 100 : 0;
        const sign = diffUSD >= 0 ? '+' : '';
        const usdSign = diffUSD >= 0 ? '+$' : '-$';
        const isPos = diffUSD >= 0;
        cryptoSub.innerHTML = `
            <span class="section-sub-val">Tổng: <strong>${fmtDisplayCur(cryptoTotalInCur)}</strong></span>
            <span class="section-pnl-pill ${isPos ? 'pos' : 'neg'}">
                <i class="icon-svg" data-lucide="${isPos ? 'trending-up' : 'trending-down'}"></i>
                ${sign}${pct.toFixed(2)}% (${usdSign}${Math.abs(diffUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
        `;
    }

    const stockSub = document.getElementById('stockSummarySub');
    if (stockSub) {
        const diffVND = stockValVND - stockCostVND;
        const pct = stockCostVND > 0 ? (diffVND / stockCostVND) * 100 : 0;
        const sign = diffVND >= 0 ? '+' : '';
        const isPos = diffVND >= 0;
        stockSub.innerHTML = `
            <span class="section-sub-val">Tổng: <strong>${fmtDisplayCur(stockTotalInCur)}</strong></span>
            <span class="section-pnl-pill ${isPos ? 'pos' : 'neg'}">
                <i class="icon-svg" data-lucide="${isPos ? 'trending-up' : 'trending-down'}"></i>
                ${sign}${pct.toFixed(2)}% (${sign}${diffVND.toLocaleString('vi-VN')} ₫)
            </span>
        `;
    }

    const cashSub = document.getElementById('cashSummarySub');
    if (cashSub) {
        cashSub.innerHTML = `<span class="section-sub-val">Tổng: <strong>${fmtDisplayCur(cashTotalInCur)}</strong></span>`;
    }

    // Render Crypto List
    const cryptoList = document.getElementById('cryptoListContainer');
    if (cryptoList) {
        if (cryptoItems.length === 0) {
            cryptoList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Chưa có đồng coin nào. Bấm <strong>+ Thêm Coin</strong> để thêm.</div>';
        } else {
            cryptoList.innerHTML = cryptoItems.map(c => {
                const diff = c.valUSD - c.costUSD;
                const pct = c.costUSD > 0 ? (diff / c.costUSD) * 100 : 0;
                const isPos = diff >= 0;
                const badgeClass = c.symbol.toLowerCase();
                const sign = isPos ? '+' : '';
                const usdSign = isPos ? '+$' : '-$';
                return `
                    <div class="asset-item-row">
                        <div class="asset-item-left">
                            <div class="asset-badge crypto-badge ${badgeClass}">
                                <span class="badge-symbol-text">${escapeHtml(c.symbol)}</span>
                            </div>
                            <div class="asset-info">
                                <div class="asset-title-line">
                                    <span class="asset-symbol-strong">${escapeHtml(c.symbol)}</span>
                                    <span class="asset-name-muted">${escapeHtml(c.name)}</span>
                                    <span class="asset-price-pill" title="Giá thời gian thực">
                                        $${Number(c.current_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                    </span>
                                </div>
                                <div class="asset-meta-line">
                                    <span>Nắm giữ: <strong>${Number(c.amount).toLocaleString('en-US')} ${escapeHtml(c.symbol)}</strong></span>
                                    <span class="meta-dot">•</span>
                                    <span>Giá mua: <strong>$${Number(c.buy_price).toLocaleString('en-US', { maximumFractionDigits: 4 })}</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="asset-item-right">
                            <div class="asset-values-block">
                                <div class="asset-val-main">${fmtDisplayCur(c.valInDisplay)}</div>
                                <div class="asset-pnl-chip ${isPos ? 'pos' : 'neg'}">
                                    <i class="icon-svg" data-lucide="${isPos ? 'trending-up' : 'trending-down'}"></i>
                                    <span>${sign}${pct.toFixed(2)}% (${usdSign}${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                </div>
                            </div>
                            <div class="asset-actions-block">
                                <button class="asset-action-btn edit" onclick="openEditCryptoModal('${c.id}')" title="Sửa thông tin"><i class="icon-svg" data-lucide="pencil"></i></button>
                                <button class="asset-action-btn delete" onclick="deleteAsset('${c.id}')" title="Xóa tài sản"><i class="icon-svg" data-lucide="trash-2"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Render Stocks List
    const stockList = document.getElementById('stockListContainer');
    if (stockList) {
        if (stockItems.length === 0) {
            stockList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Chưa có cổ phiếu nào. Bấm <strong>+ Thêm Cổ Phiếu</strong> để thêm.</div>';
        } else {
            stockList.innerHTML = stockItems.map(s => {
                const diff = s.valVND - s.costVND;
                const pct = s.costVND > 0 ? (diff / s.costVND) * 100 : 0;
                const isPos = diff >= 0;
                const badgeClass = s.symbol.toLowerCase();
                const sign = isPos ? '+' : '';
                const cleanName = s.name.replace(/\s*\([^)]*\)/, '');
                return `
                    <div class="asset-item-row">
                        <div class="asset-item-left">
                            <div class="asset-badge stock-badge ${badgeClass}">
                                <span class="badge-symbol-text">${escapeHtml(s.symbol)}</span>
                            </div>
                            <div class="asset-info">
                                <div class="asset-title-line">
                                    <span class="asset-symbol-strong">${escapeHtml(s.symbol)}</span>
                                    <span class="asset-name-muted">${escapeHtml(cleanName)}</span>
                                    <span class="asset-price-pill" title="Thị giá thời gian thực (DNSE)">
                                        ${Number(s.current_price).toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                                <div class="asset-meta-line">
                                    <span>Khối lượng: <strong>${Number(s.amount).toLocaleString('vi-VN')} CP</strong></span>
                                    <span class="meta-dot">•</span>
                                    <span>Giá vốn: <strong>${Number(s.buy_price).toLocaleString('vi-VN')} ₫</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="asset-item-right">
                            <div class="asset-values-block">
                                <div class="asset-val-main">${fmtDisplayCur(s.valInDisplay)}</div>
                                <div class="asset-pnl-chip ${isPos ? 'pos' : 'neg'}">
                                    <i class="icon-svg" data-lucide="${isPos ? 'trending-up' : 'trending-down'}"></i>
                                    <span>${sign}${pct.toFixed(2)}% (${sign}${diff.toLocaleString('vi-VN')} ₫)</span>
                                </div>
                            </div>
                            <div class="asset-actions-block">
                                <button class="asset-action-btn edit" onclick="openEditStockModal('${s.id}')" title="Sửa thông tin"><i class="icon-svg" data-lucide="pencil"></i></button>
                                <button class="asset-action-btn delete" onclick="deleteAsset('${s.id}')" title="Xóa tài sản"><i class="icon-svg" data-lucide="trash-2"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Render Cash List
    const cashList = document.getElementById('cashListContainer');
    if (cashList) {
        if (cashItems.length === 0) {
            cashList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Chưa có tài khoản tiền mặt nào. Bấm <strong>+ Thêm Tiền Mặt</strong> để thêm.</div>';
        } else {
            cashList.innerHTML = cashItems.map(k => {
                const badgeSymbol = k.currency === 'KRW' ? '₩' : (k.currency === 'VND' ? '₫' : '$');
                return `
                    <div class="asset-item-row">
                        <div class="asset-item-left">
                            <div class="asset-badge cash-badge">
                                <span class="badge-symbol-text">${badgeSymbol}</span>
                            </div>
                            <div class="asset-info">
                                <div class="asset-title-line">
                                    <span class="asset-symbol-strong">${escapeHtml(k.name)}</span>
                                    <span class="asset-price-pill cash-pill">${k.currency}</span>
                                </div>
                                <div class="asset-meta-line">
                                    <span>Nguyên tệ: <strong>${Number(k.amount).toLocaleString('vi-VN')} ${k.currency}</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="asset-item-right">
                            <div class="asset-values-block">
                                <div class="asset-val-main">${fmtDisplayCur(k.valInDisplay)}</div>
                                <div class="asset-pnl-chip cash-chip">
                                    <i class="icon-svg" data-lucide="shield-check"></i>
                                    <span>Tiền mặt nhàn rỗi</span>
                                </div>
                            </div>
                            <div class="asset-actions-block">
                                <button class="asset-action-btn edit" onclick="openEditCashModal('${k.id}')" title="Sửa thông tin"><i class="icon-svg" data-lucide="pencil"></i></button>
                                <button class="asset-action-btn delete" onclick="deleteAsset('${k.id}')" title="Xóa tài sản"><i class="icon-svg" data-lucide="trash-2"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    if (typeof window.refreshIcons === 'function') window.refreshIcons();
};

function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ===== Modals & Form Actions =====

// Quick chip selection for crypto
// Danh mục Top Crypto phổ biến có sẵn (phản hồi tức thì 0ms)
const POPULAR_CRYPTO_LIST = [
    { s: 'BTC', n: 'Bitcoin', r: 1 },
    { s: 'ETH', n: 'Ethereum', r: 2 },
    { s: 'USDT', n: 'Tether USD', r: 3 },
    { s: 'BNB', n: 'BNB', r: 4 },
    { s: 'SOL', n: 'Solana', r: 5 },
    { s: 'XRP', n: 'XRP', r: 6 },
    { s: 'DOGE', n: 'Dogecoin', r: 7 },
    { s: 'ADA', n: 'Cardano', r: 8 },
    { s: 'TRX', n: 'TRON', r: 9 },
    { s: 'AVAX', n: 'Avalanche', r: 10 },
    { s: 'SUI', n: 'Sui', r: 11 },
    { s: 'LINK', n: 'Chainlink', r: 12 },
    { s: 'SHIB', n: 'Shiba Inu', r: 13 },
    { s: 'TON', n: 'Toncoin', r: 14 },
    { s: 'XLM', n: 'Stellar', r: 15 },
    { s: 'DOT', n: 'Polkadot', r: 16 },
    { s: 'BCH', n: 'Bitcoin Cash', r: 17 },
    { s: 'NEAR', n: 'NEAR Protocol', r: 18 },
    { s: 'UNI', n: 'Uniswap', r: 19 },
    { s: 'PEPE', n: 'Pepe', r: 20 },
    { s: 'LTC', n: 'Litecoin', r: 21 },
    { s: 'APT', n: 'Aptos', r: 22 },
    { s: 'ICP', n: 'Internet Computer', r: 23 },
    { s: 'POL', n: 'Polygon Ecosystem Token', r: 24 },
    { s: 'MATIC', n: 'Polygon', r: 25 },
    { s: 'HBAR', n: 'Hedera', r: 26 },
    { s: 'ATOM', n: 'Cosmos', r: 27 },
    { s: 'FET', n: 'Artificial Superintelligence', r: 28 },
    { s: 'RENDER', n: 'Render', r: 29 },
    { s: 'TAO', n: 'Bittensor', r: 30 },
    { s: 'ARB', n: 'Arbitrum', r: 31 },
    { s: 'OP', n: 'Optimism', r: 32 },
    { s: 'VET', n: 'VeChain', r: 33 },
    { s: 'FIL', n: 'Filecoin', r: 34 },
    { s: 'TIA', n: 'Celestia', r: 35 },
    { s: 'INJ', n: 'Injective', r: 36 },
    { s: 'KAS', n: 'Kaspa', r: 37 },
    { s: 'FTM', n: 'Fantom', r: 38 },
    { s: 'WIF', n: 'dogwifhat', r: 39 },
    { s: 'BONK', n: 'Bonk', r: 40 },
    { s: 'FLOKI', n: 'Floki', r: 41 },
    { s: 'SEI', n: 'Sei', r: 42 },
    { s: 'AAVE', n: 'Aave', r: 43 },
    { s: 'ALGO', n: 'Algorand', r: 44 },
    { s: 'GRT', n: 'The Graph', r: 45 },
    { s: 'RUNE', n: 'THORChain', r: 46 },
    { s: 'MKR', n: 'Maker', r: 47 },
    { s: 'STX', n: 'Stacks', r: 48 },
    { s: 'CRV', n: 'Curve DAO', r: 49 },
    { s: 'IMX', n: 'Immutable', r: 50 },
    { s: 'ENA', n: 'Ethena', r: 51 },
    { s: 'ONDO', n: 'Ondo Finance', r: 52 },
    { s: 'NOT', n: 'Notcoin', r: 53 },
    { s: 'WLD', n: 'Worldcoin', r: 54 },
    { s: 'JUP', n: 'Jupiter', r: 55 },
    { s: 'PYTH', n: 'Pyth Network', r: 56 },
    { s: 'PENDLE', n: 'Pendle', r: 57 },
    { s: 'GALA', n: 'Gala', r: 58 },
    { s: 'SAND', n: 'The Sandbox', r: 59 },
    { s: 'MANA', n: 'Decentraland', r: 60 },
    { s: 'AXS', n: 'Axie Infinity', r: 61 },
    { s: 'DYDX', n: 'dYdX', r: 62 },
    { s: 'STRK', n: 'Starknet', r: 63 },
    { s: 'ZK', n: 'ZKsync', r: 64 },
    { s: 'IO', n: 'io.net', r: 65 },
    { s: 'KAVA', n: 'Kava', r: 66 },
    { s: 'MINA', n: 'Mina', r: 67 },
    { s: 'COMP', n: 'Compound', r: 68 },
    { s: 'SNX', n: 'Synthetix', r: 69 },
    { s: '1INCH', n: '1inch Network', r: 70 },
    { s: 'LDO', n: 'Lido DAO', r: 71 },
    { s: 'ENS', n: 'Ethereum Name Service', r: 72 },
    { s: 'JASMY', n: 'JasmyCoin', r: 73 },
    { s: 'CAKE', n: 'PancakeSwap', r: 74 },
    { s: 'NEO', n: 'NEO', r: 75 },
    { s: 'EOS', n: 'EOS', r: 76 },
    { s: 'XMR', n: 'Monero', r: 77 },
    { s: 'USDC', n: 'USD Coin', r: 78 },
    { s: 'FDUSD', n: 'First Digital USD', r: 79 },
    { s: 'FLOW', n: 'Flow', r: 80 },
    { s: 'EGLD', n: 'MultiversX', r: 81 },
    { s: 'QNT', n: 'Quant', r: 82 },
    { s: 'CHZ', n: 'Chiliz', r: 83 },
    { s: 'AR', n: 'Arweave', r: 84 },
    { s: 'BEAM', n: 'Beam', r: 85 },
    { s: 'RON', n: 'Ronin', r: 86 },
    { s: 'BLUR', n: 'Blur', r: 87 },
    { s: 'ZEC', n: 'Zcash', r: 88 },
    { s: 'DYM', n: 'Dymension', r: 89 },
    { s: 'APE', n: 'ApeCoin', r: 90 },
    { s: 'ROSE', n: 'Oasis Network', r: 91 },
    { s: 'GNO', n: 'Gnosis', r: 92 },
    { s: 'CFX', n: 'Conflux', r: 93 },
    { s: 'CORE', n: 'Core', r: 94 },
    { s: 'W', n: 'Wormhole', r: 95 },
    { s: 'ORDI', n: 'ORDI', r: 96 },
    { s: 'SATS', n: 'SATS', r: 97 },
    { s: 'POPCAT', n: 'Popcat', r: 98 },
    { s: 'BRETT', n: 'Brett', r: 99 },
    { s: 'MNT', n: 'Mantle', r: 100 }
];

let cryptoSuggestDebounce = null;
let cryptoSuggestSelectedIdx = -1;
let currentSuggestItems = [];

window.selectCryptoChip = function (sym, name) {
    document.getElementById('inputCryptoSymbol').value = sym;
    document.getElementById('inputCryptoName').value = name;
    window.hideCryptoSuggestions();
    fetchLiveCryptoPriceForModal();
};

window.hideCryptoSuggestions = function () {
    const box = document.getElementById('cryptoSuggestBox');
    if (box) {
        box.style.display = 'none';
        box.innerHTML = '';
    }
    cryptoSuggestSelectedIdx = -1;
    currentSuggestItems = [];
};

function renderCryptoSuggestions(list, isSearching) {
    const box = document.getElementById('cryptoSuggestBox');
    if (!box) return;
    if (!list || list.length === 0) {
        if (isSearching) {
            box.innerHTML = '<div style="padding:10px 14px;font-size:0.8rem;color:var(--text-muted);text-align:center;">Đang tìm kiếm đồng coin...</div>';
            box.style.display = 'block';
        } else {
            window.hideCryptoSuggestions();
        }
        return;
    }
    currentSuggestItems = list;
    cryptoSuggestSelectedIdx = -1;
    let itemsHtml = '<div class="crypto-suggest-header">Gợi ý đồng coin (Nhấp để chọn)</div>';
    list.slice(0, 8).forEach(function (coin, idx) {
        const iconUrl = coin.thumb || ('https://assets.coincap.io/assets/icons/' + coin.s.toLowerCase() + '@2x.png');
        const fallback = (coin.s || '').slice(0, 2);
        const rankStr = coin.r ? ('#' + coin.r) : 'Crypto';
        const safeName = coin.n.replace(/'/g, "\\'");
        itemsHtml += '<div class="crypto-suggest-item" data-idx="' + idx + '" onclick="selectCryptoSuggestedCoin(\'' + coin.s + '\', \'' + safeName + '\')">' +
            '<div class="crypto-suggest-left">' +
            '<img src="' + iconUrl + '" alt="' + coin.s + '" class="crypto-suggest-icon" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'flex\';">' +
            '<span class="crypto-suggest-fallback-icon" style="display:none;">' + fallback + '</span>' +
            '<div class="crypto-suggest-meta">' +
            '<span class="crypto-suggest-sym">' + coin.s + '</span>' +
            '<span class="crypto-suggest-name">' + coin.n + '</span>' +
            '</div>' +
            '</div>' +
            '<span class="crypto-suggest-badge">' + rankStr + '</span>' +
            '</div>';
    });
    box.innerHTML = itemsHtml;
    box.style.display = 'block';
}

window.onCryptoSymbolFocus = function () {
    const raw = (document.getElementById('inputCryptoSymbol').value || '').trim();
    if (!raw) {
        renderCryptoSuggestions(POPULAR_CRYPTO_LIST.slice(0, 8), false);
    } else {
        window.onCryptoSymbolInput(raw);
    }
};

window.onCryptoSymbolInput = function (val) {
    const query = (val || '').trim();
    if (!query) {
        renderCryptoSuggestions(POPULAR_CRYPTO_LIST.slice(0, 8), false);
        return;
    }
    const upper = query.toUpperCase();
    const localMatches = POPULAR_CRYPTO_LIST.filter(function (c) {
        return c.s.toUpperCase().includes(upper) || c.n.toUpperCase().includes(upper);
    });
    localMatches.sort(function (a, b) {
        if (a.s === upper && b.s !== upper) return -1;
        if (b.s === upper && a.s !== upper) return 1;
        if (a.s.startsWith(upper) && !b.s.startsWith(upper)) return -1;
        if (b.s.startsWith(upper) && !a.s.startsWith(upper)) return 1;
        return (a.r || 999) - (b.r || 999);
    });
    renderCryptoSuggestions(localMatches, query.length >= 2);
    const exact = POPULAR_CRYPTO_LIST.find(function (c) { return c.s === upper; });
    if (exact && !document.getElementById('inputCryptoName').value) {
        document.getElementById('inputCryptoName').value = exact.n;
    }
    if (cryptoSuggestDebounce) clearTimeout(cryptoSuggestDebounce);
    if (query.length >= 2) {
        cryptoSuggestDebounce = setTimeout(async function () {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(query));
                if (res.ok) {
                    const data = await res.json();
                    if (data.coins && Array.isArray(data.coins)) {
                        const apiCoins = data.coins.slice(0, 6).map(function (c) {
                            return {
                                s: (c.symbol || '').toUpperCase(),
                                n: c.name || '',
                                r: c.market_cap_rank || null,
                                thumb: c.thumb || ''
                            };
                        });
                        const combined = [].concat(localMatches);
                        apiCoins.forEach(function (ac) {
                            if (!combined.some(function (item) { return item.s === ac.s; })) {
                                combined.push(ac);
                            }
                        });
                        renderCryptoSuggestions(combined, false);
                    }
                }
            } catch (err) {
                console.warn('Crypto search API error:', err);
            }
        }, 280);
    }
};

window.onCryptoSymbolChange = window.onCryptoSymbolInput;

window.onCryptoNameInput = function (val) {
    const query = (val || '').trim().toLowerCase();
    if (!query) return;
    const match = POPULAR_CRYPTO_LIST.find(function (c) { return c.n.toLowerCase().includes(query); });
    if (match && !document.getElementById('inputCryptoSymbol').value) {
        document.getElementById('inputCryptoSymbol').value = match.s;
    }
};

window.onCryptoSymbolKeydown = function (e) {
    const box = document.getElementById('cryptoSuggestBox');
    if (!box || box.style.display === 'none' || currentSuggestItems.length === 0) return;
    const items = box.querySelectorAll('.crypto-suggest-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        cryptoSuggestSelectedIdx = (cryptoSuggestSelectedIdx + 1) % items.length;
        items.forEach(function (it, i) { it.classList.toggle('selected', i === cryptoSuggestSelectedIdx); });
        if (items[cryptoSuggestSelectedIdx]) items[cryptoSuggestSelectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cryptoSuggestSelectedIdx = (cryptoSuggestSelectedIdx - 1 + items.length) % items.length;
        items.forEach(function (it, i) { it.classList.toggle('selected', i === cryptoSuggestSelectedIdx); });
        if (items[cryptoSuggestSelectedIdx]) items[cryptoSuggestSelectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        if (cryptoSuggestSelectedIdx >= 0 && currentSuggestItems[cryptoSuggestSelectedIdx]) {
            e.preventDefault();
            const picked = currentSuggestItems[cryptoSuggestSelectedIdx];
            window.selectCryptoSuggestedCoin(picked.s, picked.n);
        }
    } else if (e.key === 'Escape') {
        window.hideCryptoSuggestions();
    }
};

window.selectCryptoSuggestedCoin = function (sym, name) {
    document.getElementById('inputCryptoSymbol').value = sym;
    document.getElementById('inputCryptoName').value = name;
    window.hideCryptoSuggestions();
    fetchLiveCryptoPriceForModal();
    const amtEl = document.getElementById('inputCryptoAmount');
    if (amtEl) amtEl.focus();
};

document.addEventListener('click', function (e) {
    const box = document.getElementById('cryptoSuggestBox');
    const input = document.getElementById('inputCryptoSymbol');
    if (box && box.style.display !== 'none') {
        if (input && !input.contains(e.target) && !box.contains(e.target)) {
            window.hideCryptoSuggestions();
        }
    }
});

window.fetchLiveCryptoPriceForModal = async function () {
    const sym = (document.getElementById('inputCryptoSymbol').value || '').toUpperCase().trim();
    if (!sym) return;
    try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + sym + 'USDT');
        if (res.ok) {
            const data = await res.json();
            const price = parseFloat(data.price);
            document.getElementById('inputCryptoCurrentPrice').value = price;
            calcCryptoModalPreview();
            if (typeof window.showToast === 'function') {
                window.showToast('Giá live Binance (' + sym + '): $' + price.toLocaleString('en-US'), 'info');
            }
            return;
        }
    } catch (e) {
        console.warn('Binance price fetch error:', e);
    }
    try {
        const searchRes = await fetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(sym));
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            const match = (searchData.coins || []).find(function (c) { return c.symbol.toUpperCase() === sym; }) || (searchData.coins || [])[0];
            if (match && match.id) {
                const pRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + match.id + '&vs_currencies=usd');
                if (pRes.ok) {
                    const pData = await pRes.json();
                    if (pData[match.id] && pData[match.id].usd) {
                        const price = pData[match.id].usd;
                        document.getElementById('inputCryptoCurrentPrice').value = price;
                        calcCryptoModalPreview();
                        if (typeof window.showToast === 'function') {
                            window.showToast('Giá live CoinGecko (' + sym + '): $' + price.toLocaleString('en-US'), 'info');
                        }
                    }
                }
            }
        }
    } catch (e2) {
        console.warn('CoinGecko price fetch error:', e2);
    }
};

window.calcCryptoModalPreview = function () {
    const amt = parseFloat(document.getElementById('inputCryptoAmount').value) || 0;
    const buy = parseFloat(document.getElementById('inputCryptoBuyPrice').value) || 0;
    const cur = parseFloat(document.getElementById('inputCryptoCurrentPrice').value) || buy;
    const valUSD = amt * cur;
    const costUSD = amt * buy;
    const diffUSD = valUSD - costUSD;
    const pct = costUSD > 0 ? (diffUSD / costUSD) * 100 : 0;
    const valKRW = convertCurrency(valUSD, 'USD', 'KRW');

    const prevVal = document.getElementById('cryptoPreviewVal');
    const prevKRW = document.getElementById('cryptoPreviewKRW');
    const prevPnL = document.getElementById('cryptoPreviewPnL');

    if (prevVal) prevVal.textContent = '$' + valUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (prevKRW) prevKRW.textContent = Math.round(valKRW).toLocaleString('vi-VN') + ' ₩';
    if (prevPnL) {
        const sign = diffUSD >= 0 ? '+' : '';
        const usdSign = diffUSD >= 0 ? '+$' : '-$';
        prevPnL.textContent = sign + pct.toFixed(2) + '% (' + usdSign + Math.abs(diffUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')';
        prevPnL.style.color = diffUSD >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
};

window.openAddCryptoModal = function () {
    if (typeof window.hideCryptoSuggestions === "function") window.hideCryptoSuggestions();
    document.getElementById('cryptoModalTitle').textContent = 'Thêm Đồng Coin (Crypto)';
    document.getElementById('editingCryptoId').value = '';
    document.getElementById('inputCryptoSymbol').value = '';
    document.getElementById('inputCryptoName').value = '';
    document.getElementById('inputCryptoAmount').value = '';
    document.getElementById('inputCryptoBuyPrice').value = '';
    document.getElementById('inputCryptoCurrentPrice').value = '';
    calcCryptoModalPreview();
    const modal = document.getElementById('assetCryptoModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
};

window.openEditCryptoModal = function (id) {
    const asset = portfolioAssets.find(a => a.id === id);
    if (!asset) return;
    document.getElementById('cryptoModalTitle').textContent = 'Sửa Đồng Coin (Crypto)';
    document.getElementById('editingCryptoId').value = asset.id;
    document.getElementById('inputCryptoSymbol').value = asset.symbol;
    document.getElementById('inputCryptoName').value = asset.name;
    document.getElementById('inputCryptoAmount').value = asset.amount;
    document.getElementById('inputCryptoBuyPrice').value = asset.buy_price;
    document.getElementById('inputCryptoCurrentPrice').value = asset.current_price;
    calcCryptoModalPreview();
    const modal = document.getElementById('assetCryptoModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
};

window.closeAssetCryptoModal = function () {
    if (typeof window.hideCryptoSuggestions === "function") window.hideCryptoSuggestions();
    const modal = document.getElementById('assetCryptoModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
};

window.saveCryptoAsset = async function () {
    const symbol = (document.getElementById('inputCryptoSymbol').value || '').toUpperCase().trim();
    const name = (document.getElementById('inputCryptoName').value || '').trim() || symbol;
    const amount = parseFloat(document.getElementById('inputCryptoAmount').value);
    const buy_price = parseFloat(document.getElementById('inputCryptoBuyPrice').value);
    const current_price = parseFloat(document.getElementById('inputCryptoCurrentPrice').value) || buy_price;
    const editId = document.getElementById('editingCryptoId').value;

    if (!symbol || isNaN(amount) || amount <= 0 || isNaN(buy_price) || buy_price < 0) {
        if (typeof window.showToast === 'function') {
            window.showToast('Vui lòng nhập đầy đủ ký hiệu, số lượng và giá mua hợp lệ!', 'error');
        }
        return;
    }

    const assetId = isValidUUID(editId) ? editId : generateAssetUUID();
    const assetData = {
        id: assetId,
        type: 'crypto',
        symbol,
        name,
        amount,
        buy_price,
        current_price,
        currency: 'USD'
    };

    if (editId) {
        const idx = portfolioAssets.findIndex(a => a.id === editId);
        if (idx !== -1) portfolioAssets[idx] = assetData;
        else portfolioAssets.push(assetData);
    } else {
        portfolioAssets.push(assetData);
    }

    savePortfolioToLocal();
    let cloudSynced = false;
    if (window.currentUser && typeof window.savePortfolioAsset === 'function') {
        try {
            const saved = await window.savePortfolioAsset(assetData);
            if (saved) cloudSynced = true;
        } catch (e) {
            console.warn('Supabase save error:', e.message);
        }
    }

    closeAssetCryptoModal();
    renderPortfolio();
    updateOverviewCards();
    if (typeof window.showToast === 'function') {
        window.showToast('Đã lưu đồng coin thành công!', 'success');
    }
};

// Stock Quick Chips & Actions
window.selectStockChip = function (sym, name) {
    document.getElementById('inputStockSymbol').value = sym;
    document.getElementById('inputStockName').value = name;
    fetchLiveStockPriceForModal();
};

window.onStockSymbolChange = function (val) {
    const sym = val.toUpperCase().trim();
    const defaults = {
        'FPT': 'Tập đoàn FPT (Công nghệ)',
        'HPG': 'Tập đoàn Hòa Phát (Thép)',
        'VCB': 'Ngân hàng Vietcombank',
        'MWG': 'Công ty CP Đầu tư Thế Giới Di Động',
        'TCB': 'Ngân hàng Techcombank',
        'SSI': 'Chứng khoán SSI',
        'VNM': 'Vinamilk',
        'VIC': 'Tập đoàn Vingroup',
        'VHM': 'Vinhomes'
    };
    if (defaults[sym] && !document.getElementById('inputStockName').value) {
        document.getElementById('inputStockName').value = defaults[sym];
    }
    if (sym.length >= 3) {
        fetchLiveStockPriceForModal();
    }
};

window.fetchLiveStockPriceForModal = async function () {
    const sym = (document.getElementById('inputStockSymbol').value || '').toUpperCase().trim();
    if (!sym) return;
    try {
        const res = await fetch(`https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?symbol=${sym}&resolution=1D`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.c && data.c.length > 0) {
                const lastC = data.c[data.c.length - 1];
                const liveVND = Math.round(lastC * 1000);
                document.getElementById('inputStockCurrentPrice').value = liveVND;
                calcStockModalPreview();
                if (typeof window.showToast === 'function') {
                    window.showToast('Đã lấy giá live ' + sym + ': ' + liveVND.toLocaleString('vi-VN') + ' đ', 'info');
                }
                return;
            }
        }
    } catch (e) {
        console.warn('Live stock modal fetch error:', e.message);
    }
    const defaults = { 'FPT': 58200, 'HPG': 28400, 'VCB': 53000, 'MWG': 62000, 'TCB': 34500, 'SSI': 32000 };
    if (defaults[sym]) {
        document.getElementById('inputStockCurrentPrice').value = defaults[sym];
        calcStockModalPreview();
        if (typeof window.showToast === 'function') {
            window.showToast('Đã cập nhật giá tham chiếu: ' + defaults[sym].toLocaleString('vi-VN') + ' đ', 'info');
        }
    }
};

window.calcStockModalPreview = function () {
    const amt = parseFloat(document.getElementById('inputStockAmount').value) || 0;
    const buy = parseFloat(document.getElementById('inputStockBuyPrice').value) || 0;
    const cur = parseFloat(document.getElementById('inputStockCurrentPrice').value) || buy;
    const valVND = amt * cur;
    const costVND = amt * buy;
    const diffVND = valVND - costVND;
    const pct = costVND > 0 ? (diffVND / costVND) * 100 : 0;
    const valKRW = convertCurrency(valVND, 'VND', 'KRW');

    const prevVal = document.getElementById('stockPreviewVal');
    const prevKRW = document.getElementById('stockPreviewKRW');
    const prevPnL = document.getElementById('stockPreviewPnL');

    if (prevVal) prevVal.textContent = Math.round(valVND).toLocaleString('vi-VN') + ' ₫';
    if (prevKRW) prevKRW.textContent = Math.round(valKRW).toLocaleString('vi-VN') + ' ₩';
    if (prevPnL) {
        const sign = diffVND >= 0 ? '+' : '';
        prevPnL.textContent = sign + pct.toFixed(2) + '% (' + sign + Math.round(diffVND).toLocaleString('vi-VN') + ' đ)';
        prevPnL.style.color = diffVND >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }
};

window.openAddStockModal = function () {
    document.getElementById('stockModalTitle').textContent = 'Thêm Cổ Phiếu Việt Nam';
    document.getElementById('editingStockId').value = '';
    document.getElementById('inputStockSymbol').value = '';
    document.getElementById('inputStockName').value = '';
    document.getElementById('inputStockAmount').value = '';
    document.getElementById('inputStockBuyPrice').value = '';
    document.getElementById('inputStockCurrentPrice').value = '';
    calcStockModalPreview();
    const modal = document.getElementById('assetStockModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
};

window.openEditStockModal = function (id) {
    const asset = portfolioAssets.find(a => a.id === id);
    if (!asset) return;
    document.getElementById('stockModalTitle').textContent = 'Sửa Cổ Phiếu Việt Nam';
    document.getElementById('editingStockId').value = asset.id;
    document.getElementById('inputStockSymbol').value = asset.symbol;
    document.getElementById('inputStockName').value = asset.name;
    document.getElementById('inputStockAmount').value = asset.amount;
    document.getElementById('inputStockBuyPrice').value = asset.buy_price;
    document.getElementById('inputStockCurrentPrice').value = asset.current_price;
    calcStockModalPreview();
    const modal = document.getElementById('assetStockModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
};

window.closeAssetStockModal = function () {
    const modal = document.getElementById('assetStockModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
};

window.saveStockAsset = async function () {
    const symbol = (document.getElementById('inputStockSymbol').value || '').toUpperCase().trim();
    const name = (document.getElementById('inputStockName').value || '').trim() || symbol;
    const amount = parseFloat(document.getElementById('inputStockAmount').value);
    const buy_price = parseFloat(document.getElementById('inputStockBuyPrice').value);
    const current_price = parseFloat(document.getElementById('inputStockCurrentPrice').value) || buy_price;
    const editId = document.getElementById('editingStockId').value;

    if (!symbol || isNaN(amount) || amount <= 0 || isNaN(buy_price) || buy_price < 0) {
        if (typeof window.showToast === 'function') {
            window.showToast('Vui lòng nhập đầy đủ mã cổ phiếu, khối lượng và giá vốn!', 'error');
        }
        return;
    }

    const assetId = isValidUUID(editId) ? editId : generateAssetUUID();
    const assetData = {
        id: assetId,
        type: 'stock_vn',
        symbol,
        name,
        amount,
        buy_price,
        current_price,
        currency: 'VND'
    };

    if (editId) {
        const idx = portfolioAssets.findIndex(a => a.id === editId);
        if (idx !== -1) portfolioAssets[idx] = assetData;
        else portfolioAssets.push(assetData);
    } else {
        portfolioAssets.push(assetData);
    }

    savePortfolioToLocal();
    let cloudSynced = false;
    if (window.currentUser && typeof window.savePortfolioAsset === 'function') {
        try {
            const saved = await window.savePortfolioAsset(assetData);
            if (saved) cloudSynced = true;
        } catch (e) {
            console.warn('Supabase save error:', e.message);
        }
    }

    closeAssetStockModal();
    renderPortfolio();
    updateOverviewCards();
    if (typeof window.showToast === 'function') {
        window.showToast('Đã lưu cổ phiếu thành công!', 'success');
    }
};

// Cash Actions
window.openAddCashModal = function () {
    document.getElementById('cashModalTitle').textContent = 'Thêm Tài Khoản Tiền Mặt';
    document.getElementById('editingCashId').value = '';
    document.getElementById('inputCashName').value = '';
    document.getElementById('inputCashCurrency').value = 'KRW';
    document.getElementById('inputCashAmount').value = '';
    const modal = document.getElementById('assetCashModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
};

window.openEditCashModal = function (id) {
    const asset = portfolioAssets.find(a => a.id === id);
    if (!asset) return;
    document.getElementById('cashModalTitle').textContent = 'Sửa Tài Khoản Tiền Mặt';
    document.getElementById('editingCashId').value = asset.id;
    document.getElementById('inputCashName').value = asset.name;
    document.getElementById('inputCashCurrency').value = asset.currency || 'KRW';
    document.getElementById('inputCashAmount').value = asset.amount;
    const modal = document.getElementById('assetCashModal');
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }
};

window.closeAssetCashModal = function () {
    const modal = document.getElementById('assetCashModal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
};

window.saveCashAsset = async function () {
    const name = (document.getElementById('inputCashName').value || '').trim();
    const currency = document.getElementById('inputCashCurrency').value || 'KRW';
    const amount = parseFloat(document.getElementById('inputCashAmount').value);
    const editId = document.getElementById('editingCashId').value;

    if (!name || isNaN(amount) || amount < 0) {
        if (typeof window.showToast === 'function') {
            window.showToast('Vui lòng nhập tên tài khoản và số dư hợp lệ!', 'error');
        }
        return;
    }

    const assetId = isValidUUID(editId) ? editId : generateAssetUUID();
    const assetData = {
        id: assetId,
        type: 'cash',
        symbol: currency,
        name,
        amount,
        buy_price: 1,
        current_price: 1,
        currency
    };

    if (editId) {
        const idx = portfolioAssets.findIndex(a => a.id === editId);
        if (idx !== -1) portfolioAssets[idx] = assetData;
        else portfolioAssets.push(assetData);
    } else {
        portfolioAssets.push(assetData);
    }

    savePortfolioToLocal();
    let cloudSynced = false;
    if (window.currentUser && typeof window.savePortfolioAsset === 'function') {
        try {
            const saved = await window.savePortfolioAsset(assetData);
            if (saved) cloudSynced = true;
        } catch (e) {
            console.warn('Supabase save error:', e.message);
        }
    }

    closeAssetCashModal();
    renderPortfolio();
    updateOverviewCards();
    if (typeof window.showToast === 'function') {
        window.showToast('Đã lưu tài khoản tiền mặt!', 'success');
    }
};

window.deleteAsset = async function (id) {
    if (typeof window.gozConfirm === 'function') {
        const confirmed = await window.gozConfirm({
            title: 'Xóa tài sản',
            message: 'Bạn có chắc chắn muốn xóa tài sản này khỏi danh mục theo dõi?',
            okText: 'Xóa',
            danger: true
        });
        if (!confirmed) return;
    }

    portfolioAssets = portfolioAssets.filter(a => a.id !== id);
    savePortfolioToLocal();
    if (window.currentUser && typeof window.deletePortfolioAssetFromDB === 'function') {
        try {
            await window.deletePortfolioAssetFromDB(id);
        } catch (e) {
            console.warn('Supabase delete error:', e.message);
        }
    }
    renderPortfolio();
    updateOverviewCards();
    if (typeof window.showToast === 'function') {
        window.showToast('Đã xóa tài sản khỏi danh mục', 'info');
    }
};

// ========================================================
// HOOKS INTO EXISTING APP.JS FUNCTIONS
// ========================================================

// Wrap switchTab
const origSwitchTab = window.switchTab;
window.switchTab = function (tabId) {
    if (typeof origSwitchTab === 'function') {
        origSwitchTab(tabId);
    }

    // Update Top Workspace Header Page Title
    const tabTitles = {
        'overview': 'Tổng Quan Tài Chính',
        'assets': 'Quản Trị Danh Mục Tài Sản',
        'budget': 'Ngân Sách & Thu Chi 12 Tháng',
        'exchange': 'Tỷ Giá & Ngoại Hối Realtime',
        'settings': 'Cài Đặt & Bảo Mật'
    };
    const titleEl = document.getElementById('pageCurrentTabTitle');
    if (titleEl && tabTitles[tabId]) titleEl.textContent = tabTitles[tabId];

    // Update Top Header & Sidebar Navigation Active State
    document.querySelectorAll('.header-nav-item, .sidebar-nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    const hBtn = document.getElementById('h-nav-' + tabId);
    if (hBtn) hBtn.classList.add('active');
    const sbBtn = document.getElementById('sb-nav-' + tabId);
    if (sbBtn) sbBtn.classList.add('active');

    // Update Overview Quick Tabs Active State
    document.querySelectorAll('.overview-quick-tabs .ov-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const ovPill = document.getElementById('ov-pill-' + tabId);
    if (ovPill) ovPill.classList.add('active');

    // Update Mobile Bottom Nav Active State
    document.querySelectorAll('.mobile-bottom-nav a').forEach(btn => {
        btn.classList.remove('active');
    });
    const mBtn = document.getElementById('m-nav-' + tabId);
    if (mBtn) mBtn.classList.add('active');

    if (tabId === 'assets') {
        renderPortfolio();
    } else if (tabId === 'budget') {
        if (typeof window.renderMonthlyBudgetTable === 'function') window.renderMonthlyBudgetTable();
        if (typeof window.renderBudgetDashboard === 'function') window.renderBudgetDashboard();
    }
    if (typeof window.refreshIcons === 'function') {
        window.refreshIcons();
    }
};

// Hook into updateRateUI to update Sidebar live rates
const origUpdateRateUI = window.updateRateUI;
window.updateRateUI = function (widget, statusEl, usdWidget, usdSubtext, statusLabel) {
    if (typeof origUpdateRateUI === 'function') {
        origUpdateRateUI(widget, statusEl, usdWidget, usdSubtext, statusLabel);
    }

    const r = window.exchangeRate || 19.15;
    const u = window.usdRate || 25744;
    const usdKrwVal = (u && r) ? (u / r) : 1344.1;

    // Top Header & Sidebar Live Rates
    const hdrKrw = document.getElementById('hdrRateKrw');
    const hdrUsd = document.getElementById('hdrRateUsd');
    if (hdrKrw) hdrKrw.textContent = r.toFixed(2) + ' đ';
    if (hdrUsd) hdrUsd.textContent = Math.round(u).toLocaleString('vi-VN') + ' đ';

    const sbKrw = document.getElementById('sbRateKrw');
    const sbUsd = document.getElementById('sbRateUsd');
    const sbUsdKrw = document.getElementById('sbRateUsdKrw');
    if (sbKrw) sbKrw.textContent = r.toFixed(2) + ' đ';
    if (sbUsd) sbUsd.textContent = Math.round(u).toLocaleString('vi-VN') + ' đ';
    if (sbUsdKrw) sbUsdKrw.textContent = usdKrwVal.toFixed(1) + ' ₩';

    renderPortfolio();
    updateOverviewCards();
};

// Hook into renderSummary
const origRenderSummary = window.renderSummary;
window.renderSummary = function () {
    if (typeof origRenderSummary === 'function') {
        origRenderSummary();
    }
    updateOverviewCards();
};

// Global exports for live price refresh
window.refreshCryptoPrices = refreshCryptoPrices;
window.refreshStockPrices = refreshStockPrices;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadPortfolioData();
        startLiveAssetPolling();


    }, 200);
});
