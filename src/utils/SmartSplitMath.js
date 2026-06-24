/**
 * Calculates the exact split for each participant in a Smart Bill.
 * 
 * @param {Object} bill 
 * @returns {Array} List of participant shares [{ participantId, name, subtotal, taxShare, discountShare, feeShare, total }]
 */
export function calculateSmartSplit(bill) {
    if (!bill || !bill.items) return [];

    const { items, selections, taxes = 0, discount = 0, serviceCharge = 0, participants = [] } = bill;

    // 1. Calculate the total cost of all items
    const totalItemsCost = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

    // 2. Calculate each item's split per participant
    const participantSubtotals = {};
    participants.forEach(p => {
        participantSubtotals[p.id] = { id: p.id, name: p.name, subtotal: 0 };
    });

    items.forEach(item => {
        const itemSelections = selections?.[item.id] || {};
        let totalQtySelected = 0;
        
        // Sum all quantities selected for this item by all participants
        Object.values(itemSelections).forEach(qty => {
            totalQtySelected += Number(qty);
        });

        if (totalQtySelected > 0) {
            const itemTotalCost = Number(item.price) * Number(item.quantity);
            
            Object.entries(itemSelections).forEach(([pId, qty]) => {
                if (participantSubtotals[pId]) {
                    const proportion = Number(qty) / totalQtySelected;
                    participantSubtotals[pId].subtotal += (proportion * itemTotalCost);
                }
            });
        }
    });

    // 3. Apply proportional taxes, fees, and discounts
    const results = Object.values(participantSubtotals).map(pInfo => {
        let proportionOfBill = 0;
        if (totalItemsCost > 0) {
            // Distribute based on claimed subtotals.
            const totalClaimedSubtotal = Object.values(participantSubtotals).reduce((sum, p) => sum + p.subtotal, 0);
            
            if (totalClaimedSubtotal > 0) {
                 proportionOfBill = pInfo.subtotal / totalClaimedSubtotal;
            }
        }

        const taxShare = proportionOfBill * Number(taxes);
        const feeShare = proportionOfBill * Number(serviceCharge);
        const discountShare = proportionOfBill * Number(discount);
        
        const total = pInfo.subtotal + taxShare + feeShare - discountShare;

        return {
            ...pInfo,
            taxShare,
            feeShare,
            discountShare,
            total: Math.max(0, total) // Prevent negative totals
        };
    });

    return results;
}
