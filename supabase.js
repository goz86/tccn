// ===== Supabase Client Module =====
var SUPABASE_URL = 'https://aivypksvvjhgaqzzcndb.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpdnlwa3N2dmpoZ2FxenpjbmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDY1NjYsImV4cCI6MjA4NzM4MjU2Nn0.2I_OUb0qTMWPLSYdaDEsUaDE_AeDYHqQawvNAEk8xkg';

var supabaseClient;
var currentUser = null;
    window.currentUser = null;
window.currentUser = null;

function initSupabase() {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ===== Auth Functions =====
async function signUpWithEmail(email, password, fullName) {
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    return data;
}

async function signInWithEmail(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signInWithGoogle() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    currentUser = null;
}

async function getSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return session;
}

function onAuthStateChange(callback) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
    window.currentUser = currentUser;
        callback(event, session);
    });
}

// ===== Data: Monthly Budgets =====
async function loadBudgets() {
    const { data, error } = await supabaseClient
        .from('monthly_budgets')
        .select('year, month, income, expense')
        .eq('user_id', currentUser.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true });
    if (error) throw error;
    const budgetMap = {};
    data.forEach(row => {
        const key = `${row.year}-${String(row.month + 1).padStart(2, '0')}`;
        budgetMap[key] = { income: Number(row.income), expense: Number(row.expense) };
    });
    return budgetMap;
}

async function saveBudget(year, month, income, expense) {
    const { error } = await supabaseClient
        .from('monthly_budgets')
        .upsert({
            user_id: currentUser.id,
            year,
            month,
            income: income || 0,
            expense: expense || 0,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,year,month'
        });
    if (error) throw error;
}

// ===== Data: Savings Goals =====
async function loadGoals() {
    const { data, error } = await supabaseClient
        .from('savings_goals')
        .select('id, name, amount_krw, months_duration, created_at')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(g => ({
        id: g.id,
        name: g.name,
        amountKRW: Number(g.amount_krw),
        months: g.months_duration ? Number(g.months_duration) : 0,
        createdAt: g.created_at
    }));
}

async function saveGoal(name, amountKRW, months) {
    const monthsVal = (months && Number(months) > 0) ? Number(months) : 0;
    const { data, error } = await supabaseClient
        .from('savings_goals')
        .insert({
            user_id: currentUser.id,
            name,
            amount_krw: amountKRW,
            months_duration: monthsVal
        })
        .select()
        .single();
    if (error) throw error;
    return {
        id: data.id,
        name: data.name,
        amountKRW: Number(data.amount_krw),
        months: data.months_duration ? Number(data.months_duration) : 0,
        createdAt: data.created_at
    };
}

async function deleteGoalFromDB(goalId) {
    const { error } = await supabaseClient
        .from('savings_goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', currentUser.id);
    if (error) throw error;
}

// ===== Profiles =====
async function getProfile() {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', currentUser.id)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

function isUUID(str) {
    return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function loadPortfolioAssets() {
    if (!currentUser && window.currentUser) currentUser = window.currentUser;
    if (!currentUser || !supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('portfolio_assets')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true });
        if (error) {
            console.warn('Supabase loadPortfolioAssets error:', error.message);
            return null;
        }
        return data || [];
    } catch (e) {
        console.warn('Supabase loadPortfolioAssets catch:', e.message);
        return null;
    }
}

async function savePortfolioAsset(asset) {
    if (!currentUser && window.currentUser) currentUser = window.currentUser;
    if (!currentUser || !supabaseClient) return null;
    try {
        const assetId = isUUID(asset.id) ? asset.id : generateUUID();
        const payload = {
            id: assetId,
            user_id: currentUser.id,
            type: asset.type || 'cash',
            symbol: (asset.symbol || '').toUpperCase().trim(),
            name: (asset.name || '').trim(),
            amount: Number(asset.amount) || 0,
            buy_price: Number(asset.buy_price) || 0,
            current_price: Number(asset.current_price) || Number(asset.buy_price) || 0,
            currency: asset.currency || 'KRW',
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabaseClient
            .from('portfolio_assets')
            .upsert(payload)
            .select()
            .single();
        if (error) {
            console.warn('Supabase savePortfolioAsset warning:', error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.warn('Supabase savePortfolioAsset catch:', e.message);
        return null;
    }
}

async function deletePortfolioAssetFromDB(assetId) {
    if (!currentUser && window.currentUser) currentUser = window.currentUser;
    if (!currentUser || !supabaseClient) return;
    if (!isUUID(assetId)) return;
    try {
        const { error } = await supabaseClient
            .from('portfolio_assets')
            .delete()
            .eq('id', assetId)
            .eq('user_id', currentUser.id);
        if (error) {
            console.warn('Supabase deletePortfolioAsset warning:', error.message);
        }
    } catch (e) {
        console.warn('Supabase deletePortfolioAsset catch:', e.message);
    }
}
// ===== Global Export =====
window.initSupabase = initSupabase;
window.signUpWithEmail = signUpWithEmail;
window.signInWithEmail = signInWithEmail;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getSession = getSession;
window.onAuthStateChange = onAuthStateChange;
window.loadBudgets = loadBudgets;
window.saveBudget = saveBudget;
window.loadGoals = loadGoals;
window.saveGoal = saveGoal;
window.deleteGoalFromDB = deleteGoalFromDB;
window.getProfile = getProfile;
window.loadPortfolioAssets = loadPortfolioAssets;
window.savePortfolioAsset = savePortfolioAsset;
window.deletePortfolioAssetFromDB = deletePortfolioAssetFromDB;
