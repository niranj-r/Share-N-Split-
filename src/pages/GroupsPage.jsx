import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Users, ChevronRight, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeGroups, subscribeSharedExpenses, subscribeBudgets, addGroup, deleteGroup, addSharedExpense, updateSharedExpense, deleteSharedExpense, formatINR } from '../services';
import { calculateSplits, optimizeSettlements } from '../utils/splitUtils';
import Modal from '../components/Modal';
import './PageShared.css';

const today = () => new Date().toISOString().split('T')[0];

const INITIAL_EXP_FORM = {
    description: '',
    amount: '',
    date: today(),
    budgetId: '',
    splitType: 'EQUAL',
    payers: {}, // email -> amount
    splitData: { percentages: {}, shares: {}, exactAmounts: {} }
};

export default function GroupsPage() {
    const { currentUser } = useAuth();
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [sharedExpenses, setSharedExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [groupModal, setGroupModal] = useState(false);
    const [expModal, setExpModal] = useState(false);
    const [editingExp, setEditingExp] = useState(null);
    const [settleModal, setSettleModal] = useState(null);
    const [groupForm, setGroupForm] = useState({ name: '', description: '', members: '' });
    const [expForm, setExpForm] = useState({ ...INITIAL_EXP_FORM, payers: { [currentUser?.email || '']: '' } });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const u1 = subscribeGroups(currentUser?.email, (gs) => {
            setGroups(gs);
            if (gs.length > 0 && !selectedGroup) setSelectedGroup(gs[0]);
        });
        const u2 = subscribeBudgets(currentUser.uid, setBudgets);
        return () => { u1(); u2(); };
    }, [currentUser]);

    useEffect(() => {
        if (!selectedGroup) return;
        const u = subscribeSharedExpenses(selectedGroup.id, setSharedExpenses);
        return u;
    }, [selectedGroup]);

    const members = selectedGroup?.members || [];

    async function handleCreateGroup(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const parsedMembers = groupForm.members.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
            const allMembers = Array.from(new Set([currentUser.email, ...parsedMembers]));
            await addGroup(currentUser.uid, { name: groupForm.name, description: groupForm.description, members: allMembers });
            setGroupModal(false);
            setGroupForm({ name: '', description: '', members: '' });
        } finally { setSaving(false); }
    }

    async function handleAddSharedExpense(e) {
        e.preventDefault();
        const totalAmount = Number(expForm.amount);
        if (totalAmount <= 0) return alert('Enter a valid amount');

        // Validate Payers match total
        const totalPaid = Object.values(expForm.payers).reduce((s, a) => s + Number(a || 0), 0);
        if (Math.abs(totalPaid - totalAmount) > 0.02) {
            return alert(`Total paid (${totalPaid}) must equal the expense amount (${totalAmount})`);
        }

        // Calculate and validate splits
        const splits = calculateSplits(totalAmount, expForm.splitType, members, expForm.splitData);
        const totalSplit = Object.values(splits).reduce((s, a) => s + Number(a || 0), 0);
        if (expForm.splitType === 'CUSTOM' || expForm.splitType === 'PERCENTAGE') {
            if (Math.abs(totalSplit - totalAmount) > 0.1) {
                return alert(`The customized splits do not add up perfectly. Check your math!`);
            }
        }

        setSaving(true);
        try {
            const payload = {
                groupId: selectedGroup.id,
                description: expForm.description,
                amount: totalAmount,
                date: expForm.date,
                budgetId: expForm.budgetId || null,
                splitType: expForm.splitType,
                payers: expForm.payers,
                splits: splits,
                participants: members,
                members // For easy firestore querying based on members array
            };

            if (editingExp) await updateSharedExpense(editingExp.id, payload);
            else await addSharedExpense(payload);

            setExpModal(false);
            setEditingExp(null);
            setExpForm({ ...INITIAL_EXP_FORM, payers: { [currentUser.email]: '' } });
        } finally { setSaving(false); }
    }

    async function handleDeleteSharedExpense(id) {
        if (confirm('Delete this shared expense?')) await deleteSharedExpense(id);
    }

    async function handleSettleUp() {
        if (!settleModal) return;
        setSaving(true);
        try {
            const payload = {
                groupId: selectedGroup.id,
                description: `Payment`,
                amount: settleModal.amount,
                date: new Date().toISOString().split('T')[0],
                budgetId: null,
                splitType: 'CUSTOM',
                payers: { [settleModal.from]: settleModal.amount },
                splits: { [settleModal.to]: settleModal.amount },
                participants: members,
                members,
                isSettlement: true
            };
            await addSharedExpense(payload);
            setSettleModal(null);
        } catch (error) {
            console.error('Error settling up:', error);
            alert('Failed to settle up.');
        } finally {
            setSaving(false);
        }
    }

    function openExpModal(exp = null) {
        if (exp) {
            setEditingExp(exp);
            setExpForm({
                description: exp.description,
                amount: exp.amount,
                date: exp.date,
                budgetId: exp.budgetId || '',
                splitType: exp.splitType || 'EQUAL',
                payers: exp.payers || { [exp.paidBy || currentUser.email]: exp.amount },
                splitData: { percentages: {}, shares: {}, exactAmounts: {}, ...exp.splitData }
            });
        } else {
            setEditingExp(null);
            setExpForm({ ...INITIAL_EXP_FORM, payers: { [currentUser.email]: '' } });
        }
        setExpModal(true);
    }

    // Settlements optimization
    const { balances, settlements } = selectedGroup ? optimizeSettlements(sharedExpenses, members) : { balances: {}, settlements: [] };

    // Form Event Handlers inside Modal
    const handlePayerChange = (email, overrideValue) => {
        setExpForm(f => ({ ...f, payers: { ...f.payers, [email]: overrideValue } }));
    };

    const handleSplitDataChange = (dataset, email, value) => {
        setExpForm(f => ({
            ...f,
            splitData: { ...f.splitData, [dataset]: { ...f.splitData[dataset], [email]: value } }
        }));
    };

    const currentSplitsPreview = calculateSplits(Number(expForm.amount || 0), expForm.splitType, members, expForm.splitData);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="accent-line" />
                    <h1>Groups</h1>
                    <p>Split expenses accurately with optimized settlements</p>
                </div>
                <button className="btn btn-primary" onClick={() => setGroupModal(true)}><Plus size={16} /> New Group</button>
            </div>

            {groups.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <p>No groups yet. Create one to start splitting expenses!</p>
                    <button className="btn btn-primary" onClick={() => setGroupModal(true)}>Create Group</button>
                </div>
            ) : (
                <div className="groups-layout">
                    {/* Left: Group List */}
                    <div className="card" style={{ padding: 16 }}>
                        <h4 style={{ marginBottom: 12 }}>Your Groups</h4>
                        <div className="group-list">
                            {groups.map(g => (
                                <div key={g.id}
                                    className={`group-item ${selectedGroup?.id === g.id ? 'active' : ''}`}
                                    onClick={() => setSelectedGroup(g)}
                                >
                                    <div>
                                        <div className="group-name">{g.name}</div>
                                        <div className="group-sub">{(g.members || []).length} members</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                                        <button className="btn-icon" onClick={async (e) => { e.stopPropagation(); if (confirm('Delete group?')) await deleteGroup(g.id); }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Group Detail */}
                    {selectedGroup && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="card">
                                <div className="section-header" style={{ marginBottom: 12 }}>
                                    <h4>💸 Shared Expenses — {selectedGroup.name}</h4>
                                    <button className="btn btn-primary btn-sm" onClick={() => openExpModal()}><Plus size={14} /> Add</button>
                                </div>
                                {sharedExpenses.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '20px 0' }}>No shared expenses yet.</div>
                                ) : (
                                    sharedExpenses.map(exp => {
                                        const myShare = exp.splits?.[currentUser.email] || 0;
                                        const payersList = Object.keys(exp.payers || {}).map(p => p.split('@')[0]).join(', ');

                                        return (
                                            <div key={exp.id} className="split-row" style={exp.isSettlement ? { borderLeft: '4px solid #22c55e', background: 'rgba(34, 197, 94, 0.05)' } : {}}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                        {exp.isSettlement ? `💸 Payment: ${Object.keys(exp.payers || {})[0]?.split('@')[0]} ➔ ${Object.keys(exp.splits || {})[0]?.split('@')[0]}` : exp.description}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {exp.isSettlement ? '' : `Paid by ${payersList} · `}{exp.date}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700, color: exp.isSettlement ? '#22c55e' : 'inherit' }}>{formatINR(exp.amount)}</div>
                                                    {!exp.isSettlement && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>You owe {formatINR(myShare)}</div>}
                                                    <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                                                        {!exp.isSettlement && <button className="btn-icon" onClick={() => openExpModal(exp)} style={{ padding: 4 }}><Pencil size={12} /></button>}
                                                        <button className="btn-icon" onClick={() => handleDeleteSharedExpense(exp.id)} style={{ padding: 4 }}><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Settlements view */}
                            <div className="card">
                                <h4 style={{ marginBottom: 16 }}>🔄 Settlement Summary</h4>
                                {settlements.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Everyone is fully settled up! 🎉</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {settlements.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <div className="flex items-center gap-2">
                                                    <span style={{ fontWeight: 600, color: s.from === currentUser.email ? '#ef4444' : 'inherit' }}>{s.from === currentUser.email ? 'You' : s.from.split('@')[0]}</span>
                                                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                                                    <span style={{ fontWeight: 600, color: s.to === currentUser.email ? '#22c55e' : 'inherit' }}>{s.to === currentUser.email ? 'You' : s.to.split('@')[0]}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div style={{ fontWeight: 700, color: s.to === currentUser.email ? '#22c55e' : (s.from === currentUser.email ? '#ef4444' : 'var(--text)') }}>
                                                        {formatINR(s.amount)}
                                                    </div>
                                                    {(s.from === currentUser.email || s.to === currentUser.email) && (
                                                        <button 
                                                            className="btn btn-primary btn-sm" 
                                                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                                                            onClick={() => setSettleModal(s)}
                                                        >
                                                            Mark Paid
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Group Modal */}
            <Modal isOpen={groupModal} onClose={() => setGroupModal(false)} title="Create Group">
                <form onSubmit={handleCreateGroup} className="modal-form">
                    <div className="input-group">
                        <label>Group Name</label>
                        <input className="input" placeholder="e.g. Goa Trip Squad" value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="input-group">
                        <label>Member Emails (comma-separated)</label>
                        <input className="input" placeholder="friend@email.com, another@email.com" value={groupForm.members} onChange={e => setGroupForm(f => ({ ...f, members: e.target.value }))} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setGroupModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Group'}</button>
                    </div>
                </form>
            </Modal>

            {/* Settle Up Confirmation Modal */}
            <Modal isOpen={!!settleModal} onClose={() => setSettleModal(null)} title="Confirm Payment" style={{ maxWidth: '400px' }}>
                {settleModal && (
                    <div className="modal-form">
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                            Record a payment of <strong style={{ color: 'var(--text)' }}>{formatINR(settleModal.amount)}</strong> from <strong style={{ color: 'var(--text)' }}>{settleModal.from === currentUser.email ? 'You' : settleModal.from.split('@')[0]}</strong> to <strong style={{ color: 'var(--text)' }}>{settleModal.to === currentUser.email ? 'You' : settleModal.to.split('@')[0]}</strong>?
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-ghost" onClick={() => setSettleModal(null)}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleSettleUp} disabled={saving}>
                                {saving ? 'Recording...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Advanced Shared Expense Modal */}
            <Modal isOpen={expModal} onClose={() => setExpModal(false)} title={editingExp ? "Edit Shared Expense" : "Add Shared Expense"} style={{ maxWidth: '500px' }}>
                <form onSubmit={handleAddSharedExpense} className="modal-form" style={{ gap: '20px' }}>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Description</label>
                            <input className="input" placeholder="e.g. Hotel booking" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} required />
                        </div>
                        <div className="input-group">
                            <label>Total Amount (₹)</label>
                            <input className="input" type="number" step="any" placeholder="2000" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} required />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="input-group">
                            <label>Date</label>
                            <input className="input" type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                        <div className="input-group">
                            <label>Budget (Optional)</label>
                            <select className="input" value={expForm.budgetId} onChange={e => setExpForm(f => ({ ...f, budgetId: e.target.value }))}>
                                <option value="">None</option>
                                {budgets.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Payers Section */}
                    <div className="input-group">
                        <label style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 6 }}>Who Paid? (Enter amounts if multiple)</label>
                        {members.map(m => (
                            <div key={`paid_${m}`} className="flex justify-between items-center gap-3 mb-2">
                                <span style={{ fontSize: '0.85rem' }}>{m === currentUser.email ? 'You' : m.split('@')[0]}</span>
                                <input type="number" step="any" className="input" style={{ width: '120px', padding: '6px 10px', fontSize: '0.85rem' }}
                                    placeholder="0" value={expForm.payers[m] || ''}
                                    onChange={e => handlePayerChange(m, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Split Type Toggle */}
                    <div className="input-group">
                        <label style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 6 }}>Split Method</label>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                            {['EQUAL', 'CUSTOM', 'PERCENTAGE', 'SHARES'].map(t => (
                                <button key={t} type="button"
                                    className={`btn btn-sm ${expForm.splitType === t ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setExpForm(f => ({ ...f, splitType: t }))}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Split Inputs */}
                    <div className="input-group" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div className="flex justify-between" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                            <span>Member</span>
                            <span>{expForm.splitType === 'EQUAL' ? 'Amount Owed' : (expForm.splitType === 'CUSTOM' ? 'Exact Amount' : (expForm.splitType === 'PERCENTAGE' ? 'Percentage %' : 'Shares'))}</span>
                        </div>

                        {members.map(m => (
                            <div key={`split_${m}`} className="flex justify-between items-center gap-3 mb-2">
                                <span style={{ fontSize: '0.85rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m === currentUser.email ? 'You' : m.split('@')[0]}</span>

                                {expForm.splitType === 'EQUAL' && (
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatINR(currentSplitsPreview[m] || 0)}</span>
                                )}

                                {expForm.splitType === 'CUSTOM' && (
                                    <input type="number" step="any" className="input" style={{ width: '100px', padding: '6px 10px', fontSize: '0.85rem' }}
                                        placeholder="0" value={expForm.splitData.exactAmounts[m] || ''}
                                        onChange={e => handleSplitDataChange('exactAmounts', m, e.target.value)}
                                    />
                                )}

                                {expForm.splitType === 'PERCENTAGE' && (
                                    <input type="number" step="any" className="input" style={{ width: '80px', padding: '6px 10px', fontSize: '0.85rem' }}
                                        placeholder="0%" value={expForm.splitData.percentages[m] || ''}
                                        onChange={e => handleSplitDataChange('percentages', m, e.target.value)}
                                    />
                                )}

                                {expForm.splitType === 'SHARES' && (
                                    <input type="number" step="any" className="input" style={{ width: '80px', padding: '6px 10px', fontSize: '0.85rem' }}
                                        placeholder="1" value={expForm.splitData.shares[m] || ''}
                                        onChange={e => handleSplitDataChange('shares', m, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setExpModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editingExp ? 'Save Changes' : 'Add Expense')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
