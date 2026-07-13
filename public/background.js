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
    }

    if (alarm.name === 'resetDaily') {
        await checkDailyReset();
    }
});

// Track active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await saveCurrentTime();
    const tab = await chrome.tabs.get(activeInfo.tabId);
    activeTab = tab;
    startTime = Date.now();
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
        // Browser lost focus — save current time
        await saveCurrentTime();
        startTime = null;
    } else {
        // Browser regained focus — start tracking
        startTime = Date.now();
    }
});

async function saveCurrentTime() {
    if (!activeTab || !startTime) return;

    const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
    if (elapsed < 0.1) return; // ignore less than 6 seconds

    try {
        const url = activeTab.url || '';
        if (!url.startsWith('http')) return;

        const domain = new URL(url).hostname.replace('www.', '');
        const category = CATEGORY_MAP[domain] || 'other';

        // Update local storage
        const result = await chrome.storage.local.get(['todayConsumption', 'pendingSync']);
        const todayConsumption = result.todayConsumption || {};
        const pendingSync = result.pendingSync || [];

        todayConsumption[category] = (todayConsumption[category] || 0) + elapsed;

        // Add to pending sync queue
        const today = new Date().toISOString().split('T')[0];
        pendingSync.push({ domain, category, minutes: elapsed, date: today });

        await chrome.storage.local.set({ todayConsumption, pendingSync });

        // Check budget
        await checkBudget(category, todayConsumption[category]);

    } catch (err) {
        console.error('Failed to save time:', err);
    }

    startTime = Date.now();
}

async function checkBudget(category, totalMinutes) {
    const result = await chrome.storage.local.get('budgets');
    const budgets = result.budgets || {};
    const limit = budgets[category];

    if (limit === undefined || limit === -1) return;

    if (totalMinutes >= limit) {
        // Show budget exceeded notification
        chrome.notifications.create(`budget-${category}`, {
            type: 'basic',
            iconUrl: 'icon-128x128.png',
            title: 'InfoDiet — Budget Reached',
            message: `You've reached your ${category} budget for today (${limit} minutes)`
        });
    }
}

async function syncToBackend() {
    const result = await chrome.storage.local.get(['token', 'pendingSync']);
    const token = result.token;
    const pendingSync = result.pendingSync || [];

    if (!token || pendingSync.length === 0 || !navigator.onLine) return;

    try {
        // Batch sync all pending entries
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

        // Clear pending sync queue
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
        // New day — reset today's consumption
        await chrome.storage.local.set({
            todayConsumption: {},
            lastResetDate: today
        });
        console.log('Daily consumption reset');
    }
}