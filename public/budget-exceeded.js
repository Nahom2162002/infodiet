const params = new URLSearchParams(window.location.search);
const category = params.get('category') || 'other';
const domain = params.get('domain') || '';
// The declarativeNetRequest-driven block only knows the domain (a redirect
// rule is registered ahead of time, before any specific visit); the direct
// live-redirect path from background.js still supplies the exact url.
const url = decodeURIComponent(params.get('url') || (domain ? `https://${domain}` : ''));

const categoryLabels = {
    news: 'News & Politics 📰',
    social: 'Social Media 📱',
    entertainment: 'Entertainment 🎬',
    educational: 'Educational 📚',
    shopping: 'Shopping 🛍️',
    forums: 'Forums & Communities 💬',
    gaming: 'Gaming 🎮',
    other: 'Other 🌐'
};

document.getElementById('categoryText').textContent = categoryLabels[category] || category;
document.getElementById('urlText').textContent = url;

(async () => {
    let limit = params.get('limit');
    let spent = params.get('spent');

    if (limit === null || spent === null) {
        const result = await chrome.storage.local.get(['budgets', 'todayConsumption']);
        limit = limit ?? String((result.budgets || {})[category] ?? 0);
        spent = spent ?? String((result.todayConsumption || {})[category] ?? 0);
    }

    document.getElementById('budgetInfo').innerHTML =
        `You've spent <strong>${Math.round(spent)} minutes</strong> on ${categoryLabels[category] || category} today.<br>Your daily limit is <strong>${limit} minutes</strong>.`;
})();

document.getElementById('backBtn').addEventListener('click', () => {
    history.back();
});

document.getElementById('overrideBtn').addEventListener('click', () => {
    // Routed through the background service worker so the
    // declarativeNetRequest rules are updated before we navigate — otherwise
    // the still-active block rule could redirect us right back here.
    chrome.runtime.sendMessage({ type: 'setOverride', category }, () => {
        window.location.href = url;
    });
});