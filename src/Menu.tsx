import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from './categories';

interface ConsumptionData {
    [category: string]: number;
}

interface BudgetData {
    [category: string]: number;
}

function Menu() {
    const navigate = useNavigate();
    const [plan, setPlan] = useState<string>('free');
    const [username, setUsername] = useState('');
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [todayConsumption, setTodayConsumption] = useState<ConsumptionData>({});
    const [budgets, setBudgets] = useState<BudgetData>({});
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [showUpgradePage, setShowUpgradePage] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const syncAll = async () => {
            const result = await chrome.storage.local.get([
                'token', 'plan', 'todayConsumption', 'budgets', 'lastSynced'
            ]);
            const token = result.token as string | undefined;
            const cachedPlan = result.plan as string | undefined;

            setPlan(cachedPlan || 'free');
            setTodayConsumption((result.todayConsumption as ConsumptionData) || {});
            setBudgets((result.budgets as BudgetData) || {});
            setLastSynced(result.lastSynced as string || null);

            if (!token) return;

            // Fetch username
            const userRes = await fetch('https://infodiet-web.vercel.app/api/user/me', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const userData = await userRes.json();
            if (userData.username) setUsername(userData.username);

            // Fetch plan status
            const statusRes = await fetch('https://infodiet-web.vercel.app/api/stripe/status', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const statusData = await statusRes.json();
            if (statusData.plan !== cachedPlan) {
                await chrome.storage.local.set({ plan: statusData.plan });
                setPlan(statusData.plan);
            }

            // Fetch budgets
            const budgetRes = await fetch('https://infodiet-web.vercel.app/api/budget', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const budgetData = await budgetRes.json();
            if (budgetData.budgets) {
                setBudgets(budgetData.budgets);
                await chrome.storage.local.set({ budgets: budgetData.budgets });
            }

            await chrome.storage.local.set({ lastSynced: new Date().toISOString() });
            setLastSynced(new Date().toISOString());
        };
        syncAll();
    }, []);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync consumption from storage in real time
    useEffect(() => {
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.todayConsumption?.newValue) {
                setTodayConsumption(changes.todayConsumption.newValue as ConsumptionData);
            }
            if (changes.budgets?.newValue) {
                setBudgets(changes.budgets.newValue as BudgetData);
            }
        };
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    const handleLogout = async () => {
        await chrome.storage.local.remove(['token', 'plan', 'todayConsumption', 'budgets']);
        navigate('/login');
    };

    const handleUpgrade = async () => {
        const { token } = await chrome.storage.local.get('token');
        const response = await fetch('https://infodiet-web.vercel.app/api/stripe/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.trial) {
            await chrome.storage.local.set({ plan: 'pro' });
            setPlan('pro');
            setShowUpgradePage(false);
            return;
        }

        if (data.url) {
            chrome.tabs.create({ url: data.url });
        }
    };

    const handleDashboard = async () => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;
        chrome.tabs.create({
            url: `https://infodiet-web.vercel.app/dashboard?token=${token}`
        });
    };

    const handleBudgetSettings = async () => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;
        chrome.tabs.create({
            url: `https://infodiet-web.vercel.app/budget?token=${token}`
        });
    };

    const formatMinutes = (mins: number) => {
        if (mins < 1) return '< 1m';
        if (mins < 60) return `${Math.round(mins)}m`;
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const formatLastSynced = (iso: string | null) => {
        if (!iso) return 'Never';
        const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    const getInitials = (name: string) => name ? name.slice(0, 2).toUpperCase() : '?';

    const getCategoryStatus = (category: string) => {
        const spent = todayConsumption[category] || 0;
        const limit = budgets[category] ?? CATEGORIES[category]?.defaultBudget ?? -1;
        if (limit === -1) return 'unlimited';
        const pct = (spent / limit) * 100;
        if (pct >= 100) return 'over';
        if (pct >= 80) return 'warning';
        return 'ok';
    };

    const getStatusColor = (status: string) => {
        if (status === 'over') return '#ff6b6b';
        if (status === 'warning') return '#ffd93d';
        if (status === 'unlimited') return 'rgba(255,255,255,0.2)';
        return '#00c896';
    };

    const menuItemStyle: React.CSSProperties = {
        display: 'block',
        width: '100%',
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        textAlign: 'left',
        cursor: 'pointer'
    };

    return (
        <div className="menuBackground" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 640 }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 16px',
                borderBottom: '1px solid rgba(0,200,150,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>🥗</span>
                    <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>InfoDiet</span>
                </div>

                {/* Profile Icon */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowProfileMenu(prev => !prev)}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: plan === 'pro'
                                ? 'linear-gradient(135deg, #00c896, #00a57a)'
                                : 'rgba(255,255,255,0.15)',
                            border: plan === 'pro'
                                ? '2px solid #00c896'
                                : '2px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {getInitials(username)}
                    </button>

                    {/* Dropdown */}
                    {showProfileMenu && (
                        <div style={{
                            position: 'absolute',
                            top: 44,
                            right: 0,
                            background: '#111a16',
                            border: '1px solid rgba(0,200,150,0.15)',
                            borderRadius: 12,
                            padding: '8px 0',
                            minWidth: 220,
                            zIndex: 100,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }}>
                            {/* User info */}
                            <div style={{
                                padding: '10px 16px 12px',
                                borderBottom: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>
                                    {username}
                                </p>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: 20,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: plan === 'pro'
                                        ? 'linear-gradient(135deg, #00c896, #00a57a)'
                                        : 'rgba(255,255,255,0.1)',
                                    color: 'white',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block'
                                }}>
                                    {plan === 'pro'
                                        ? '🥗 PRO'
                                        : 'FREE'}
                                </span>
                            </div>

                            {/* Dashboard */}
                            <button onClick={() => { handleDashboard(); setShowProfileMenu(false); }} style={menuItemStyle}>
                                📊 Full Dashboard
                            </button>

                            <button onClick={() => { handleBudgetSettings(); setShowProfileMenu(false); }} style={menuItemStyle}>
                                ⚙️ Manage Budgets
                            </button>

                            {/* Free tier */}
                            {plan === 'free' && (
                                <button
                                    onClick={() => { setShowUpgradePage(true); setShowProfileMenu(false); }}
                                    style={{ ...menuItemStyle, color: '#00c896' }}
                                >
                                    ⭐ Upgrade to Pro
                                </button>
                            )}

                            {/* Sync */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                borderTop: '1px solid rgba(255,255,255,0.08)'
                            }}>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                                    🔄 {formatLastSynced(lastSynced)}
                                </span>
                            </div>

                            {/* Logout */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <button
                                    onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                                    style={{ ...menuItemStyle, color: '#ff6b6b' }}
                                >
                                    🚪 Log out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main content — Today's consumption */}
            <div style={{ padding: '12px 16px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12
                }}>
                    <h3 style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0 }}>
                        Today's Information Diet
                    </h3>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                </div>

                {/* Category list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(CATEGORIES).map(([key, cat]) => {
                        const spent = todayConsumption[key] || 0;
                        const limit = budgets[key] ?? cat.defaultBudget;
                        const status = getCategoryStatus(key);
                        const statusColor = getStatusColor(status);
                        const pct = limit === -1 ? 0 : Math.min((spent / limit) * 100, 100);

                        return (
                            <div key={key} style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${status === 'over' ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: 10,
                                padding: '10px 12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                                        <span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{cat.label}</span>
                                        {status === 'over' && (
                                            <span style={{
                                                fontSize: 9,
                                                fontWeight: 700,
                                                color: '#ff6b6b',
                                                background: 'rgba(255,107,107,0.15)',
                                                padding: '1px 6px',
                                                borderRadius: 10
                                            }}>OVER</span>
                                        )}
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                                        {spent > 0 ? formatMinutes(spent) : '0m'}
                                        {limit !== -1 && ` / ${limit}m`}
                                        {limit === -1 && ' / ∞'}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div style={{
                                    height: 4,
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: 2,
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: limit === -1 ? '0%' : `${pct}%`,
                                        background: statusColor,
                                        borderRadius: 2,
                                        transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total time */}
                <div style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: 'rgba(0,200,150,0.05)',
                    border: '1px solid rgba(0,200,150,0.15)',
                    borderRadius: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Total screen time today</span>
                    <span style={{ color: '#00c896', fontSize: 14, fontWeight: 700 }}>
                        {formatMinutes(Object.values(todayConsumption).reduce((a, b) => a + b, 0))}
                    </span>
                </div>
            </div>
            </div>

            {/* Upgrade page modal */}
            {showUpgradePage && (
                <UpgradePage
                    onUpgrade={() => {
                        setShowUpgradePage(false);
                        handleUpgrade();
                    }}
                    onClose={() => setShowUpgradePage(false)}
                />
            )}
        </div>
    );
}

// Inline upgrade page
function UpgradePage({ onUpgrade, onClose }: { onUpgrade: () => void; onClose: () => void }) {
    const features = [
        { emoji: '📊', title: 'Full Dashboard', desc: 'Weekly charts, trends, and your information quality score' },
        { emoji: '⏱', title: 'Custom Budgets', desc: 'Set daily time limits per category that actually work' },
        { emoji: '🚨', title: 'Budget Alerts', desc: 'Get notified when you approach or exceed your limits' },
        { emoji: '🔄', title: 'Cross-Device Sync', desc: 'Your consumption data syncs across all your browsers' },
        { emoji: '📈', title: 'Weekly Reports', desc: 'Email digest of your information diet every week' },
        { emoji: '🎯', title: 'Quality Score', desc: 'See your educational vs entertainment ratio over time' },
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            overflowY: 'auto',
            padding: 16
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #0a2e1a, #0a0f0d)',
                border: '1px solid rgba(0,200,150,0.3)',
                borderRadius: 16,
                padding: '24px 20px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <p style={{ fontSize: 32, margin: 0 }}>🥗</p>
                    <h2 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: '8px 0 4px' }}>
                        Upgrade to Pro
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>
                        $5/month — 7-day free trial, no credit card required
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{
                                width: 28, height: 28, flexShrink: 0,
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 16
                            }}>
                                {f.emoji}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>
                                    {f.title}
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0, lineHeight: 1.4 }}>
                                    {f.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onUpgrade}
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #00c896, #00a57a)',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: 8
                    }}
                >
                    Start 7-Day Free Trial
                </button>
                <p style={{
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: 10,
                    textAlign: 'center',
                    margin: '0 0 12px'
                }}>
                    No credit card required. Cancel anytime.
                </p>
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 13,
                        cursor: 'pointer'
                    }}
                >
                    Maybe later
                </button>
            </div>
        </div>
    );
}

export default Menu;