export const CATEGORIES: Record<string, {
    label: string;
    emoji: string;
    color: string;
    defaultBudget: number;
}> = {
    news: {
        label: 'News & Politics',
        emoji: '📰',
        color: '#ff6b6b',
        defaultBudget: 20
    },
    social: {
        label: 'Social Media',
        emoji: '📱',
        color: '#ffd93d',
        defaultBudget: 30
    },
    entertainment: {
        label: 'Entertainment',
        emoji: '🎬',
        color: '#ff922b',
        defaultBudget: 60
    },
    educational: {
        label: 'Educational',
        emoji: '📚',
        color: '#00c896',
        defaultBudget: -1
    },
    shopping: {
        label: 'Shopping',
        emoji: '🛍️',
        color: '#cc5de8',
        defaultBudget: 15
    },
    forums: {
        label: 'Forums & Communities',
        emoji: '💬',
        color: '#339af0',
        defaultBudget: 20
    },
    gaming: {
        label: 'Gaming',
        emoji: '🎮',
        color: '#f06595',
        defaultBudget: 30
    },
    other: {
        label: 'Other',
        emoji: '🌐',
        color: 'rgba(255,255,255,0.3)',
        defaultBudget: -1
    }
};