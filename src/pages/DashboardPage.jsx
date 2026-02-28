import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Wallet, MapPin, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { subscribeBudgets, subscribeExpenses, subscribeTrips, subscribeUserSharedExpenses, formatINR, catClass, CATEGORIES } from '../services';
import BudgetRing from '../components/BudgetRing';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const PIE_COLORS = ['#FF3300', '#818cf8', '#f97316', '#22d3ee', '#f472b6', '#94a3b8'];

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay },
});

export default function DashboardPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [budgets, setBudgets] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [sharedExpenses, setSharedExpenses] = useState([]);
    const [trips, setTrips] = useState([]);

    useEffect(() => {
        const uid = currentUser.uid;
        const u1 = subscribeBudgets(uid, setBudgets);
        const u2 = subscribeExpenses(uid, setExpenses);
        const u3 = subscribeTrips(uid, setTrips);
        const u4 = subscribeUserSharedExpenses(currentUser.email, setSharedExpenses);
        return () => { u1(); u2(); u3(); u4(); };
    }, [currentUser]);

    const virtualSharedExpenses = sharedExpenses.map(se => ({
        id: `shared_${se.id}`,
        title: `[Shared] ${se.title}`,
        category: se.category || 'Others',
        amount: se.splitAmount || 0,
        date: se.date,
        budgetId: se.budgetId || '',
        isShared: true
    }));

    const allExpenses = [...expenses, ...virtualSharedExpenses].sort((a, b) => {
        return (b.date || '').localeCompare(a.date || '');
    });

    const totalBudget = budgets.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const totalSpent = allExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalLeft = totalBudget - totalSpent;

    // Category pie data
    const catData = CATEGORIES.map(cat => ({
        name: cat,
        value: allExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0),
    })).filter(d => d.value > 0);

    // Monthly bar data (last 6 months)
    const monthlyData = (() => {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('en-IN', { month: 'short' });
            const total = allExpenses
                .filter(e => e.date?.startsWith(key))
                .reduce((s, e) => s + Number(e.amount || 0), 0);
            months.push({ name: label, amount: total });
        }
        return months;
    })();

    const recentExpenses = allExpenses.slice(0, 6);

    return (
        <div className="dashboard-page">
            {/* Header */}
            <motion.div {...fadeUp(0)} className="dashboard-header">
                <div>
                    <div className="accent-line" />
                    <h1>Dashboard</h1>
                    <p>Good {getGreeting()}, {currentUser.displayName?.split(' ')[0]} 👋</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/budgets')}>
                        <Wallet size={15} /> New Budget
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/expenses')}>
                        <Plus size={15} /> Add Expense
                    </button>
                </div>
            </motion.div>

            {/* Bento Grid */}
            <div className="bento-grid">

                {/* 1. Total Budget (Glowing Card) - Span 1 */}
                <motion.div {...fadeUp(0.05)} className="bento-card bento-glow-card bento-span-1">
                    <div className="stat-card-inner">
                        <div className="stat-icon-wrapper">
                            <Wallet size={24} />
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                            <div className="stat-label">Total Budget</div>
                            <div className="stat-value">{formatINR(totalBudget)}</div>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Total Spent - Span 1 */}
                <motion.div {...fadeUp(0.1)} className="bento-card bento-span-1">
                    <div className="stat-card-inner">
                        <div className="stat-icon-wrapper" style={{ color: '#ef4444' }}>
                            <TrendingDown size={24} />
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                            <div className="stat-label">Total Spent</div>
                            <div className="stat-value">{formatINR(totalSpent)}</div>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Money Left - Span 1 */}
                <motion.div {...fadeUp(0.15)} className="bento-card bento-span-1">
                    <div className="stat-card-inner">
                        <div className="stat-icon-wrapper" style={{ color: totalLeft >= 0 ? '#22c55e' : '#ef4444' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                            <div className="stat-label">Money Left</div>
                            <div className="stat-value" style={{ color: totalLeft < 0 ? '#ef4444' : 'var(--success)' }}>
                                {formatINR(Math.abs(totalLeft))}
                                {totalLeft < 0 && <span style={{ fontSize: '0.9rem', color: '#ef4444' }}> over</span>}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4. Active Trips - Span 1 */}
                <motion.div {...fadeUp(0.2)} className="bento-card bento-span-1">
                    <div className="stat-card-inner">
                        <div className="stat-icon-wrapper" style={{ color: '#818cf8' }}>
                            <MapPin size={24} />
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                            <div className="stat-label">Active Trips</div>
                            <div className="stat-value">{trips.length}</div>
                        </div>
                    </div>
                </motion.div>

                {/* 5. Budget Rings Row - Span 2 */}
                <motion.div {...fadeUp(0.25)} className="bento-card bento-span-2">
                    <h4 style={{ marginBottom: 16 }}>Budget Overview</h4>
                    {budgets.length === 0 ? (
                        <div className="chart-empty">No budgets created yet.</div>
                    ) : (
                        <div className="budget-rings-row">
                            {budgets.slice(0, 5).map(b => {
                                const spent = allExpenses
                                    .filter(e => e.budgetId === b.id)
                                    .reduce((s, e) => s + Number(e.amount || 0), 0);
                                return (
                                    <div key={b.id} className="budget-ring-item">
                                        <BudgetRing spent={spent} total={Number(b.totalAmount)} size={90} label={b.name} />
                                        <div style={{ textAlign: 'center', marginTop: 4 }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {formatINR(Number(b.totalAmount) - spent)} left
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* 6. Recent Expenses - Span 2, Row 2 (Taller) */}
                <motion.div {...fadeUp(0.3)} className="bento-card bento-span-2 bento-row-2">
                    <div className="section-header">
                        <h4>Recent Expenses</h4>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>View all</button>
                    </div>
                    {recentExpenses.length === 0 ? (
                        <div className="chart-empty">
                            No expenses added yet.
                            <button className="auth-link" style={{ color: 'var(--accent)', fontSize: '0.88rem', background: 'none', border: 'none', cursor: 'pointer', display: 'block', margin: '8px auto' }} onClick={() => navigate('/expenses')}>Add one</button>
                        </div>
                    ) : (
                        <div className="recent-list">
                            {recentExpenses.map(exp => (
                                <div key={exp.id} className="recent-item">
                                    <div className="flex items-center gap-3">
                                        <span className={`badge ${catClass(exp.category)}`}>{exp.category}</span>
                                        <span className="recent-title">{exp.title}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="recent-date">{exp.date}</span>
                                        <span className="recent-amount">-{formatINR(exp.amount)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* 7. Category Pie Chart - Span 1, Row 1 */}
                <motion.div {...fadeUp(0.35)} className="bento-card bento-span-1">
                    <h4 style={{ marginBottom: 12 }}>Categorization</h4>
                    {catData.length === 0 ? (
                        <div className="chart-empty">No expense data yet</div>
                    ) : (
                        <div className="flex-col h-full">
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                                        {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pie-legend">
                                {catData.slice(0, 4).map((d, i) => (
                                    <div key={d.name} className="pie-legend-item flex justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="pie-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <span>{d.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* 8. Monthly Spending Bar - Span 1, Row 1 */}
                <motion.div {...fadeUp(0.4)} className="bento-card bento-span-1">
                    <h4 style={{ marginBottom: 12 }}>Last 6 Months</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, 'dataMax']} />
                            <Tooltip formatter={(v) => formatINR(v)} cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
                            <Bar dataKey="amount" fill="var(--text-muted)" radius={[4, 4, 0, 0]}>
                                {monthlyData.map((d, i) => (
                                    <Cell key={i} fill={i === monthlyData.length - 1 ? 'var(--accent)' : 'var(--border)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

            </div>
        </div>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}
