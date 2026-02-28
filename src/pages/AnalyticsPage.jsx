import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { subscribeBudgets, subscribeExpenses, subscribeUserSharedExpenses, CATEGORIES, formatINR } from '../services';
import './PageShared.css';

const PIE_COLORS = ['#FF3300', '#818cf8', '#f97316', '#22d3ee', '#f472b6', '#94a3b8'];
const TIP_STYLE = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 };

export default function AnalyticsPage() {
    const { currentUser } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [sharedExpenses, setSharedExpenses] = useState([]);
    const [budgets, setBudgets] = useState([]);

    useEffect(() => {
        const uid = currentUser.uid;
        const u1 = subscribeExpenses(uid, setExpenses);
        const u2 = subscribeBudgets(uid, setBudgets);
        const u3 = subscribeUserSharedExpenses(currentUser.email, setSharedExpenses);
        return () => { u1(); u2(); u3(); };
    }, [currentUser]);

    const virtualSharedExpenses = sharedExpenses.map(se => ({
        id: `shared_${se.id}`,
        category: se.category || 'Others',
        amount: se.splitAmount || 0,
        date: se.date,
        budgetId: se.budgetId || ''
    }));

    const allExpenses = [...expenses, ...virtualSharedExpenses];

    const catData = CATEGORIES.map((cat, i) => ({
        name: cat,
        value: allExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0),
        color: PIE_COLORS[i],
    })).filter(d => d.value > 0);

    const monthlyData = (() => {
        const months = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
            const total = allExpenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + Number(e.amount || 0), 0);
            months.push({ name: label, amount: total });
        }
        return months;
    })();

    const budgetUtils = budgets.map(b => {
        const spent = allExpenses.filter(e => e.budgetId === b.id).reduce((s, e) => s + Number(e.amount || 0), 0);
        const pct = Number(b.totalAmount) > 0 ? Math.min(100, (spent / Number(b.totalAmount)) * 100) : 0;
        return { ...b, spent, pct };
    });

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="accent-line" />
                    <h1>Analytics</h1>
                    <p>Deep dive into your spending patterns</p>
                </div>
            </div>

            <div className="analytics-grid">
                {/* Category Pie */}
                <motion.div className="card chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <h4 style={{ marginBottom: 16 }}>Spending by Category</h4>
                    {catData.length === 0 ? <div className="chart-empty">No data yet</div> : (
                        <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                                        {catData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <Tooltip formatter={v => formatINR(v)} contentStyle={TIP_STYLE} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pie-legend">
                                {catData.map(d => (
                                    <div key={d.name} className="pie-legend-item">
                                        <span className="pie-legend-dot" style={{ background: d.color }} />
                                        <span>{d.name}: {formatINR(d.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Budget Utilization */}
                <motion.div className="card chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <h4 style={{ marginBottom: 16 }}>Budget Utilization</h4>
                    {budgetUtils.length === 0 ? <div className="chart-empty">No budgets yet</div> : (
                        <div className="util-row">
                            {budgetUtils.map(b => (
                                <div key={b.id} className="util-item">
                                    <div className="util-header">
                                        <span>{b.name}</span>
                                        <span style={{ color: b.pct >= 90 ? '#ef4444' : b.pct >= 60 ? '#f59e0b' : '#22c55e', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {Math.round(b.pct)}% used
                                        </span>
                                    </div>
                                    <div className="progress-bar-track">
                                        <div className="progress-bar-fill" style={{
                                            width: `${b.pct}%`,
                                            background: b.pct >= 90 ? '#ef4444' : b.pct >= 60 ? '#f59e0b' : '#22c55e',
                                        }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <span>Spent: {formatINR(b.spent)}</span>
                                        <span>Total: {formatINR(b.totalAmount)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Monthly Bar — full width */}
                <motion.div className="card chart-card analytics-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <h4 style={{ marginBottom: 16 }}>Monthly Spending (Last 12 months)</h4>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={monthlyData} barSize={24}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                            <Tooltip formatter={v => formatINR(v)} contentStyle={TIP_STYLE} cursor={{ fill: 'rgba(255,51,0,0.06)' }} />
                            <Bar dataKey="amount" fill="#FF3300" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Spending trend line — full width */}
                <motion.div className="card chart-card analytics-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h4 style={{ marginBottom: 16 }}>Spending Trend</h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                            <Tooltip formatter={v => formatINR(v)} contentStyle={TIP_STYLE} />
                            <Line type="monotone" dataKey="amount" stroke="#FF3300" strokeWidth={2.5} dot={{ fill: '#FF3300', r: 4 }} activeDot={{ r: 6, stroke: 'rgba(255,51,0,0.4)', strokeWidth: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>
        </div>
    );
}
