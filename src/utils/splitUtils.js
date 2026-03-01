/**
 * Computes individual owed amounts (splits) based on the split type.
 * @param {number} totalAmount - Total expense amount
 * @param {string} splitType - 'EQUAL', 'CUSTOM', 'PERCENTAGE', 'SHARES'
 * @param {string[]} participants - Array of participant emails
 * @param {Object} formData - Object containing customAmounts, percentages, or shares overrides
 * @returns {Object} - Map of email -> exact amount owed
 */
export function calculateSplits(totalAmount, splitType, participants, formData = {}) {
    const splits = {};
    const count = participants.length;

    if (count === 0) return splits;

    switch (splitType) {
        case 'EQUAL': {
            // Provide exact split, handling remainders randomly/sequentially
            const baseAmount = Math.floor((totalAmount / count) * 100) / 100;
            let remainder = Math.round((totalAmount - (baseAmount * count)) * 100) / 100;

            participants.forEach(p => {
                let amt = baseAmount;
                if (remainder > 0) {
                    amt += 0.01;
                    remainder = Math.round((remainder - 0.01) * 100) / 100;
                }
                splits[p] = Number(amt.toFixed(2));
            });
            break;
        }
        case 'PERCENTAGE': {
            participants.forEach(p => {
                const pct = Number(formData.percentages?.[p] || 0);
                splits[p] = Number(((totalAmount * pct) / 100).toFixed(2));
            });
            break;
        }
        case 'SHARES': {
            let totalShares = 0;
            participants.forEach(p => totalShares += Number(formData.shares?.[p] || 0));
            if (totalShares === 0) return splits;

            participants.forEach(p => {
                const share = Number(formData.shares?.[p] || 0);
                splits[p] = Number(((totalAmount * share) / totalShares).toFixed(2));
            });
            break;
        }
        case 'CUSTOM': {
            participants.forEach(p => {
                splits[p] = Number(formData.exactAmounts?.[p] || 0);
            });
            break;
        }
        default:
            break;
    }
    return splits;
}

/**
 * Calculates net balances and generates optimized settlement transactions.
 * using a greedy minimum-transaction algorithm.
 * @param {Object[]} expenses - List of shared expression documents
 * @param {string[]} members - Array of group member emails
 * @returns {Object} - { balances: Object, settlements: Array }
 */
export function optimizeSettlements(expenses, members) {
    const balances = {};
    members.forEach(m => balances[m] = 0);

    // 1. Compute Net Balances (Paid - Owed)
    expenses.forEach(exp => {
        const payers = exp.payers || {};
        const splits = exp.splits || {};

        // Add paid amounts to balances
        Object.entries(payers).forEach(([person, amount]) => {
            if (balances[person] !== undefined) {
                balances[person] += Number(amount);
            }
        });

        // Subtract owed amounts from balances
        Object.entries(splits).forEach(([person, amount]) => {
            if (balances[person] !== undefined) {
                balances[person] -= Number(amount);
            }
        });
    });

    // Clean up floating point errors
    members.forEach(m => {
        balances[m] = Math.round(balances[m] * 100) / 100;
    });

    // 2. Settlement Optimization Algorithm (Greedy)
    const creditors = [];
    const debtors = [];

    members.forEach(m => {
        if (balances[m] > 0.01) creditors.push({ email: m, amount: balances[m] });
        else if (balances[m] < -0.01) debtors.push({ email: m, amount: Math.abs(balances[m]) });
    });

    // Sort creditors descending, debtors descending (by absolute amount)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0; // creditors index
    let j = 0; // debtors index

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];

        const amount = Math.min(creditor.amount, debtor.amount);
        const settledAmount = Math.round(amount * 100) / 100;

        if (settledAmount > 0) {
            settlements.push({
                from: debtor.email,
                to: creditor.email,
                amount: settledAmount
            });
        }

        creditor.amount -= settledAmount;
        debtor.amount -= settledAmount;

        // Tolerance for floating point
        if (creditor.amount < 0.01) i++;
        if (debtor.amount < 0.01) j++;
    }

    return { balances, settlements };
}
