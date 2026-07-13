import './App.css';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Login from './Login.tsx';
import CreateAccount from './CreateAccount.tsx';
import ForgotPassword from './ForgotPassword.tsx';
import Menu from './Menu.tsx';

function Home() {
    return (
        <div className="splashBackground">
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 16,
                padding: 24,
                background: 'rgba(0,0,0,0.4)'
            }}>
                <h1 style={{
                    color: 'white',
                    fontSize: 22,
                    fontWeight: 700,
                    textAlign: 'center',
                    margin: 0,
                    textShadow: '0 0 20px rgba(0,200,150,0.8)'
                }}>
                    🥗 InfoDiet
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center' }}>
                    Your brain deserves a healthy diet
                </p>
                
                    href={chrome.runtime.getURL("index.html#/login")}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        color: '#00c896',
                        fontSize: 13,
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