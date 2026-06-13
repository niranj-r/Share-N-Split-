import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch {
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-bg-orb orb1" />
            <div className="auth-bg-orb orb2" />

            <motion.div
                className="auth-card glass"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Logo */}
                <motion.div
                    className="auth-logo"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: 'backOut' }}
                >
                    <ShareNSplitLogo />
                    <span className="auth-brand">ShareNSplit</span>
                </motion.div>

                <div className="auth-line" />
                <h2 className="auth-title">Welcome back</h2>
                <p className="auth-sub">Sign in to continue managing your finances</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label>Email</label>
                        <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/register" className="auth-link">Create one</Link>
                </p>
            </motion.div>
        </div>
    );
}

function ShareNSplitLogo({ size = 48 }) {
    return (
        <motion.img
            src="/DarkLogoSN.svg"
            alt="ShareNSplit Logo"
            width={size}
            height={(size / 151) * 200}
            animate={{ filter: ['drop-shadow(0 0 8px #FF3300)', 'drop-shadow(0 0 24px #FF3300)', 'drop-shadow(0 0 8px #FF3300)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ objectFit: 'contain' }}
        />
    );
}
