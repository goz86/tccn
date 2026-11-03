// ===== Supabase Client Module =====
var SUPABASE_URL = 'https://aivypksvvjhgaqzzcndb.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpdnlwa3N2dmpoZ2FxenpjbmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDY1NjYsImV4cCI6MjA4NzM4MjU2Nn0.2I_OUb0qTMWPLSYdaDEsUaDE_AeDYHqQawvNAEk8xkg';

var supabaseClient;
var currentUser = null;

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

async function loadPortfolioAssets() {
    if (!currentUser) return null;
    const { data, error } = await supabaseClient
        .from('portfolio_assets')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function savePortfolioAsset(asset) {
    if (!currentUser || !supabaseClient) return null;
    try {
        const payload = {
            ...asset,
            user_id: currentUser.id,
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
    if (!currentUser || !supabaseClient) return;
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
