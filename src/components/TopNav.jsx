import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './TopNav.css';

function ShareNSplitLogo({ size = 28 }) {
    return (
        <img
            src="/DarkLogoSN.svg"
            alt="ShareNSplit Logo"
            width={size}
            height={(size / 151) * 200}
            style={{ objectFit: 'contain' }}
        />
    );
}

export default function TopNav() {
    const { currentUser } = useAuth();
    const { pathname } = useLocation();
    const isSettingsActive = pathname.startsWith('/settings');

    return (
        <header className="top-nav glass">
            <div className="top-nav-brand">
                <ShareNSplitLogo size={24} />
                <span className="top-nav-title">ShareNSplit</span>
            </div>

            <div className="top-nav-actions">
                <Link to="/settings" className={`top-nav-btn ${isSettingsActive ? 'active' : ''}`}>
                    <Settings size={20} />
                </Link>
                <div className="top-nav-avatar">
                    {currentUser?.displayName?.[0] ?? 'U'}
                </div>
            </div>
        </header>
    );
}
