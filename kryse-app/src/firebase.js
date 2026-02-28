import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Replace these with your own Firebase project credentials
// Go to https://console.firebase.google.com → Project Settings → Your apps → SDK setup
const firebaseConfig = {
  apiKey: "AIzaSyAT3uXbuUNEF9IWlvy478obMYuuVneAaj8",
  authDomain: "kryse-3de70.firebaseapp.com",
  projectId: "kryse-3de70",
  storageBucket: "kryse-3de70.firebasestorage.app",
  messagingSenderId: "554137955169",
  appId: "1:554137955169:web:5f4976c20fc7a24d163320",
  measurementId: "G-WREF1LH9BY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;
