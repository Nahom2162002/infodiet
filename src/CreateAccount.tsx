import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateAccount() {
    const [email, setEmail] = useState('');
    const [username, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmpassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreate = async () => {
        if (!email || !username || !password || !confirmpassword) {
            setError('Please fill in all fields');
            return;
        }
        if (password !== confirmpassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('https://infodiet-web.vercel.app/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            if (data.message) {
                alert('Account created! Please log in.');
                navigate('/login');
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

    const requirements = [
        { text: 'At least 8 characters', met: password.length >= 8 },
        { text: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
        { text: 'At least one lowercase letter', met: /[a-z]/.test(password) },
        { text: 'At least one number', met: /[0-9]/.test(password) },
        { text: 'At least one symbol', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
        { text: 'No more than 3 consecutive identical characters', met: !(/(.)\1{3,}/.test(password)) },
    ];

    return (
        <div className="create-background">
            <div className="login">
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: 36, margin: 0 }}>🥗</p>
                    <h1 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '8px 0 4px' }}>
                        Create Account
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                        Start your information diet today
                    </p>
                </div>

                <input
                    type="email"
                    value={email}
                    onKeyDown={(e) => handleKeyDown(e, handleCreate)}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                />
                <input
                    type="text"
                    value={username}
                    onKeyDown={(e) => handleKeyDown(e, handleCreate)}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Username"
                />
                <input
                    type="password"
                    value={password}
                    onKeyDown={(e) => handleKeyDown(e, handleCreate)}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                />

                {password && (
                    <div style={{ width: 220 }}>
                        {requirements.map((req, index) => (
                            <p key={index} style={{
                                color: req.met ? '#00c896' : '#ff6b6b',
                                fontSize: 11,
                                margin: '2px 0'
                            }}>
                                {req.met ? '✓' : '✗'} {req.text}
                            </p>
                        ))}
                    </div>
                )}

                <input
                    type="password"
                    value={confirmpassword}
                    onKeyDown={(e) => handleKeyDown(e, handleCreate)}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                />

                {error && <p className="error-message">{error}</p>}

                <button className="authbutton" onClick={handleCreate} disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                <button
                    className="authbutton"
                    onClick={() => navigate('/login')}
                    style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)' }}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}

export default CreateAccount;