import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Wallet, MapPin, Receipt, BarChart3, Users } from 'lucide-react';
import './MobileNav.css';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dash' },
    { to: '/budgets', icon: Wallet, label: 'Budgets' },
    { to: '/groups', icon: Users, label: 'Groups' },
    { to: '/trips', icon: MapPin, label: 'Trips' }
];

export default function MobileNav() {
    const { pathname } = useLocation();

    return (
        <nav className="mobile-nav glass">
            {navItems.map(({ to, icon: Icon, label }) => {
                const active = pathname.startsWith(to);
                return (
                    <Link key={to} to={to} className={`mobile-nav-item ${active ? 'active' : ''}`}>
                        <div className="mobile-nav-icon-wrapper">
                            <Icon size={active ? 18 : 22} strokeWidth={active ? 2.5 : 2} />
                        </div>
                        <AnimatePresence>
                            {active && (
                                <motion.span
                                    className="mobile-nav-label"
                                    initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                                    exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                                >
                                    {label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Link>
                );
            })}
        </nav>
    );
}
