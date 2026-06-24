import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addSmartBill } from '../services';
import Tesseract from 'tesseract.js';

export default function ScanBillPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [isScanning, setIsScanning] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);
    
    // OCR Results state
    const [items, setItems] = useState([]);
    const [taxes, setTaxes] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [serviceCharge, setServiceCharge] = useState(0);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const { data: { text } } = await Tesseract.recognize(
                file,
                'eng'
            );
            
            const lines = text.split('\n');
            const extractedItems = [];
            let taxesFound = 0;
            let discountFound = 0;
            let feesFound = 0;

            lines.forEach(line => {
                // Match line ending with a price (Total Price) - supports thousands separators
                const match = line.match(/^(.+?)\s+[-$€₹]?\s*([\d,]+[.,]\d{2})$/);
                
                if (match) {
                    let rawNamePart = match[1].trim();
                    let cleanPrice = match[2];
                    
                    if (/,(\d{2})$/.test(cleanPrice)) {
                        cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
                    } else {
                        cleanPrice = cleanPrice.replace(/,/g, '');
                    }
                    
                    const totalPrice = parseFloat(cleanPrice);
                    const lowerName = rawNamePart.toLowerCase();

                    // Skip totals and taxable amount summaries
                    if (lowerName.includes('total') || lowerName.includes('subtotal') || lowerName.includes('taxable') || lowerName.includes('amount') || rawNamePart.length <= 2 || isNaN(totalPrice)) {
                        return; 
                    }
                    
                    if (lowerName.includes('tax') || lowerName.includes('cgst') || lowerName.includes('sgst')) {
                        taxesFound += totalPrice;
                        return; 
                    }
                    if (lowerName.includes('discount')) {
                        discountFound += totalPrice;
                        return;
                    }
                    if (lowerName.includes('fee') || lowerName.includes('charge')) {
                        feesFound += totalPrice;
                        return;
                    }

                    let quantity = 1;
                    let unitPrice = totalPrice;
                    let itemName = rawNamePart;

                    const tokens = rawNamePart.split(/\s+/);
                    if (tokens.length >= 3) {
                        let lastToken = tokens[tokens.length - 1];
                        let secondLastToken = tokens[tokens.length - 2];
                        
                        let qtyStr = secondLastToken.replace(/[^0-9]/g, '');
                        if (secondLastToken.match(/il/i) || secondLastToken.match(/al/i) || secondLastToken.match(/\|/)) qtyStr = '1';
                        
                        let possibleUnitPrice = parseFloat(lastToken.replace(/[^0-9.]/g, ''));
                        let possibleQty = parseInt(qtyStr, 10);

                        if (!isNaN(possibleUnitPrice) && !isNaN(possibleQty) && possibleQty > 0) {
                            // Check if Qty * UnitPrice roughly equals TotalPrice
                            if (Math.abs((possibleQty * possibleUnitPrice) - totalPrice) < 2.0) {
                                quantity = possibleQty;
                                unitPrice = possibleUnitPrice;
                                tokens.pop(); tokens.pop();
                            } else {
                                // Try fallback where lastToken is Qty and there is no UnitPrice
                                let q2 = lastToken.replace(/[^0-9]/g, '');
                                if (lastToken.match(/il/i) || lastToken.match(/al/i)) q2 = '1';
                                let pq2 = parseInt(q2, 10);
                                if (!isNaN(pq2) && pq2 > 0 && pq2 < 20) {
                                    quantity = pq2;
                                    unitPrice = totalPrice / quantity;
                                    tokens.pop();
                                }
                            }
                        } else {
                            // Fallback if UnitPrice parsing failed
                            let q2 = lastToken.replace(/[^0-9]/g, '');
                            if (lastToken.match(/il/i) || lastToken.match(/al/i)) q2 = '1';
                            let pq2 = parseInt(q2, 10);
                            if (!isNaN(pq2) && pq2 > 0 && pq2 < 20) {
                                quantity = pq2;
                                unitPrice = totalPrice / quantity;
                                tokens.pop();
                            }
                        }
                    } else if (tokens.length === 2) {
                        let lastToken = tokens[tokens.length - 1];
                        let q2 = lastToken.replace(/[^0-9]/g, '');
                        if (lastToken.match(/il/i) || lastToken.match(/al/i)) q2 = '1';
                        let pq2 = parseInt(q2, 10);
                        if (!isNaN(pq2) && pq2 > 0 && pq2 < 20) {
                            quantity = pq2;
                            unitPrice = totalPrice / quantity;
                            tokens.pop();
                        }
                    }

                    // Remove leading serial number (e.g. "1", "1.", "2)")
                    if (/^\d+[.)]?$/.test(tokens[0])) {
                        tokens.shift();
                    }
                    
                    itemName = tokens.join(' ');

                    if (itemName.length > 2) {
                        extractedItems.push({
                            id: crypto.randomUUID(),
                            name: itemName,
                            quantity: quantity,
                            price: Number(unitPrice.toFixed(2)) // Format nicely
                        });
                    }
                }
            });

            if (extractedItems.length === 0) {
                 // Fallback if regex completely fails to parse the mess
                 extractedItems.push({ id: crypto.randomUUID(), name: 'Item 1 (Edit me)', quantity: 1, price: 0 });
            }

            setItems(extractedItems);
            setTaxes(Number(taxesFound.toFixed(2)));
            setServiceCharge(Number(feesFound.toFixed(2)));
            setDiscount(Number(discountFound.toFixed(2)));

        } catch (err) {
            console.error(err);
            alert("OCR Failed. Please add items manually.");
            setItems([{ id: crypto.randomUUID(), name: 'Item 1', quantity: 1, price: 0 }]);
        } finally {
            setIsScanning(false);
            setScanComplete(true);
        }
    };

    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddItem = () => {
        setItems(prev => [...prev, { id: crypto.randomUUID(), name: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveItem = (id) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleCreateBill = async () => {
        if (!currentUser) return;
        
        try {
            const billData = {
                status: 'OPEN',
                items: items.map(item => ({
                    ...item,
                    quantity: Number(item.quantity) || 1,
                    price: Number(item.price) || 0
                })),
                taxes: Number(taxes) || 0,
                discount: Number(discount) || 0,
                serviceCharge: Number(serviceCharge) || 0,
                participants: [{
                    id: currentUser.uid,
                    name: currentUser.displayName || 'Creator',
                    isCreator: true,
                    paymentStatus: 'PAID' // Creator doesn't need to pay themselves
                }],
                selections: {}
            };

            const docRef = await addSmartBill(currentUser.uid, billData);
            navigate(`/bill/${docRef.id}`);
        } catch (error) {
            console.error("Error creating smart bill: ", error);
            alert("Failed to create bill. Please try again.");
        }
    };

    if (isScanning) {
        return (
            <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <Loader2 className="spinning" size={48} color="var(--primary-color)" />
                <h2 style={{ marginTop: '1rem' }}>Scanning Bill...</h2>
                <p style={{ color: 'var(--text-muted)' }}>Extracting items, prices, and taxes using Smart OCR.</p>
            </div>
        );
    }

    if (!scanComplete) {
        return (
            <div className="page-container">
                <header className="page-header">
                    <h1>Scan Bill</h1>
                    <p>Upload a receipt to automatically extract items and split with friends.</p>
                </header>

                <div className="upload-container" style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    marginTop: '2rem',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s'
                }} onClick={() => document.getElementById('bill-upload').click()}>
                    <Camera size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                    <h3>Click to Upload Receipt</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Supports JPG, PNG, PDF</p>
                    <input 
                        type="file" 
                        id="bill-upload" 
                        accept="image/*,application/pdf" 
                        style={{ display: 'none' }} 
                        onChange={handleFileUpload} 
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>Verify Bill Details</h1>
                <p>Please check the OCR extracted items and edit if necessary.</p>
            </header>

            <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Items</h3>
                    <button className="btn btn-secondary" onClick={handleAddItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                <div className="items-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingBottom: '0.2rem', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        <div style={{ minWidth: '20px' }}></div>
                        <div style={{ flex: 1 }}>Item</div>
                        <div style={{ width: '80px' }}>Qty</div>
                        <div style={{ width: '100px' }}>Rate</div>
                        <div style={{ width: '100px' }}>Amount</div>
                        <div style={{ width: '36px' }}></div>
                    </div>
                    {items.map((item, index) => (
                        <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span style={{ minWidth: '20px', color: 'var(--text-muted)' }}>{index + 1}.</span>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={item.name} 
                                onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} 
                                placeholder="Item Name"
                                style={{ flex: 1 }}
                            />
                            <input 
                                type="number" 
                                className="input-field" 
                                value={item.quantity} 
                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} 
                                placeholder="Qty"
                                style={{ width: '80px' }}
                                min="1"
                            />
                            <input 
                                type="number" 
                                className="input-field" 
                                value={item.price} 
                                onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} 
                                placeholder="Rate"
                                style={{ width: '100px' }}
                                min="0"
                            />
                            <div className="input-field" style={{ width: '100px', display: 'flex', alignItems: 'center', background: 'var(--hover-bg)', borderRadius: 'var(--radius-md)', padding: '0 14px', border: '1px solid transparent', color: 'var(--text)', opacity: 0.8 }}>
                                {(Number(item.quantity) * Number(item.price)).toFixed(2)}
                            </div>
                            <button className="btn-icon" onClick={() => handleRemoveItem(item.id)} style={{ color: 'var(--danger-color)', width: '36px', height: '36px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>

                <hr style={{ margin: '2rem 0', borderColor: 'var(--border-color)' }} />

                <div className="summary-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Taxes</label>
                        <input type="number" className="input-field" value={taxes} onChange={(e) => setTaxes(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Fees & Charges</label>
                        <input type="number" className="input-field" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Discount</label>
                        <input type="number" className="input-field" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Calculated Total</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                            ₹{(
                                items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0) 
                                + Number(taxes) 
                                + Number(serviceCharge) 
                                - Number(discount)
                            ).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleCreateBill} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                        <CheckCircle size={20} /> Create Bill & Generate Link
                    </button>
                </div>
            </div>
        </div>
    );
}
