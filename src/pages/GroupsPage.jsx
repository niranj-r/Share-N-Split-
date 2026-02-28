import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Users, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeGroups, subscribeSharedExpenses, addGroup, deleteGroup, addSharedExpense, formatINR } from '../services';
import Modal from '../components/Modal';
import './PageShared.css';

const today = () => new Date().toISOString().split('T')[0];

export default function GroupsPage() {
    const { currentUser } = useAuth();
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [sharedExpenses, setSharedExpenses] = useState([]);
    const [groupModal, setGroupModal] = useState(false);
    const [expModal, setExpModal] = useState(false);
    const [groupForm, setGroupForm] = useState({ name: '', description: '', members: '' });
    const [expForm, setExpForm] = useState({ description: '', amount: '', paidBy: currentUser.email, date: today() });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const u1 = subscribeGroups(currentUser.uid, (gs) => {
            setGroups(gs);
            if (gs.length > 0 && !selectedGroup) setSelectedGroup(gs[0]);
        });
        return u1;
    }, [currentUser]);

    useEffect(() => {
        if (!selectedGroup) return;
        const u = subscribeSharedExpenses(selectedGroup.id, setSharedExpenses);
        return u;
    }, [selectedGroup]);

    async function handleCreateGroup(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const members = groupForm.members.split(',').map(m => m.trim()).filter(Boolean);
            await addGroup(currentUser.uid, { name: groupForm.name, description: groupForm.description, members: [currentUser.email, ...members] });
            setGroupModal(false);
            setGroupForm({ name: '', description: '', members: '' });
        } finally { setSaving(false); }
    }

    async function handleAddSharedExpense(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const group = selectedGroup;
            const members = group.members || [currentUser.email];
            const splitAmount = (Number(expForm.amount) / members.length).toFixed(2);
            await addSharedExpense({
                groupId: group.id,
                description: expForm.description,
                amount: Number(expForm.amount),
                paidBy: expForm.paidBy,
                date: expForm.date,
                splitAmount: Number(splitAmount),
                members,
            });
            setExpModal(false);
            setExpForm({ description: '', amount: '', paidBy: currentUser.email, date: today() });
        } finally { setSaving(false); }
    }

    // "Who owes who" — simple calculation
    function calcOwings(expenses, members) {
        const balances = {};
        members.forEach(m => (balances[m] = 0));

        expenses.forEach(exp => {
            const payer = exp.paidBy;
            const split = exp.splitAmount || 0;
            exp.members?.forEach(m => {
                if (m !== payer) {
                    balances[m] = (balances[m] || 0) - split;
                    balances[payer] = (balances[payer] || 0) + split;
                }
            });
        });
        return balances;
    }

    const members = selectedGroup?.members || [];
    const owings = selectedGroup ? calcOwings(sharedExpenses, members) : {};

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="accent-line" />
                    <h1>Groups</h1>
                    <p>Split expenses with friends and track who owes who</p>
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
                    {/* Group List */}
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

                    {/* Group Detail */}
                    {selectedGroup && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="card">
                                <div className="section-header" style={{ marginBottom: 12 }}>
                                    <h4>💸 Shared Expenses — {selectedGroup.name}</h4>
                                    <button className="btn btn-primary btn-sm" onClick={() => setExpModal(true)}><Plus size={14} /> Add</button>
                                </div>
                                {sharedExpenses.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '20px 0' }}>No shared expenses yet.</div>
                                ) : (
                                    sharedExpenses.map(exp => (
                                        <div key={exp.id} className="split-row">
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{exp.description}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid by {exp.paidBy} · {exp.date}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700 }}>{formatINR(exp.amount)}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatINR(exp.splitAmount)} / person</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Who owes who */}
                            <div className="card">
                                <h4 style={{ marginBottom: 12 }}>🔄 Settlement Summary</h4>
                                {members.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No members.</div>
                                ) : (
                                    members.map(m => {
                                        const bal = owings[m] || 0;
                                        return (
                                            <div key={m} className="split-row">
                                                <span style={{ fontSize: '0.88rem' }}>{m}</span>
                                                <span className={`owes-chip ${bal >= 0 ? 'owes-pos' : 'owes-neg'}`}>
                                                    {bal >= 0 ? `gets back ${formatINR(bal)}` : `owes ${formatINR(Math.abs(bal))}`}
                                                </span>
                                            </div>
                                        );
                                    })
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

            {/* Add Shared Expense Modal */}
            <Modal isOpen={expModal} onClose={() => setExpModal(false)} title="Add Shared Expense">
                <form onSubmit={handleAddSharedExpense} className="modal-form">
                    <div className="input-group">
                        <label>Description</label>
                        <input className="input" placeholder="e.g. Hotel booking" value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} required />
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Total Amount (₹)</label>
                            <input className="input" type="number" placeholder="2000" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} required />
                        </div>
                        <div className="input-group">
                            <label>Date</label>
                            <input className="input" type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Paid By</label>
                        <select className="input" value={expForm.paidBy} onChange={e => setExpForm(f => ({ ...f, paidBy: e.target.value }))} required>
                            {selectedGroup?.members?.map(m => (
                                <option key={m} value={m}>{m === currentUser.email ? `${m} (You)` : m}</option>
                            )) || <option value={currentUser.email}>{currentUser.email} (You)</option>}
                        </select>
                    </div>
                    {selectedGroup && (
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Split among {(selectedGroup?.members || []).length} members → {expForm.amount ? formatINR(Number(expForm.amount) / (selectedGroup?.members?.length || 1)) : '—'} / person
                        </div>
                    )}
                    <div className="modal-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => setExpModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Expense'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
