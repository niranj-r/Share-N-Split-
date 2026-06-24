import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Eye, Trash2, Calendar, Users, IndianRupee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeSmartBills, deleteSmartBill } from '../services';

export default function SmartBillsHistoryPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = subscribeSmartBills(currentUser.uid, (data) => {
            setBills(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this bill?")) {
            try {
                await deleteSmartBill(id);
            } catch (error) {
                console.error("Error deleting bill:", error);
                alert("Failed to delete bill.");
            }
        }
    };

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="spinning" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
            </div>
        );
    }

    return (
        <div className="page-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Smart Bills History</h1>
                    <p>View and manage all your scanned receipts and smart splits.</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/scan')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Camera size={18} /> Scan New Bill
                </button>
            </header>

            {bills.length === 0 ? (
                <div className="empty-state card" style={{ marginTop: '2rem', textAlign: 'center', padding: '4rem 2rem' }}>
                    <Camera size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                    <h3>No Smart Bills Yet</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You haven't scanned and created any smart bills yet.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/scan')}>Scan Your First Bill</button>
                </div>
            ) : (
                <div className="list-grid" style={{ marginTop: '2rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {bills.map(bill => {
                        const subtotal = bill.items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
                        const grandTotal = subtotal + (bill.taxes || 0) + (bill.serviceCharge || 0) - (bill.discount || 0);
                        const date = bill.createdAt ? new Date(bill.createdAt.toDate()).toLocaleDateString() : 'Just now';
                        
                        return (
                            <div key={bill.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>Smart Bill</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                            <Calendar size={14} /> {date}
                                        </div>
                                    </div>
                                    <div style={{ padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, background: bill.status === 'OPEN' ? 'var(--warning-bg)' : 'var(--success-bg)', color: bill.status === 'OPEN' ? 'var(--warning-color)' : 'var(--success-color)' }}>
                                        {bill.status}
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</div>
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><IndianRupee size={14} /> {grandTotal.toFixed(2)}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Participants</div>
                                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={14} /> {bill.participants?.length || 1}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <Link to={`/bill/${bill.id}`} className="btn btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                                        <Eye size={16} /> View
                                    </Link>
                                    <button className="btn btn-danger" onClick={() => handleDelete(bill.id)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 0.75rem' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
