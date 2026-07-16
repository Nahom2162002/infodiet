import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from './categories';

interface ConsumptionData {
    [category: string]: number;
}

interface BudgetData {
    [category: string]: number;
}

const FREE_FEATURES = [
    'Automatic content tracking',
    'All 8 content categories',
    "Today's consumption view",
];
const PRO_FEATURES = [
    'Everything in Free',
    'Daily budgets per category',
    'Budget blocking',
    'Information quality score',
    'Weekly trend dashboard',
    'Budget alerts',
    'Cross-device sync',
];

const GREEN = 'oklch(0.75 0.15 155)';
const AMBER = 'oklch(0.78 0.15 85)';
const RED = 'oklch(0.68 0.18 25)';
const NEUTRAL = 'oklch(0.5 0.02 160)';

const CATEGORY_HUE: Record<string, number> = {
    news: 250,
    social: 320,
    entertainment: 300,
    educational: 140,
    shopping: 70,
    forums: 200,
    gaming: 280,
    other: 230,
};
const CATEGORY_LETTER: Record<string, string> = {
    news: 'N',
    social: 'S',
    entertainment: 'E',
    educational: 'Ed',
    shopping: 'Sh',
    forums: 'F',
    gaming: 'G',
    other: 'O',
};

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
            const userRes = await fetch('https://www.getinfodiet.app/api/user/me', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const userData = await userRes.json();
            if (userData.username) setUsername(userData.username);

            // Fetch plan status
            const statusRes = await fetch('https://www.getinfodiet.app/api/user/plan', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            const statusData = await statusRes.json();
            if (statusData.plan !== cachedPlan) {
                await chrome.storage.local.set({ plan: statusData.plan });
                setPlan(statusData.plan);
            }

            // Fetch budgets
            const budgetRes = await fetch('https://www.getinfodiet.app/api/budget', {
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
        const response = await fetch('https://www.getinfodiet.app/api/stripe/checkout', {
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
            url: `https://www.getinfodiet.app/dashboard?token=${token}`
        });
    };

    const handleBudgetSettings = async () => {
        const result = await chrome.storage.local.get('token');
        const token = result.token as string;
        chrome.tabs.create({
            url: `https://www.getinfodiet.app/budget?token=${token}`
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

    const dropdownRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 20px',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer'
    };

    // Per-category cards + running totals for the summary ring
    let usedSum = 0;
    let limitSum = 0;
    const categoryCards = Object.entries(CATEGORIES).map(([key, cat]) => {
        const spent = todayConsumption[key] || 0;
        const limit = budgets[key] ?? cat.defaultBudget;
        const hasLimit = limit !== -1;
        const pct = hasLimit ? Math.min(100, (spent / limit) * 100) : 0;
        const status = !hasLimit ? 'neutral' : pct >= 100 ? 'over' : pct >= 75 ? 'near' : 'good';
        if (hasLimit) {
            usedSum += spent;
            limitSum += limit;
        }
        return { key, cat, spent, limit, hasLimit, pct, status };
    });

    const overallPct = limitSum > 0 ? Math.min(100, (usedSum / limitSum) * 100) : 0;
    const overallStatus = limitSum === 0 ? 'none' : overallPct >= 100 ? 'over' : overallPct >= 75 ? 'near' : 'good';
    const overallColor = overallStatus === 'over' ? RED : overallStatus === 'near' ? AMBER : overallStatus === 'none' ? NEUTRAL : GREEN;
    const statusLabel = overallStatus === 'over' ? 'Over budget' : overallStatus === 'near' ? 'Near your limit' : overallStatus === 'none' ? 'No budgets set' : 'On track';
    const statusSubtext = overallStatus === 'over'
        ? 'You’ve gone over your tracked-category budget. Consider cutting back today.'
        : overallStatus === 'near'
        ? 'You’re close to your limit across tracked categories. Pace yourself.'
        : overallStatus === 'none'
        ? (plan === 'pro' ? 'Set daily budgets per category to start tracking progress.' : 'Upgrade to Pro to set daily budgets per category.')
        : 'You’re comfortably within your tracked-category budget.';
    const ringGradient = limitSum === 0
        ? `conic-gradient(${NEUTRAL} 0deg 360deg)`
        : `conic-gradient(${overallColor} ${overallPct * 3.6}deg, oklch(1 0 0 / 0.08) ${overallPct * 3.6}deg)`;

    return (
        <div className="menuBackground" style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '32px 24px 56px',
            color: 'oklch(0.95 0.01 160)',
            fontFamily: "'Inter', system-ui, sans-serif"
        }}>
            <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 11,
                            background: `conic-gradient(${GREEN} 0deg 250deg, oklch(0.3 0.02 160) 250deg 360deg)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 2px 10px oklch(0.75 0.15 155 / 0.25)`
                        }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'oklch(0.14 0.015 160)' }} />
                        </div>
                        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>InfoDiet</span>
                    </div>

                    {/* Profile Icon */}
                    <div ref={profileRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowProfileMenu(prev => !prev)}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: plan === 'pro' ? GREEN : 'oklch(1 0 0 / 0.08)',
                                border: plan === 'pro' ? `2px solid ${GREEN}` : '2px solid oklch(1 0 0 / 0.12)',
                                color: plan === 'pro' ? 'oklch(0.14 0.02 160)' : 'oklch(0.9 0.01 160)',
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
                                width: 340,
                                maxWidth: 'none',
                                background: 'oklch(0.2 0.02 160)',
                                border: '1px solid oklch(1 0 0 / 0.08)',
                                borderRadius: 18,
                                overflow: 'hidden',
                                zIndex: 100,
                                boxShadow: '0 12px 40px oklch(0 0 0 / 0.35)'
                            }}>
                                {/* User info */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '24px 20px 20px'
                                }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: plan === 'pro' ? GREEN : 'oklch(1 0 0 / 0.08)',
                                        color: plan === 'pro' ? 'oklch(0.14 0.02 160)' : 'oklch(0.9 0.01 160)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 16,
                                        fontWeight: 700
                                    }}>
                                        {getInitials(username)}
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'oklch(0.95 0.01 160)' }}>{username}</div>
                                    {plan === 'pro' ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 999, background: GREEN }}>
                                            <div style={{ width: 8, height: 8, background: 'oklch(0.14 0.02 160)', transform: 'rotate(45deg)' }} />
                                            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: 'oklch(0.14 0.02 160)' }}>PRO</div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '6px 16px', borderRadius: 999, background: 'oklch(1 0 0 / 0.08)', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', color: 'oklch(0.7 0.01 160)' }}>
                                            FREE
                                        </div>
                                    )}
                                </div>

                                <div style={{ height: 1, background: 'oklch(1 0 0 / 0.07)' }} />

                                {plan === 'pro' ? (
                                    <>
                                        <button onClick={() => { handleDashboard(); setShowProfileMenu(false); }} style={dropdownRowStyle}>
                                            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'oklch(0.32 0.06 250)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 14 }}>
                                                    <div style={{ width: 4, height: 7, borderRadius: 2, background: 'oklch(0.8 0.1 250)' }} />
                                                    <div style={{ width: 4, height: 14, borderRadius: 2, background: 'oklch(0.8 0.1 250)' }} />
                                                    <div style={{ width: 4, height: 10, borderRadius: 2, background: 'oklch(0.8 0.1 250)' }} />
                                                </div>
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: 'oklch(0.9 0.01 160)' }}>Full Dashboard</span>
                                        </button>

                                        <button onClick={() => { handleBudgetSettings(); setShowProfileMenu(false); }} style={dropdownRowStyle}>
                                            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'oklch(0.32 0.06 85)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid oklch(0.8 0.08 85)' }} />
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: 'oklch(0.9 0.01 160)' }}>Manage Budgets</span>
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => { setShowUpgradePage(true); setShowProfileMenu(false); }} style={dropdownRowStyle}>
                                        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'oklch(0.32 0.08 155)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: 2, background: GREEN, transform: 'rotate(45deg)' }} />
                                        </div>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: GREEN }}>Upgrade to Pro</span>
                                    </button>
                                )}

                                <div style={{ height: 1, background: 'oklch(1 0 0 / 0.07)' }} />

                                {/* Sync */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px' }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'oklch(0.3 0.01 160)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid oklch(0.55 0.02 160)', borderTopColor: 'transparent' }} />
                                    </div>
                                    <span style={{ fontSize: 13, color: 'oklch(0.55 0.02 160)' }}>Synced {formatLastSynced(lastSynced)}</span>
                                </div>

                                <div style={{ height: 1, background: 'oklch(1 0 0 / 0.07)' }} />

                                {/* Logout */}
                                <button onClick={() => { handleLogout(); setShowProfileMenu(false); }} style={dropdownRowStyle}>
                                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'oklch(0.68 0.18 25 / 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `8px solid ${RED}` }} />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: RED }}>Log out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}>Your Information Diet</span>
                </div>

                {/* Summary ring */}
                <div style={{
                    background: 'oklch(0.2 0.02 160)',
                    border: '1px solid oklch(1 0 0 / 0.07)',
                    borderRadius: 20,
                    padding: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        width: 116,
                        height: 116,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: ringGradient
                    }}>
                        <div style={{
                            width: 92,
                            height: 92,
                            borderRadius: '50%',
                            background: 'oklch(0.2 0.02 160)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2
                        }}>
                            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>{formatMinutes(usedSum)}</div>
                            <div style={{ fontSize: 11, color: 'oklch(0.65 0.02 160)' }}>
                                of {limitSum > 0 ? formatMinutes(limitSum) : '∞'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180, flex: 1 }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '5px 11px',
                            borderRadius: 999,
                            background: 'oklch(0.3 0.02 160 / 0.6)',
                            color: overallColor,
                            fontSize: 12,
                            fontWeight: 700,
                            width: 'fit-content'
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: overallColor }} />
                            {statusLabel}
                        </div>
                        <div style={{ fontSize: 13, color: 'oklch(0.75 0.02 160)', lineHeight: 1.5 }}>{statusSubtext}</div>
                    </div>
                </div>

                {/* Category list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {categoryCards.map(({ key, cat, spent, limit, hasLimit, pct, status }) => {
                        const hue = CATEGORY_HUE[key] ?? 200;
                        const letter = CATEGORY_LETTER[key] ?? cat.label[0];
                        const barColor = status === 'over' ? RED : status === 'near' ? AMBER : status === 'neutral' ? NEUTRAL : GREEN;

                        return (
                            <div key={key} style={{
                                background: 'oklch(0.2 0.02 160)',
                                border: '1px solid oklch(1 0 0 / 0.06)',
                                borderRadius: 14,
                                padding: '14px 16px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 9,
                                            background: `oklch(0.32 0.06 ${hue})`,
                                            color: `oklch(0.85 0.08 ${hue})`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 13,
                                            fontWeight: 700
                                        }}>{letter}</div>
                                        <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.label}</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: 'oklch(0.65 0.02 160)', fontVariantNumeric: 'tabular-nums' }}>
                                        {hasLimit ? `${formatMinutes(spent)} / ${formatMinutes(limit)}` : `${formatMinutes(spent)} · no limit`}
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'oklch(1 0 0 / 0.07)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        borderRadius: 999,
                                        background: barColor,
                                        width: hasLimit ? `${pct}%` : '0%',
                                        transition: 'width 0.4s ease'
                                    }} />
                                </div>
                            </div>
                        );
                    })}
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

    return (
        <div className="upgradeOverlay">
            <div className="upgradeCard">
                <div className="authLogo" style={{ marginBottom: 8 }}>
                    <div className="authLogo-dot" />
                </div>
                <h2 className="authTitle">Upgrade to Pro</h2>
                <p className="authSubtitle">
                    $9.99 — launch price, lifetime access (price goes up soon)
                </p>

                <span className="upgradeBadge">FREE</span>
                <div className="upgradeFeatureList">
                    {FREE_FEATURES.map((f, i) => (
                        <div key={i} className="upgradeFeature">
                            <div className="upgradeFeature-check">✓</div>
                            <div className="upgradeFeature-text">{f}</div>
                        </div>
                    ))}
                </div>

                <span className="upgradeBadge upgradeBadge-pro">PRO</span>
                <div className="upgradeFeatureList upgradeFeatureList-pro">
                    {PRO_FEATURES.map((f, i) => (
                        <div key={i} className="upgradeFeature">
                            <div className="upgradeFeature-check">✓</div>
                            <div className="upgradeFeature-text-pro">{f}</div>
                        </div>
                    ))}
                </div>

                <button className="authbutton" onClick={onUpgrade}>
                    Upgrade to Pro
                </button>
                <button className="authbutton authbutton-secondary" onClick={onClose}>
                    Maybe later
                </button>
            </div>
        </div>
    );
}

export default Menu;
