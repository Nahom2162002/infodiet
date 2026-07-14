importScripts('categoryMap.js');

let activeTab = null;
let startTime = null;

// Initialize alarms
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('syncConsumption', { periodInMinutes: 5 });
    chrome.alarms.create('resetDaily', { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create('syncConsumption', { periodInMinutes: 5 });
    chrome.alarms.create('resetDaily', { periodInMinutes: 1 });
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'syncConsumption') {
        await syncToBackend();

        // Sync budgets
        const result = await chrome.storage.local.get('token');
        const token = result.token;
        if (!token || !navigator.onLine) return;

        try {
            const budgetRes = await fetch('https://your-vercel-url.vercel.app/api/budget', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            if (budgetRes.ok) {
                const budgetData = await budgetRes.json();
                if (budgetData.budgets) {
                    await chrome.storage.local.set({ budgets: budgetData.budgets });
                }
            }
        } catch (err) {
            console.error('Budget sync failed:', err);
        }
    }

    if (alarm.name === 'resetDaily') {
        await checkDailyReset();
    }
});

// Intercept navigation to check budget
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;
    if (details.url.includes('budget-exceeded.html')) return;
    if (!details.url.startsWith('http')) return;

    try {
        const url = new URL(details.url);
        const domain = url.hostname.replace('www.', '');
        const category = CATEGORY_MAP[domain];

        if (!category) return; // unknown site — don't block

        const result = await chrome.storage.local.get([
            'todayConsumption', 'budgets', 'overrides', 'token'
        ]);

        if (!result.token) return; // not logged in

        const todayConsumption = result.todayConsumption || {};
        const budgets = result.budgets || {};
        const overrides = result.overrides || {};

        const spent = todayConsumption[category] || 0;
        const limit = budgets[category];

        // No limit set or unlimited
        if (limit === undefined || limit === -1) return;

        // Check if override is active
        const overrideExpiry = overrides[category];
        if (overrideExpiry && Date.now() < overrideExpiry) return;

        // Check if over budget
        if (spent >= limit) {
            chrome.tabs.update(details.tabId, {
                url: chrome.runtime.getURL(
                    `budget-exceeded.html?url=${encodeURIComponent(details.url)}&category=${category}&limit=${limit}&spent=${Math.round(spent)}`
                )
            });
        }
    } catch (err) {
        console.error('Navigation check failed:', err);
    }
});

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await saveCurrentTime();
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        activeTab = tab;
        startTime = Date.now();
    } catch (err) {
        console.error('Tab get failed:', err);
    }
});

// Track URL changes within the same tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        await saveCurrentTime();
        activeTab = tab;
        startTime = Date.now();
    }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await saveCurrentTime();
        startTime = null;
    } else {
        startTime = Date.now();
    }
});

async function saveCurrentTime() {
    if (!activeTab || !startTime) return;

    const elapsed = (Date.now() - startTime) / 1000 / 60;
    if (elapsed < 0.1) return;

    try {
        const url = activeTab.url || '';
        if (!url.startsWith('http')) return;

        const domain = new URL(url).hostname.replace('www.', '');
        const category = CATEGORY_MAP[domain] || 'other';

        const result = await chrome.storage.local.get(['todayConsumption', 'pendingSync']);
        const todayConsumption = result.todayConsumption || {};
        const pendingSync = result.pendingSync || [];

        todayConsumption[category] = (todayConsumption[category] || 0) + elapsed;

        const today = new Date().toISOString().split('T')[0];
        pendingSync.push({ domain, category, minutes: elapsed, date: today });

        await chrome.storage.local.set({ todayConsumption, pendingSync });

        // Check budget after recording time
        await checkBudget(category, todayConsumption[category]);

    } catch (err) {
        console.error('Failed to save time:', err);
    }

    startTime = Date.now();
}

async function checkBudget(category, totalMinutes) {
    const result = await chrome.storage.local.get(['budgets', 'overrides']);
    const budgets = result.budgets || {};
    const overrides = result.overrides || {};
    const limit = budgets[category];

    if (limit === undefined || limit === -1) return;

    // Check if override is active
    const overrideExpiry = overrides[category];
    if (overrideExpiry && Date.now() < overrideExpiry) return;

    if (totalMinutes >= limit) {
        // Show notification
        chrome.notifications.create(`budget-${category}-${Date.now()}`, {
            type: 'basic',
            iconUrl: 'icon-128x128.png',
            title: '🥗 InfoDiet — Budget Reached',
            message: `You've used your ${category} budget for today (${limit} minutes). New visits will be blocked.`
        });
    }
}

async function syncToBackend() {
    const result = await chrome.storage.local.get(['token', 'pendingSync']);
    const token = result.token;
    const pendingSync = result.pendingSync || [];

    if (!token || pendingSync.length === 0 || !navigator.onLine) return;

    try {
        for (const entry of pendingSync) {
            await fetch('https://your-vercel-url.vercel.app/api/consumption', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': `Bearer ${token}`
                },
                body: JSON.stringify(entry)
            });
        }
        await chrome.storage.local.set({ pendingSync: [] });
        console.log(`Synced ${pendingSync.length} entries`);
    } catch (err) {
        console.error('Sync failed:', err);
    }
}

async function checkDailyReset() {
    const result = await chrome.storage.local.get('lastResetDate');
    const today = new Date().toISOString().split('T')[0];

    if (result.lastResetDate !== today) {
        await chrome.storage.local.set({
            todayConsumption: {},
            overrides: {},
            lastResetDate: today
        });
        console.log('Daily consumption reset');
    }
}