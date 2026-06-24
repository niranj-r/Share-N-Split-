import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeSmartBill, updateSmartBill, formatINR } from '../services';
import { calculateSmartSplit } from '../utils/SmartSplitMath';
import { Loader2, Copy, ShieldCheck, ArrowLeft, Lock, Unlock, CheckCircle } from 'lucide-react';

export default function BillDetailsPage() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [bill, setBill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Participant state
    const [participantInfo, setParticipantInfo] = useState(null);
    const [joinName, setJoinName] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        const unsub = subscribeSmartBill(id, (data) => {
            if (data) {
                setBill(data);
                // Check if current user or local storage user is in the bill
                let foundParticipant = null;
                if (currentUser) {
                    foundParticipant = data.participants.find(p => p.id === currentUser.uid);
                }
                if (!foundParticipant) {
                    const localId = localStorage.getItem(`bill_${id}_participant`);
                    if (localId) {
                        foundParticipant = data.participants.find(p => p.id === localId);
                    }
                }
                setParticipantInfo(foundParticipant);
            } else {
                setError(true);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [id, currentUser]);

    const handleJoinBill = async (e) => {
        e.preventDefault();
        if (!joinName.trim() || !bill) return;

        setIsJoining(true);
        try {
            const newParticipantId = currentUser ? currentUser.uid : crypto.randomUUID();
            const newParticipant = {
                id: newParticipantId,
                name: joinName.trim(),
                isCreator: false,
                paymentStatus: 'PENDING'
            };

            const updatedParticipants = [...bill.participants, newParticipant];
            await updateSmartBill(id, { participants: updatedParticipants });

            if (!currentUser) {
                localStorage.setItem(`bill_${id}_participant`, newParticipantId);
            }
            setParticipantInfo(newParticipant);
        } catch (err) {
            console.error("Error joining bill:", err);
            alert("Failed to join bill.");
        }
        setIsJoining(false);
    };

    const handleItemSelection = async (itemId, delta) => {
        if (!participantInfo || bill.status !== 'OPEN') return;

        const currentSelections = bill.selections || {};
        const itemSelections = currentSelections[itemId] || {};
        const currentQty = itemSelections[participantInfo.id] || 0;
        
        let newQty = currentQty + delta;
        if (newQty < 0) newQty = 0;

        // Ensure we don't exceed the total item quantity available
        const item = bill.items.find(i => i.id === itemId);
        if (!item) return;

        let otherQty = 0;
        Object.entries(itemSelections).forEach(([pId, q]) => {
            if (pId !== participantInfo.id) otherQty += Number(q);
        });

        if (newQty + otherQty > item.quantity) {
            alert(`Only ${item.quantity - otherQty} remaining for this item.`);
            return;
        }

        const updatedSelections = {
            ...currentSelections,
            [itemId]: {
                ...itemSelections,
                [participantInfo.id]: newQty
            }
        };

        // Remove key if qty is 0 to keep DB clean
        if (newQty === 0) {
            delete updatedSelections[itemId][participantInfo.id];
        }

        await updateSmartBill(id, { selections: updatedSelections });
    };

    const handleFinalizeBill = async () => {
        if (!isCreator) return;
        await updateSmartBill(id, { status: 'FINALIZED' });
    };

    const handleReopenBill = async () => {
        if (!isCreator) return;
        await updateSmartBill(id, { status: 'OPEN' });
    };

    const handleMarkPaymentClaimed = async () => {
        if (!participantInfo || bill.status !== 'FINALIZED') return;
        const updatedParticipants = bill.participants.map(p => 
            p.id === participantInfo.id ? { ...p, paymentStatus: 'CLAIMED' } : p
        );
        await updateSmartBill(id, { participants: updatedParticipants });
    };

    const handleVerifyPayment = async (participantId) => {
        if (!isCreator || bill.status !== 'FINALIZED') return;
        const updatedParticipants = bill.participants.map(p => 
            p.id === participantId ? { ...p, paymentStatus: 'PAID' } : p
        );

        // Check if everyone is paid to close the bill
        const allPaid = updatedParticipants.every(p => p.paymentStatus === 'PAID');
        await updateSmartBill(id, { 
            participants: updatedParticipants,
            status: allPaid ? 'CLOSED' : 'FINALIZED'
        });
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
    };

    const copyReminder = (pName, amount) => {
        const text = `Hey ${pName}, your share for the recent bill is ${formatINR(amount)}. You can view the details here: ${window.location.href}`;
        navigator.clipboard.writeText(text);
        alert(`Reminder for ${pName} copied to clipboard!`);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Loader2 className="spinning" size={48} color="var(--primary-color)" />
            </div>
        );
    }

    if (error || !bill) {
        return (
            <div className="page-container" style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2>Bill Not Found</h2>
                <p>The link might be broken or the bill was deleted.</p>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>Go to Dashboard</button>
            </div>
        );
    }

    const isCreator = participantInfo?.isCreator;
    const splits = calculateSmartSplit(bill);
    const mySplit = splits.find(s => s.id === participantInfo?.id);

    // If not joined, show join screen
    if (!participantInfo) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
                <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
                    <h2>Join Bill</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Enter your name to select your items.</p>
                    <form onSubmit={handleJoinBill}>
                        <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Your Name" 
                            value={joinName} 
                            onChange={(e) => setJoinName(e.target.value)}
                            required
                            style={{ width: '100%', marginBottom: '1rem' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isJoining}>
                            {isJoining ? <Loader2 className="spinning" size={20} /> : 'Join Now'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {currentUser && (
                        <button className="btn-icon" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft size={24} />
                        </button>
                    )}
                    <div>
                        <h1 style={{ margin: 0 }}>Smart Bill Split</h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Status: <strong style={{ color: bill.status === 'OPEN' ? '#22c55e' : (bill.status === 'FINALIZED' ? '#f97316' : '#64748b') }}>{bill.status}</strong></p>
                    </div>
                </div>
                {isCreator && (
                    <button className="btn btn-secondary" onClick={copyShareLink} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Copy size={16} /> Share Link
                    </button>
                )}
            </header>

            {/* Main Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                
                {/* Items List */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Receipt Items</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {bill.items.map(item => {
                            const selections = bill.selections?.[item.id] || {};
                            const myQty = selections[participantInfo.id] || 0;
                            let totalSelected = 0;
                            Object.values(selections).forEach(q => totalSelected += Number(q));
                            const remaining = item.quantity - totalSelected;

                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {formatINR(item.price)} × {item.quantity} = {formatINR(item.price * item.quantity)}
                                        </div>
                                        {totalSelected > 0 && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '4px' }}>
                                                Claimed by: {Object.entries(selections).filter(([_, q]) => q > 0).map(([pId, q]) => {
                                                    const pName = bill.participants.find(p => p.id === pId)?.name || 'Unknown';
                                                    return `${pName} (${q})`;
                                                }).join(', ')}
                                            </div>
                                        )}
                                        {remaining > 0 && <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>{remaining} unclaimed</div>}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {bill.status === 'OPEN' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px' }}>
                                                <button className="btn-icon" style={{ padding: '4px' }} onClick={() => handleItemSelection(item.id, -1)} disabled={myQty === 0}>-</button>
                                                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 600 }}>{myQty}</span>
                                                <button className="btn-icon" style={{ padding: '4px' }} onClick={() => handleItemSelection(item.id, 1)} disabled={remaining === 0}>+</button>
                                            </div>
                                        ) : (
                                            <span style={{ fontWeight: 600, color: myQty > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                {myQty > 0 ? `Your Qty: ${myQty}` : 'Not selected'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Split Breakdown */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Split Summary</h3>
                    
                    {bill.status === 'OPEN' && isCreator && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Wait for everyone to select their items, then finalize the bill to calculate exact taxes and lock selections.</p>
                            <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={handleFinalizeBill}>
                                <Lock size={16} /> Finalize Bill
                            </button>
                        </div>
                    )}

                    {bill.status === 'FINALIZED' && isCreator && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem' }}>Bill is finalized. Awaiting payments.</span>
                            <button className="btn btn-secondary btn-sm" onClick={handleReopenBill} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Unlock size={14} /> Reopen
                            </button>
                        </div>
                    )}

                    {splits.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No items claimed yet.</p>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {splits.map(split => {
                            const pData = bill.participants.find(p => p.id === split.id);
                            const statusColor = pData.paymentStatus === 'PAID' ? '#22c55e' : (pData.paymentStatus === 'CLAIMED' ? '#f97316' : '#ef4444');

                            return (
                                <div key={split.id} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: split.id === participantInfo.id ? '2px solid var(--accent)' : '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{split.name} {split.id === participantInfo.id && '(You)'}</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-color)' }}>{formatINR(split.total)}</div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Subtotal: {formatINR(split.subtotal)} | Tax: {formatINR(split.taxShare)} | Fee: {formatINR(split.feeShare)} | Disc: -{formatINR(split.discountShare)}</span>
                                    </div>
                                    
                                    {/* Payment Tracking UI */}
                                    {bill.status !== 'OPEN' && (
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: statusColor, fontSize: '0.9rem', fontWeight: 600 }}>
                                                {pData.paymentStatus === 'PAID' ? <CheckCircle size={16} /> : (pData.paymentStatus === 'CLAIMED' ? <ShieldCheck size={16} /> : <Loader2 size={16} />)}
                                                {pData.paymentStatus}
                                            </div>

                                            {/* Participant Actions */}
                                            {split.id === participantInfo.id && pData.paymentStatus === 'PENDING' && !isCreator && (
                                                <button className="btn btn-primary btn-sm" onClick={handleMarkPaymentClaimed}>Mark as Paid</button>
                                            )}

                                            {/* Creator Actions */}
                                            {isCreator && pData.paymentStatus !== 'PAID' && split.id !== participantInfo.id && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => copyReminder(split.name, split.total)}>Remind</button>
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleVerifyPayment(split.id)}>Verify</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </div>
    );
}
