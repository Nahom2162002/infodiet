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
                <div className="authLogo"><div className="authLogo-dot" /></div>
                <h1 className="authTitle">InfoDiet</h1>
                <p className="authSubtitle">Your brain deserves a healthy diet</p>

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
                    style={{ marginBottom: 10 }}
                />

                <a
                    href={chrome.runtime.getURL("index.html#/forgot")}
                    target="_blank"
                    rel="noreferrer"
                    className="authLink"
                >
                    Forgot password?
                </a>

                {error && <p className="error-message">{error}</p>}

                <button className="authbutton" onClick={handleLogin} disabled={loading}>
                    {loading ? 'Logging in...' : 'Log in'}
                </button>
                <button
                    className="authbutton authbutton-secondary"
                    onClick={() => navigate('/create')}
                >
                    Create Account
                </button>
            </div>
        </div>
    );
}

export default Login;