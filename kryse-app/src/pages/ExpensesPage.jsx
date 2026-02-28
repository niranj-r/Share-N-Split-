import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeExpenses, subscribeBudgets, subscribeTrips, addExpense, updateExpense, deleteExpense, CATEGORIES, catClass, formatINR } from '../services';
import Modal from '../components/Modal';
import './PageShared.css';

const today = () => new Date().toISOString().split('T')[0];

export default function ExpensesPage() {
    const { currentUser } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [trips, setTrips] = useState([]);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: '', amount: '', category: 'Food', date: today(), budgetId: '', tripId: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [filterCat, setFilterCat] = useState('');
    const [filterTrip, setFilterTrip] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const uid = currentUser.uid;
        const u1 = subscribeExpenses(uid, setExpenses);
        const u2 = subscribeBudgets(uid, setBudgets);
        const u3 = subscribeTrips(uid, setTrips);
        return () => { u1(); u2(); u3(); };
    }, [currentUser]);

    function openNew() { setEditing(null); setForm({ title: '', amount: '', category: 'Food', date: today(), budgetId: '', tripId: '', notes: '' }); setModal(true); }
    function openEdit(e) { setEditing(e); setForm({ title: e.title, amount: e.amount, category: e.category, date: e.date, budgetId: e.budgetId || '', tripId: e.tripId || '', notes: e.notes || '' }); setModal(true); }

    async function handleSave(ev) {
        ev.preventDefault();
        setSaving(true);
        try {
            if (editing) await updateExpense(editing.id, form);
            else await addExpense(currentUser.uid, form, form.budgetId);
            setModal(false);
        } finally { setSaving(false); }
    }

    const filtered = expenses.filter(e => {
        if (filterCat && e.category !== filterCat) return false;
        if (filterTrip && e.tripId !== filterTrip) return false;
        if (search && !e.title?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="accent-line" />
                    <h1>Expenses</h1>
                    <p>Record and review all your transactions</p>
                </div>
                <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Add Expense</button>
            </div>

            {/* Filters */}
            <div className="card" style={{ padding: '16px 20px' }}>
                <div className="expense-filters">
                    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="input" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
                    </div>
                    <select className="select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                        <option value="">All Categories</option>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select className="select" value={filterTrip} onChange={e => setFilterTrip(e.target.value)}>
                        <option value="">All Trips</option>
                        {trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', color: '#ef4444' }}>
                        Total: {formatINR(total)}
                    </div>
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🧾</div>
                    <p>No expenses found. {!search && !filterCat && !filterTrip && 'Add your first expense!'}</p>
                    {!search && !filterCat && !filterTrip && <button className="btn btn-primary" onClick={openNew}>Add Expense</button>}
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Trip</th>
                                <th>Budget</th>
                                <th>Amount</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((e, i) => (
                                <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                                    <td>
                                        <div>{e.title}</div>
                                        {e.notes && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{e.notes}</div>}
                                    </td>
                                    <td><span className={`badge ${catClass(e.category)}`}>{e.category}</span></td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{e.date}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{trips.find(t => t.id === e.tripId)?.name || '—'}</td>
                                    <td style={{ fontSize: '0.82rem' }}>{budgets.find(b => b.id === e.budgetId)?.name || '—'}</td>
                                    <td className="exp-amount">{formatINR(e.amount)}</td>
                                    <td>
                                        <div className="exp-actions">
                                            <button className="btn-icon" onClick={() => openEdit(e)}><Pencil size={13} /></button>
                                            <button className="btn-icon" onClick={async () => { if (confirm('Delete expense?')) await deleteExpense(e.id); }}><Trash2 size={13} /></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
                <form onSubmit={handleSave} className="modal-form">
                    <div className="input-group">
                        <label>Title</label>
                        <input className="input" placeholder="e.g. Lunch at Cafe" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Amount (₹)</label>
                            <input className="input" type="number" placeholder="500" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                        </div>
                        <div className="input-group">
                            <label>Date</label>
                            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Category</label>
                        <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Link to Trip</label>
                            <select className="select" value={form.tripId} onChange={e => setForm(f => ({ ...f, tripId: e.target.value }))}>
                                <option value="">— None —</option>
                                {trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Link to Budget</label>
                            <select className="select" value={form.budgetId} onChange={e => setForm(f => ({ ...f, budgetId: e.target.value }))}>
                                <option value="">— None —</option>
                                {budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Notes</label>
                        <input className="input" placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Expense'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
