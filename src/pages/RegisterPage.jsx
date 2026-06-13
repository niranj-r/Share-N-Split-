import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setLoading(true);
        try {
            await register(name, email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to create account.');
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
                <motion.div className="auth-logo"
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: 'backOut' }}
                >
                    <ShareNSplitLogo />
                    <span className="auth-brand">ShareNSplit</span>
                </motion.div>

                <div className="auth-line" />
                <h2 className="auth-title">Create account</h2>
                <p className="auth-sub">Start your financial journey with ShareNSplit</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label>Full Name</label>
                        <input className="input" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Email</label>
                        <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input className="input" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </motion.div>
        </div>
    );
}

function ShareNSplitLogo({ size = 48 }) {
    return (
        <motion.img
            src="/sharensplitlogo.svg"
            alt="ShareNSplit Logo"
            width={size}
            height={(size / 151) * 200}
            animate={{ filter: ['drop-shadow(0 0 8px #FF3300)', 'drop-shadow(0 0 24px #FF3300)', 'drop-shadow(0 0 8px #FF3300)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ objectFit: 'contain' }}
        />
    );
}
