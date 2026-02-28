import { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Wallet, MapPin, Receipt, BarChart3,
    Users, Settings, Menu, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/budgets', icon: Wallet, label: 'Budgets' },
    { to: '/trips', icon: MapPin, label: 'Trips' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/groups', icon: Users, label: 'Groups' },
];

export default function Sidebar() {
    const { pathname } = useLocation();
    const { currentUser } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    const isSettingsActive = pathname.startsWith('/settings');

    return (
        <div className="desktop-only">
            <motion.aside
                className="sidebar glass"
                animate={{ width: collapsed ? 64 : 240 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
                {/* Logo row */}
                <div className="sidebar-logo">
                    <KryseLogo size={32} />
                    {!collapsed && (
                        <motion.span
                            className="sidebar-brand"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                        >
                            KRYSE
                        </motion.span>
                    )}
                    <button className="btn-icon sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}>
                        {collapsed ? <Menu size={16} /> : <X size={16} />}
                    </button>
                </div>

                {/* Nav items */}
                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => {
                        const active = pathname.startsWith(to);
                        return (
                            <Link key={to} to={to} className={`sidebar-item ${active ? 'active' : ''}`} title={collapsed ? label : ''}>
                                <Icon size={18} />
                                {!collapsed && <span className="sidebar-label">{label}</span>}
                                {active && <motion.div className="sidebar-active-dot" layoutId="activeDot" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-bottom-actions" style={{ padding: '0 10px 10px 10px' }}>
                    <Link to="/settings" className={`sidebar-item ${isSettingsActive ? 'active' : ''}`} title={collapsed ? 'Settings' : ''}>
                        <Settings size={18} />
                        {!collapsed && <span className="sidebar-label">Settings</span>}
                        {isSettingsActive && <motion.div className="sidebar-active-dot" layoutId="activeDot" />}
                    </Link>
                </div>

                {/* Footer */}
                <div className="sidebar-footer" style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    {!collapsed ? (
                        <div className="sidebar-user">
                            <div className="sidebar-avatar">{currentUser?.displayName?.[0] ?? 'U'}</div>
                            <div className="sidebar-user-info">
                                <span className="sidebar-user-name">{currentUser?.displayName}</span>
                                <span className="sidebar-user-email">{currentUser?.email}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="sidebar-avatar">{currentUser?.displayName?.[0] ?? 'U'}</div>
                    )}
                </div>
            </motion.aside>

            {/* Offset for content */}
            <div style={{ width: collapsed ? 64 : 240, flexShrink: 0, transition: 'width 0.25s' }} />
        </div>
    );
}

function KryseLogo({ size = 32 }) {
    return (
        <img
            src="/kryselogo.png"
            alt="KRYSE Logo"
            width={size}
            height={(size / 151) * 200} // Maintain roughly the aspect ratio of 151x200 
            style={{ objectFit: 'contain' }}
        />
    );
}
