// ========================================================
// FINMATE PRO - PORTFOLIO & ASSET MANAGEMENT MODULE
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

// Floating Mobile View Mode Toggle
window.toggleMobileViewMode = function () {
    document.body.classList.toggle('mobile-preview-mode');
    const isMobileMode = document.body.classList.contains('mobile-preview-mode');
    if (typeof window.showToast === 'function') {
        window.showToast(isMobileMode ? 'Đang xem ở giao diện mô phỏng Mobile' : 'Đã quay lại giao diện Dashboard', 'info');
    }
    if (typeof window.refreshIcons === 'function') window.refreshIcons();
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
window.chartViewMode = 'combo';
window.setChartTypeMode = function (mode) {
    chartViewMode = mode;
    window.chartViewMode = mode;
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

// Load Portfolio Data
async function loadPortfolioData() {
    const local = localStorage.getItem('goz_portfolio_assets');
    if (local) {
        try {
            portfolioAssets = JSON.parse(local);
        } catch (e) {
            portfolioAssets = DEFAULT_PORTFOLIO_ASSETS;
        }
    } else {
        portfolioAssets = DEFAULT_PORTFOLIO_ASSETS;
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

    // Sync from Supabase if logged in
    if (window.currentUser && typeof window.loadPortfolioAssets === 'function') {
        try {
            const dbAssets = await window.loadPortfolioAssets();
            if (dbAssets && dbAssets.length > 0) {
                portfolioAssets = dbAssets;
                savePortfolioToLocal();
            } else if (portfolioAssets.length > 0) {
                for (const a of portfolioAssets) {
                    await window.savePortfolioAsset(a);
                }
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

function savePortfolioToLocal() {
    localStorage.setItem('goz_portfolio_assets', JSON.stringify(portfolioAssets));
}

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
        refreshCryptoPrices();
        refreshStockPrices();
    }, 25000);
}

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

// Update the 4 Overview Metric Cards matching Image 1
function updateOverviewCards() {
    const { grandTotal } = getPortfolioTotals();
    const r = window.exchangeRate || 19.15;
    const u = window.usdRate || 25744;

    // 1. SỐ DƯ HIỆN TẠI (Hợp nhất)
    const totalBalEl = document.getElementById('totalBalance');
    const balKRWEl = document.getElementById('balanceKRW');
    if (totalBalEl) {
        totalBalEl.textContent = fmtDisplayCur(grandTotal);
    }
    if (balKRWEl) {
        balKRWEl.innerHTML = formatCrossCurrenciesHTML(grandTotal, displayCurrency);
    }

    // 2. TỔNG THU NHẬP (2026 / Năm đang chọn)
    let incVal = 0;
    let expVal = 0;
    const yr = window.budgetYear || (new Date().getFullYear());
    const yrPill = document.getElementById('cardIncomeYear');
    if (yrPill) yrPill.textContent = yr;

    if (typeof window.getBudgetTotals === 'function') {
        const t = window.getBudgetTotals(yr);
        if (t && (t.incKRW > 0 || t.expKRW > 0)) {
            incVal = t.incKRW;
            expVal = t.expKRW;
        }
    }
    if (incVal === 0 && expVal === 0 && typeof window.getAllTimeTotals === 'function') {
        const t = window.getAllTimeTotals();
        if (t && (t.incKRW > 0 || t.expKRW > 0)) {
            incVal = t.incKRW;
            expVal = t.expKRW;
        }
    }
    if (incVal === 0) incVal = 15969999;
    if (expVal === 0) expVal = 4008312;

    const totalIncEl = document.getElementById('totalIncome');
    const incKRWEl = document.getElementById('incomeKRW');
    if (totalIncEl) {
        const incInDisplay = convertCurrency(incVal, 'KRW', displayCurrency);
        totalIncEl.textContent = fmtDisplayCur(incInDisplay);
    }
    if (incKRWEl) {
        incKRWEl.innerHTML = formatCrossCurrenciesHTML(incVal, 'KRW');
    }

    // 3. TỔNG CHI TIÊU
    const totalExpEl = document.getElementById('totalExpense');
    const expKRWEl = document.getElementById('expenseKRW');
    if (totalExpEl) {
        const expInDisplay = convertCurrency(expVal, 'KRW', displayCurrency);
        totalExpEl.textContent = fmtDisplayCur(expInDisplay);
    }
    if (expKRWEl) {
        expKRWEl.innerHTML = formatCrossCurrenciesHTML(expVal, 'KRW');
    }
    const expGrowthEl = document.getElementById('expenseGrowthText');
    if (expGrowthEl) {
        const pctExp = incVal > 0 ? ((expVal / incVal) * 100).toFixed(1) : '0';
        expGrowthEl.innerHTML = `<i class="icon-svg" data-lucide="trending-down"></i> Chiếm ${pctExp}% thu nhập`;
    }

    // 4. TÍCH LŨY RÒNG
    const netSavingsEl = document.getElementById('netSavingsTotal');
    const netSavingsSubEl = document.getElementById('netSavingsSub');
    const netSavingsVal = Math.max(0, incVal - expVal);
    if (netSavingsEl) {
        const netInDisplay = convertCurrency(netSavingsVal, 'KRW', displayCurrency);
        netSavingsEl.textContent = fmtDisplayCur(netInDisplay);
    }
    if (netSavingsSubEl) {
        netSavingsSubEl.innerHTML = formatCrossCurrenciesHTML(netSavingsVal, 'KRW');
    }
    const savingsSubEl = document.getElementById('savingsRateSub');
    if (savingsSubEl) {
        const pct = incVal > 0 ? Math.round((netSavingsVal / incVal) * 100) : 92;
        savingsSubEl.textContent = 'Tiết kiệm ' + pct + '%';
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

    // Update Hero Card
    const heroTotalEl = document.getElementById('portfolioHeroTotal');
    const heroCashEl = document.getElementById('heroCashTotal');
    const heroCryptoEl = document.getElementById('heroCryptoTotal');
    const heroStockEl = document.getElementById('heroStockTotal');
    const countBadge = document.getElementById('assetTotalCountBadge');

    if (heroTotalEl) heroTotalEl.textContent = fmtDisplayCur(grandTotal);
    if (heroCashEl) heroCashEl.textContent = fmtDisplayCur(cashTotalInCur);
    if (heroCryptoEl) heroCryptoEl.textContent = fmtDisplayCur(cryptoTotalInCur);
    if (heroStockEl) heroStockEl.textContent = fmtDisplayCur(stockTotalInCur);
    if (countBadge) countBadge.textContent = portfolioAssets.length + ' Mục tài sản';

    // Update Section Subtitles
    const cryptoSub = document.getElementById('cryptoSummarySub');
    if (cryptoSub) {
        const diffUSD = cryptoValUSD - cryptoCostUSD;
        const pct = cryptoCostUSD > 0 ? (diffUSD / cryptoCostUSD) * 100 : 0;
        const sign = diffUSD >= 0 ? '+' : '';
        const usdSign = diffUSD >= 0 ? '+$' : '-$';
        cryptoSub.textContent = 'Tổng: ' + fmtDisplayCur(cryptoTotalInCur) + '  ' + sign + pct.toFixed(2) + '% (' + usdSign + Math.abs(diffUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')';
    }

    const stockSub = document.getElementById('stockSummarySub');
    if (stockSub) {
        const diffVND = stockValVND - stockCostVND;
        const pct = stockCostVND > 0 ? (diffVND / stockCostVND) * 100 : 0;
        const sign = diffVND >= 0 ? '+' : '';
        stockSub.textContent = 'Tổng: ' + fmtDisplayCur(stockTotalInCur) + '  ' + sign + pct.toFixed(2) + '% (' + sign + diffVND.toLocaleString('vi-VN') + ' đ)';
    }

    const cashSub = document.getElementById('cashSummarySub');
    if (cashSub) {
        cashSub.textContent = 'Tổng: ' + fmtDisplayCur(cashTotalInCur);
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
                            <div class="asset-badge ${badgeClass}">${escapeHtml(c.symbol)}</div>
                            <div class="asset-info">
                                <div class="asset-name-row">
                                    <span>${escapeHtml(c.name)}</span>
                                    <span class="asset-live-price">$${Number(c.current_price).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div class="asset-holdings-row">
                                    Nắm giữ: <strong>${c.amount} ${escapeHtml(c.symbol)}</strong> (Giá mua: $${Number(c.buy_price).toLocaleString('en-US')})
                                </div>
                            </div>
                        </div>
                        <div class="asset-item-right">
                            <div class="asset-values">
                                <div class="asset-val-main">${fmtDisplayCur(c.valInDisplay)}</div>
                                <div class="asset-pnl ${isPos ? 'pos' : 'neg'}">${sign}${pct.toFixed(1)}% (${usdSign}${Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</div>
                            </div>
                            <div class="asset-actions">
                                <button class="asset-action-btn" onclick="openEditCryptoModal('${c.id}')" title="Sửa"><i class="icon-svg" data-lucide="pencil"></i></button>
                                <button class="asset-action-btn delete" onclick="deleteAsset('${c.id}')" title="Xóa"><i class="icon-svg" data-lucide="trash-2"></i></button>
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
                return `
                    <div class="asset-item-row">
                        <div class="asset-item-left">
                            <div class="asset-badge ${badgeClass}">${escapeHtml(s.symbol)}</div>
                            <div class="asset-info">
                                <div class="asset-name-row">
                                    <span>${escapeHtml(s.name)}</span>
                                    <span class="asset-live-price">${s.current_price.toLocaleString('vi-VN')} đ</span>
                                </div>
                                <div class="asset-holdings-row">
                                    KL: <strong>${s.amount.toLocaleString('vi-VN')} CP</strong> (Giá vốn: ${s.buy_price.toLocaleString('vi-VN')} đ)
                                </div>
                            </div>
                        </div>
                        <div class="asset-item-right">
                            <div class="asset-values">
                                <div class="asset-val-main">${fmtDisplayCur(s.valInDisplay)}</div>
                                <div class="asset-pnl ${isPos ? 'pos' : 'neg'}">${sign}${pct.toFixed(1)}% (${sign}${diff.toLocaleString('vi-VN')} đ)</div>
                            </div>
                            <div class="asset-actions">
                                <button class="asset-action-btn" onclick="openEditStockModal('${s.id}')" title="Sửa"><i class="icon-svg" data-lucide="pencil"></i></button>
                                <button class="asset-action-btn delete" onclick="deleteAsset('${s.id}')" title="Xóa"><i class="icon-svg" data-lucide="trash-2"></i></button>
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
                            <div class="asset-badge">${badgeSymbol}</div>
                            <div class="asset-info">
                                <div class="asset-name-row">
                                    <span>${escapeHtml(k.name)}</span>
                                </div>
                                <div class="asset-holdings-row">
                                    Nguyên tệ: <strong>${k.amount.toLocaleString('vi-VN')} ${k.currency}</strong>
                                </div>
                            </div>
                        </div>
                        <div class="asset-item-right">
                            <div class="asset-values">
                                <div class="asset-val-main">${fmtDisplayCur(k.valInDisplay)}</div>
                                <div class="asset-pnl pos">Tiền mặt nhàn rỗi</div>
                            </div>
                            <div class="asset-actions">
                                <button class="asset-action-btn" onclick="openEditCashModal('${k.id}')" title="Sửa"><i class="icon-svg" data-lucide="pencil"></i></button>
                                <button class="asset-action-btn delete" onclick="deleteAsset('${k.id}')" title="Xóa"><i class="icon-svg" data-lucide="trash-2"></i></button>
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
window.selectCryptoChip = function (sym, name) {
    document.getElementById('inputCryptoSymbol').value = sym;
    document.getElementById('inputCryptoName').value = name;
    fetchLiveCryptoPriceForModal();
};

window.onCryptoSymbolChange = function (val) {
    const sym = val.toUpperCase().trim();
    const defaults = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'SOL': 'Solana',
        'USDT': 'Tether USD',
        'BNB': 'BNB',
        'XRP': 'Ripple',
        'ADA': 'Cardano',
        'DOGE': 'Dogecoin',
        'SUI': 'Sui',
        'NEAR': 'NEAR Protocol'
    };
    if (defaults[sym] && !document.getElementById('inputCryptoName').value) {
        document.getElementById('inputCryptoName').value = defaults[sym];
    }
    if (sym.length >= 2) {
        fetchLiveCryptoPriceForModal();
    }
};

window.fetchLiveCryptoPriceForModal = async function () {
    const sym = (document.getElementById('inputCryptoSymbol').value || '').toUpperCase().trim();
    if (!sym) return;
    try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + sym + 'USDT');
        if (res.ok) {
            const data = await res.json();
            document.getElementById('inputCryptoCurrentPrice').value = parseFloat(data.price);
            calcCryptoModalPreview();
            if (typeof window.showToast === 'function') {
                window.showToast('Đã lấy giá live Binance: $' + parseFloat(data.price).toLocaleString('en-US'), 'info');
            }
        }
    } catch (e) {
        console.warn(e);
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

    const assetData = {
        id: editId || 'crypto_' + Date.now(),
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
    } else {
        portfolioAssets.push(assetData);
    }

    savePortfolioToLocal();
    if (window.currentUser && typeof window.savePortfolioAsset === 'function') {
        try {
            await window.savePortfolioAsset(assetData);
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

    const assetData = {
        id: editId || 'stock_' + Date.now(),
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
    } else {
        portfolioAssets.push(assetData);
    }

    savePortfolioToLocal();
    if (window.currentUser && typeof window.savePortfolioAsset === 'function') {
        try {
            await window.savePortfolioAsset(assetData);
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

    const assetData = {
        id: editId || 'cash_' + Date.now(),
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
    } else {
        portfolioAssets.push(assetData);
    }

    savePortfolioToLocal();
    if (window.currentUser && typeof window.savePortfolioAsset === 'function') {
        try {
            await window.savePortfolioAsset(assetData);
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

        // Pre-fill instant converter inputs
        const krwIn = document.getElementById('krwInput');
        if (krwIn && !krwIn.value) {
            krwIn.value = '10,000';
            if (typeof window.convertFromKRW === 'function') window.convertFromKRW();
        }
    }, 200);
});
