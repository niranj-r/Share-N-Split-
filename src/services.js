// Shared helpers for Firestore CRUD operations
import {
    collection, query, where, orderBy, onSnapshot, getDocs,
    addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Budgets ────────────────────────────────────────────
export function subscribeBudgets(uid, callback) {
    const q = query(collection(db, 'budgets'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function addBudget(uid, data) {
    return addDoc(collection(db, 'budgets'), { ...data, userId: uid, amountSpent: 0, createdAt: serverTimestamp() });
}

export function updateBudget(id, data) {
    return updateDoc(doc(db, 'budgets', id), data);
}

export function deleteBudget(id) {
    return deleteDoc(doc(db, 'budgets', id));
}

// ── Trips ──────────────────────────────────────────────
export function subscribeTrips(uid, callback) {
    const q = query(collection(db, 'trips'), where('createdBy', '==', uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function addTrip(uid, data) {
    return addDoc(collection(db, 'trips'), { ...data, createdBy: uid, createdAt: serverTimestamp() });
}

export function updateTrip(id, data) {
    return updateDoc(doc(db, 'trips', id), data);
}

export function deleteTrip(id) {
    return deleteDoc(doc(db, 'trips', id));
}

// ── Expenses ───────────────────────────────────────────
export function subscribeExpenses(uid, callback) {
    const q = query(collection(db, 'expenses'), where('userId', '==', uid), orderBy('date', 'desc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function addExpense(uid, data, budgetId) {
    const ref = await addDoc(collection(db, 'expenses'), { ...data, userId: uid, createdAt: serverTimestamp() });
    // Increment budget's amountSpent
    if (budgetId) {
        // We handle this by re-computing on read; no denorm needed here for simplicity
    }
    return ref;
}

export function updateExpense(id, data) {
    return updateDoc(doc(db, 'expenses', id), data);
}

export function deleteExpense(id) {
    return deleteDoc(doc(db, 'expenses', id));
}

// ── Groups ─────────────────────────────────────────────
export function subscribeGroups(uid, callback) {
    const q = query(collection(db, 'groups'), where('createdBy', '==', uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function addGroup(uid, data) {
    return addDoc(collection(db, 'groups'), { ...data, createdBy: uid, createdAt: serverTimestamp() });
}

export async function deleteGroup(id) {
    // Cascade delete associated shared expenses
    const q = query(collection(db, 'sharedExpenses'), where('groupId', '==', id));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // Delete the group itself
    return deleteDoc(doc(db, 'groups', id));
}

// Shared expenses inside a group
export function subscribeSharedExpenses(groupId, callback) {
    const q = query(collection(db, 'sharedExpenses'), where('groupId', '==', groupId), orderBy('date', 'desc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// All shared expenses involving a user globally (for Budgets)
export function subscribeUserSharedExpenses(email, callback) {
    const q = query(collection(db, 'sharedExpenses'), where('members', 'array-contains', email), orderBy('date', 'desc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function addSharedExpense(data) {
    return addDoc(collection(db, 'sharedExpenses'), { ...data, createdAt: serverTimestamp(), paidBackBy: [] });
}

export function updateSharedExpense(id, data) {
    return updateDoc(doc(db, 'sharedExpenses', id), data);
}

export function deleteSharedExpense(id) {
    return deleteDoc(doc(db, 'sharedExpenses', id));
}

// ── Utilities ──────────────────────────────────────────
export const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Others'];

export function catClass(cat) {
    const map = {
        Food: 'cat-food', Travel: 'cat-travel', Shopping: 'cat-shopping',
        Bills: 'cat-bills', Entertainment: 'cat-entertainment', Others: 'cat-others',
    };
    return map[cat] ?? 'cat-others';
}

export function formatINR(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
