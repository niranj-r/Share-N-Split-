import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, MapPin, Calendar, Plane } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeTrips, subscribeBudgets, subscribeExpenses, addTrip, updateTrip, deleteTrip, formatINR } from '../services';
import Modal from '../components/Modal';
import './PageShared.css';

const today = () => new Date().toISOString().split('T')[0];

export default function TripsPage() {
    const { currentUser } = useAuth();
    const [trips, setTrips] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', destination: '', startDate: today(), endDate: '', budgetId: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const uid = currentUser.uid;
        const u1 = subscribeTrips(uid, setTrips);
        const u2 = subscribeBudgets(uid, setBudgets);
        const u3 = subscribeExpenses(uid, setExpenses);
        return () => { u1(); u2(); u3(); };
    }, [currentUser]);

    function openNew() { setEditing(null); setForm({ name: '', destination: '', startDate: today(), endDate: '', budgetId: '' }); setModal(true); }
    function openEdit(t) { setEditing(t); setForm({ name: t.name, destination: t.destination, startDate: t.startDate, endDate: t.endDate, budgetId: t.budgetId || '' }); setModal(true); }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) await updateTrip(editing.id, form);
            else await addTrip(currentUser.uid, form);
            setModal(false);
        } finally { setSaving(false); }
    }

    const spentOnTrip = (tId) => expenses.filter(e => e.tripId === tId).reduce((s, e) => s + Number(e.amount || 0), 0);
    const linkedBudget = (bId) => budgets.find(b => b.id === bId);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="accent-line" />
                    <h1>Trips</h1>
                    <p>Plan your trips and link budgets for seamless tracking</p>
                </div>
                <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Plan a Trip</button>
            </div>

            {trips.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><Plane size={48} style={{ opacity: 0.5 }} /></div>
                    <p>No trips planned yet. Start your first adventure!</p>
                    <button className="btn btn-primary" onClick={openNew}>Plan a Trip</button>
                </div>
            ) : (
                <div className="trips-grid">
                    {trips.map((t, i) => {
                        const spent = spentOnTrip(t.id);
                        const budget = linkedBudget(t.budgetId);
                        const total = budget ? Number(budget.totalAmount) : 0;
                        const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;

                        return (
                            <motion.div key={t.id} className="card card-glow trip-card"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            >
                                <div className="budget-card-top">
                                    <div>
                                        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                                            <MapPin size={14} style={{ color: 'var(--accent)' }} />
                                            <h4>{t.name}</h4>
                                        </div>
                                        <div className="trip-meta">
                                            {t.destination && <span><MapPin size={10} style={{ display: 'inline', marginRight: 2 }} />{t.destination}</span>}
                                            <span><Calendar size={10} style={{ display: 'inline' }} /> {t.startDate} → {t.endDate || 'Open-ended'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn-icon" onClick={() => openEdit(t)}><Pencil size={14} /></button>
                                        <button className="btn-icon" onClick={async () => { if (confirm('Delete trip?')) await deleteTrip(t.id); }}><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                {budget ? (
                                    <div className="trip-budget-bar">
                                        <div>
                                            <div className="trip-budget-label">Linked Budget: {budget.name}</div>
                                            <div className="trip-budget-val">{formatINR(spent)} / {formatINR(total)}</div>
                                        </div>
                                        <span className={`badge ${pct >= 90 ? 'badge-danger' : pct >= 60 ? 'badge-warning' : 'badge-success'}`}>
                                            {Math.round(100 - pct)}% left
                                        </span>
                                    </div>
                                ) : (
                                    <div className="trip-budget-bar">
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No budget linked</span>
                                    </div>
                                )}

                                {total > 0 && (
                                    <div className="progress-bar-track">
                                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e' }} />
                                    </div>
                                )}

                                <div className="budget-nums">
                                    <div className="bnum"><span className="stat-label">Spent</span><span className="bnum-val red">{formatINR(spent)}</span></div>
                                    <div className="bnum"><span className="stat-label">Budget</span><span className="bnum-val">{total > 0 ? formatINR(total) : '—'}</span></div>
                                    <div className="bnum"><span className="stat-label">Left</span><span className={`bnum-val ${total > 0 && (total - spent) < 0 ? 'red' : 'green'}`}>{total > 0 ? formatINR(Math.abs(total - spent)) : '—'}</span></div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Trip' : 'Plan a Trip'}>
                <form onSubmit={handleSave} className="modal-form">
                    <div className="input-group">
                        <label>Trip Name</label>
                        <input className="input" placeholder="e.g. Goa Jan 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="input-group">
                        <label>Destination</label>
                        <input className="input" placeholder="e.g. Goa, India" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Start Date</label>
                            <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                        </div>
                        <div className="input-group">
                            <label>End Date</label>
                            <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Link a Budget (optional)</label>
                        <select className="select" value={form.budgetId} onChange={e => setForm(f => ({ ...f, budgetId: e.target.value }))}>
                            <option value="">— None —</option>
                            {budgets.map(b => <option key={b.id} value={b.id}>{b.name} ({formatINR(b.totalAmount)})</option>)}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Trip'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
