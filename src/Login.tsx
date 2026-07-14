import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [username, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('https://infodiet-web.vercel.app/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (data.token) {
                const planRes = await fetch('https://infodiet-web.vercel.app/api/user/plan', {
                    headers: { 'authorization': `Bearer ${data.token}` }
                });
                const planData = await planRes.json();

                await chrome.storage.local.set({
                    token: data.token,
                    plan: planData.plan
                });

                navigate('/menu');
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter') action();
    };

    return (
        <div className="login-background">
            <div className="login">
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: 48, margin: 0 }}>🥗</p>
                    <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '8px 0 4px' }}>
                        InfoDiet
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                        Your brain deserves a healthy diet
                    </p>
                </div>

                <input
                    type="text"
                    value={username}
                    onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Username"
                />
                <input
                    type="password"
                    value={password}
                    onKeyDown={(e) => handleKeyDown(e, handleLogin)}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                />

                <a
                    href={chrome.runtime.getURL("index.html#/forgot")}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#00c896', fontSize: 12 }}
                >
                    Forgot password?
                </a>

                {error && <p className="error-message">{error}</p>}

                <button className="authbutton" onClick={handleLogin} disabled={loading}>
                    {loading ? 'Logging in...' : 'Log in'}
                </button>
                <button
                    className="authbutton"
                    onClick={() => navigate('/create')}
                    style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)' }}
                >
                    Create Account
                </button>
            </div>
        </div>
    );
}

export default Login;