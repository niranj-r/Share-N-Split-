import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, LogOut, User, Mail, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

export default function SettingsPage({ theme, toggleTheme }) {
    const { currentUser, userProfile, logout } = useAuth();

    // Profile Edit State
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Sync initial state when profile loads
    useEffect(() => {
        if (userProfile?.name) setName(userProfile.name);
        else if (currentUser?.displayName) setName(currentUser.displayName);
    }, [userProfile, currentUser]);

    async function handleUpdateProfile(e) {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSaving(true);
        setMessage({ text: '', type: '' });

        try {
            // Update Auth Profile
            await updateProfile(currentUser, { displayName: name.trim() });

            // Update Firestore Profile
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { name: name.trim() });

            setMessage({ text: 'Profile updated successfully.', type: 'success' });
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Failed to update profile.', type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        }
    }

    return (
        <div className="container">
            <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1>Settings</h1>
                    <p>Manage your account preferences and profile details</p>
                </div>
            </header>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

                {/* Profile Section */}
                <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={20} className="text-accent" /> Profile
                    </h3>

                    <form onSubmit={handleUpdateProfile} className="flex-col gap-4">
                        <div className="input-group">
                            <label>Full Name</label>
                            <input
                                className="input"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Mail size={14} /> Email Address (Read-Only)
                            </label>
                            <input
                                className="input"
                                type="email"
                                value={currentUser?.email || ''}
                                disabled
                                style={{ pointerEvents: 'none' }}
                            />
                        </div>

                        {message.text && (
                            <div style={{
                                padding: '12px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.85rem',
                                background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
                            }}>
                                {message.text}
                            </div>
                        )}

                        <button className="btn btn-primary" type="submit" disabled={isSaving} style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                            {isSaving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </motion.div>

                {/* App Preferences */}
                <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {theme === 'dark' ? <Moon size={20} className="text-accent" /> : <Sun size={20} className="text-accent" />}
                        App Preferences
                    </h3>

                    <div className="flex justify-between items-center" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Appearance</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Toggle between light and dark mode</div>
                        </div>
                        <button className="btn btn-ghost btn-icon" onClick={toggleTheme} style={{ width: 40, height: 40, borderRadius: '50%' }}>
                            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                    </div>

                </motion.div>

                {/* Account Actions */}
                <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
                        <ShieldAlert size={20} /> Danger Zone
                    </h3>

                    <p style={{ marginBottom: '1.5rem' }}>
                        Signing out will end your current active session on this device.
                    </p>

                    <button className="btn btn-danger" onClick={logout}>
                        <LogOut size={16} /> Sign Out of ShareNSplit
                    </button>
                </motion.div>

            </div>
        </div>
    );
}
