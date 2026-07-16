import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
            const response = await fetch('https://www.getinfodiet.app/api/auth/forgot-password', {
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
                <div className="authLogo"><div className="authLogo-dot" /></div>
                <h1 className="authTitle">Reset Password</h1>
                <p className="authSubtitle">Enter your email to receive a reset link</p>

                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleForgotPassword)}
                    placeholder="Enter your email"
                    style={{ marginBottom: 14 }}
                />

                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                <button className="authbutton" onClick={handleForgotPassword} disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
                <button
                    className="authbutton authbutton-secondary"
                    onClick={() => navigate('/login')}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}

export default ForgotPassword;