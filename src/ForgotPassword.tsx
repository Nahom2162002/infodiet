import { useState } from 'react';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter') action();
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('https://infodiet-web.vercel.app/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.message) {
                setMessage('Password reset email sent! Check your inbox.');
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

    return (
        <div className="forgot-background">
            <div className="login">
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: 36, margin: 0 }}>🥗</p>
                    <h1 style={{ color: 'white', fontSize: 20, fontWeight: 700, margin: '8px 0 4px' }}>
                        Reset Password
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                        Enter your email to receive a reset link
                    </p>
                </div>

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleForgotPassword)}
                    placeholder="Enter your email"
                />

                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                <button className="authbutton" onClick={handleForgotPassword} disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
            </div>
        </div>
    );
}

export default ForgotPassword;