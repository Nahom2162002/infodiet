import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Login from './Login.tsx';
import CreateAccount from './CreateAccount.tsx';
import ForgotPassword from './ForgotPassword.tsx';
import Menu from './Menu.tsx';
import './App.css';

// Only the "/" route is ever shown inside the extension's actual popup window;
// every other route is opened in a full browser tab, so size the <html> element accordingly.
function PopupSizeManager() {
    const location = useLocation();

    useEffect(() => {
        document.documentElement.classList.toggle('is-popup', location.pathname === '/');
    }, [location.pathname]);

    return null;
}

function Home() {
    return (
        <div className="splashBackground" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 18,
                padding: 24,
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    filter: 'drop-shadow(0 0 18px oklch(0.75 0.15 155 / 0.45))'
                }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'conic-gradient(oklch(0.75 0.15 155) 0deg 250deg, oklch(0.3 0.02 160) 250deg 360deg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'oklch(0.14 0.015 160)' }} />
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'oklch(0.95 0.01 160)' }}>InfoDiet</div>
                </div>
                <p style={{ color: 'oklch(0.65 0.02 160)', fontSize: 16, margin: 0 }}>
                    Your brain deserves a healthy diet
                </p>
                <a
                    href={chrome.runtime.getURL("index.html#/login")}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        color: 'oklch(0.75 0.15 155)',
                        fontSize: 15,
                        fontWeight: 600,
                        textDecoration: 'underline'
                    }}
                >
                    Click here to get started
                </a>
            </div>
        </div>
    );
}

function App() {
    return (
        <HashRouter>
            <PopupSizeManager />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/create" element={<CreateAccount />} />
                <Route path="/forgot" element={<ForgotPassword />} />
            </Routes>
        </HashRouter>
    );
}

export default App;