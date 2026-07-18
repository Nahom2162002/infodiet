importScripts('categoryMap.js');

// Initialize alarms
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('syncConsumption', { periodInMinutes: 5 });
    chrome.alarms.create('resetDaily', { periodInMinutes: 1 });
    chrome.alarms.create('trackTime', { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create('syncConsumption', { periodInMinutes: 5 });
    chrome.alarms.create('resetDaily', { periodInMinutes: 1 });
    chrome.alarms.create('trackTime', { periodInMinutes: 1 });
});

// Handle override messages from budget-exceeded.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'setOverride' && message.category) {
        (async () => {
            const result = await chrome.storage.local.get('overrides');
            const overrides = result.overrides || {};
            overrides[message.category] = Date.now() + 10 * 60 * 1000;
            await chrome.storage.local.set({ overrides });
            sendResponse({ ok: true });
        })();
        return true;
    }
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'syncConsumption') {
        await syncToBackend();

        const result = await chrome.storage.local.get('token');
        const token = result.token;
        if (!token || !navigator.onLine) return;

        try {
            const budgetRes = await fetch('https://www.getinfodiet.app/api/budget', {
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

    if (alarm.name === 'trackTime') {
        await syncActiveTabState();
        await saveCurrentTime();
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

        if (!category) return;

        const result = await chrome.storage.local.get([
            'todayConsumption', 'budgets', 'overrides', 'token'
        ]);

        if (!result.token) return;

        const todayConsumption = result.todayConsumption || {};
        const budgets = result.budgets || {};
        const overrides = result.overrides || {};

        const spent = todayConsumption[category] || 0;
        const limit = budgets[category];

        if (limit === undefined || limit === -1) return;

        const overrideExpiry = overrides[category];
        if (overrideExpiry && Date.now() < overrideExpiry) return;

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
        await setActiveTabState(tab);
    } catch (err) {
        console.error('Tab get failed:', err);
    }
});

// Track URL changes within the same tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        await saveCurrentTime();
        await setActiveTabState(tab);
    }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await saveCurrentTime();
        await chrome.storage.session.set({ startTime: null });
    } else {
        await syncActiveTabState();
    }
});

async function setActiveTabState(tab) {
    await chrome.storage.session.set({
        activeTabId: tab.id,
        activeTabUrl: tab.url || '',
        startTime: Date.now()
    });
}

async function syncActiveTabState() {
    const { activeTabId } = await chrome.storage.session.get('activeTabId');
    try {
        const focusedWindow = await chrome.windows.getLastFocused();
        if (!focusedWindow || !focusedWindow.focused) return;

        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab) return;

        if (tab.id !== activeTabId) {
            await setActiveTabState(tab);
            return;
        }

        const { startTime } = await chrome.storage.session.get('startTime');
        if (!startTime) {
            await setActiveTabState(tab);
        } else {
            await chrome.storage.session.set({ activeTabUrl: tab.url || '' });
        }
    } catch (err) {
        console.error('Failed to sync active tab state:', err);
    }
}

async function saveCurrentTime() {
    const { activeTabId, activeTabUrl, startTime } = await chrome.storage.session.get(['activeTabId', 'activeTabUrl', 'startTime']);
    if (!activeTabUrl || !startTime) return;

    const elapsed = (Date.now() - startTime) / 1000 / 60;
    if (elapsed < 0.1) return;

    try {
        if (!activeTabUrl.startsWith('http')) return;

        const domain = new URL(activeTabUrl).hostname.replace('www.', '');
        const category = CATEGORY_MAP[domain] || 'other';

        const result = await chrome.storage.local.get(['todayConsumption', 'pendingSync']);
        const todayConsumption = result.todayConsumption || {};
        const pendingSync = result.pendingSync || [];

        todayConsumption[category] = (todayConsumption[category] || 0) + elapsed;

        const today = getLocalDateString(new Date());
        pendingSync.push({ domain, category, minutes: elapsed, date: today });

        await chrome.storage.local.set({ todayConsumption, pendingSync });

        await checkBudget(category, todayConsumption[category], activeTabId, activeTabUrl);

    } catch (err) {
        console.error('Failed to save time:', err);
    }

    await chrome.storage.session.set({ startTime: Date.now() });
}

async function checkBudget(category, totalMinutes, tabId, currentUrl) {
    const result = await chrome.storage.local.get(['budgets', 'overrides', 'budgetAlerts']);
    const budgets = result.budgets || {};
    const overrides = result.overrides || {};
    const budgetAlerts = result.budgetAlerts || {};
    const limit = budgets[category];

    if (limit === undefined || limit === -1) return;

    const overrideExpiry = overrides[category];
    if (overrideExpiry && Date.now() < overrideExpiry) return;

    // Approaching budget notification — fires once per category per day at 80%
    if (totalMinutes >= limit * 0.8 && totalMinutes < limit && !budgetAlerts[category]) {
        chrome.notifications.create(`budget-approaching-${category}-${Date.now()}`, {
            type: 'basic',
            iconUrl: 'icon-128x128.png',
            title: '🥗 InfoDiet — Approaching Budget',
            message: `You're at ${Math.round((totalMinutes / limit) * 100)}% of your ${category} budget for today (${Math.round(totalMinutes)}/${limit} minutes).`
        });
        await chrome.storage.local.set({ budgetAlerts: { ...budgetAlerts, [category]: true } });
    }

    if (totalMinutes >= limit) {
        chrome.notifications.create(`budget-${category}-${Date.now()}`, {
            type: 'basic',
            iconUrl: 'icon-128x128.png',
            title: '🥗 InfoDiet — Budget Reached',
            message: `You've used your ${category} budget for today (${limit} minutes). New visits will be blocked.`
        });

        if (tabId !== undefined && currentUrl && !currentUrl.includes('budget-exceeded.html')) {
            try {
                await chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL(
                        `budget-exceeded.html?url=${encodeURIComponent(currentUrl)}&category=${category}&limit=${limit}&spent=${Math.round(totalMinutes)}`
                    )
                });
            } catch (err) {
                console.error('Failed to redirect over-budget tab:', err);
            }
        }
    }
}

async function syncToBackend() {
    const result = await chrome.storage.local.get(['token', 'pendingSync']);
    const token = result.token;
    const pendingSync = result.pendingSync || [];

    if (!token || pendingSync.length === 0 || !navigator.onLine) return;

    try {
        for (const entry of pendingSync) {
            await fetch('https://www.getinfodiet.app/api/consumption', {
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

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function checkDailyReset() {
    const result = await chrome.storage.local.get('lastResetDate');
    const today = getLocalDateString(new Date());

    if (result.lastResetDate !== today) {
        await chrome.storage.local.set({
            todayConsumption: {},
            overrides: {},
            budgetAlerts: {},
            lastResetDate: today
        });
        console.log('Daily consumption reset');
    }
}