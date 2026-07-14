const params = new URLSearchParams(window.location.search);
const url = decodeURIComponent(params.get('url') || '');
const category = params.get('category') || 'other';
const limit = params.get('limit') || '0';
const spent = params.get('spent') || '0';

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
document.getElementById('budgetInfo').innerHTML =
    `You've spent <strong>${Math.round(spent)} minutes</strong> on ${categoryLabels[category] || category} today.<br>Your daily limit is <strong>${limit} minutes</strong>.`;

document.getElementById('backBtn').addEventListener('click', () => {
    history.back();
});

document.getElementById('overrideBtn').addEventListener('click', () => {
    chrome.storage.local.get('overrides', (result) => {
        const overrides = result.overrides || {};
        overrides[category] = Date.now() + (10 * 60 * 1000);
        chrome.storage.local.set({ overrides }, () => {
            window.location.href = url;
        });
    });
});