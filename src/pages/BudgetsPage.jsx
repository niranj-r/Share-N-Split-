import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeBudgets, subscribeExpenses, subscribeUserSharedExpenses, addBudget, updateBudget, deleteBudget, formatINR } from '../services';
import BudgetRing from '../components/BudgetRing';
import Modal from '../components/Modal';
import './PageShared.css';

const today = () => new Date().toISOString().split('T')[0];

export default function BudgetsPage() {
    const { currentUser } = useAuth();
    const [budgets, setBudgets] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [sharedExpenses, setSharedExpenses] = useState([]);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', totalAmount: '', startDate: today(), endDate: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const u1 = subscribeBudgets(currentUser.uid, setBudgets);
        const u2 = subscribeExpenses(currentUser.uid, setExpenses);
        const u3 = subscribeUserSharedExpenses(currentUser.email, setSharedExpenses);
        return () => { u1(); u2(); u3(); };
    }, [currentUser]);

    function openNew() { setEditing(null); setForm({ name: '', totalAmount: '', startDate: today(), endDate: '' }); setModal(true); }
    function openEdit(b) { setEditing(b); setForm({ name: b.name, totalAmount: b.totalAmount, startDate: b.startDate, endDate: b.endDate }); setModal(true); }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) await updateBudget(editing.id, form);
            else await addBudget(currentUser.uid, form);
            setModal(false);
        } finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (confirm('Delete this budget?')) await deleteBudget(id);
    }

    const spentFor = (bId) => {
        // 1. Personal expenses
        const personal = expenses.filter(e => e.budgetId === bId).reduce((s, e) => s + Number(e.amount || 0), 0);

        // 2. Shared expenses where the user is the Payer
        const shared = sharedExpenses.filter(e => e.budgetId === bId && e.paidBy === currentUser.email).reduce((s, e) => {
            const split = e.splitAmount || 0;
            const paidBackBy = e.paidBackBy || [];

            // Total cost they paid initially
            let totalCostSpent = Number(e.amount || 0);

            // Subtract portions that other members have already paid back
            e.members.forEach(m => {
                if (m !== currentUser.email && paidBackBy.includes(m)) {
                    totalCostSpent -= split;
                }
            });

            return s + totalCostSpent;
        }, 0);

        return personal + shared;
    };

    // Calculate how much money is expected back for a specific budget
    const pendingPaybackFor = (bId) => {
        return sharedExpenses.filter(e => e.budgetId === bId && e.paidBy === currentUser.email).reduce((s, e) => {
            const split = e.splitAmount || 0;
            const paidBackBy = e.paidBackBy || [];

            let pending = 0;
            e.members.forEach(m => {
                if (m !== currentUser.email && !paidBackBy.includes(m)) {
                    pending += split;
                }
            });

            return s + pending;
        }, 0);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="accent-line" />
                    <h1>Budgets</h1>
                    <p>Pre-declare your budgets and track spending in real time</p>
                </div>
                <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> New Budget</button>
            </div>

            {budgets.length === 0 ? (
                <EmptyState message="No budgets yet. Create one to start tracking!" onAction={openNew} actionLabel="Create Budget" />
            ) : (
                <div className="budget-grid">
                    {budgets.map((b, i) => {
                        const spent = spentFor(b.id);
                        const pending = pendingPaybackFor(b.id);
                        const left = Number(b.totalAmount) - spent;
                        const pct = Math.min(100, (spent / Number(b.totalAmount)) * 100);
                        return (
                            <motion.div key={b.id} className={`card card-glow budget-card ${left < 0 ? 'budget-over' : ''}`}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            >
                                <div className="budget-card-top">
                                    <div>
                                        <h4>{b.name}</h4>
                                        <span className="date-range">{b.startDate} → {b.endDate || '—'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn-icon" onClick={() => openEdit(b)}><Pencil size={14} /></button>
                                        <button className="btn-icon" onClick={() => handleDelete(b.id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="budget-ring-center">
                                    <BudgetRing spent={spent} total={Number(b.totalAmount)} size={100} />
                                </div>
                                <div className="budget-nums">
                                    <div className="bnum"><span className="stat-label">Total</span><span className="bnum-val">{formatINR(b.totalAmount)}</span></div>
                                    <div className="bnum"><span className="stat-label">Spent</span><span className="bnum-val red">{formatINR(spent)}</span></div>
                                    <div className="bnum"><span className="stat-label">Left</span><span className={`bnum-val ${left < 0 ? 'red' : 'green'}`}>{formatINR(Math.abs(left))}{left < 0 ? ' over' : ''}</span></div>
                                </div>
                                {pending > 0 && (
                                    <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-secondary)', padding: '6px', borderRadius: 6 }}>
                                        To receive back: <strong style={{ color: 'var(--accent)' }}>{formatINR(pending)}</strong>
                                    </div>
                                )}
                                <div className="progress-bar-track">
                                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: left < 0 ? '#ef4444' : left / Number(b.totalAmount) < 0.2 ? '#f59e0b' : '#22c55e' }} />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Budget' : 'New Budget'}>
                <form onSubmit={handleSave} className="modal-form">
                    <div className="input-group">
                        <label>Budget Name</label>
                        <input className="input" placeholder="e.g. Goa Trip 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="input-group">
                        <label>Total Amount (₹)</label>
                        <input className="input" type="number" placeholder="50000" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} required />
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
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Budget'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function EmptyState({ message, onAction, actionLabel }) {
    return (
        <div className="empty-state">
            <div className="empty-icon">💰</div>
            <p>{message}</p>
            <button className="btn btn-primary" onClick={onAction}>{actionLabel}</button>
        </div>
    );
}
