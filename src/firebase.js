import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const VITE_FIREBASE_API_KEY="AIzaSyDHUyGoWT-KNakoo2xkY1MK_56UZZPKNTY"
const VITE_FIREBASE_AUTH_DOMAIN="colleagues-73a44.firebaseapp.com"
const VITE_FIREBASE_PROJECT_ID="colleagues-73a44"
const VITE_FIREBASE_STORAGE_BUCKET="colleagues-73a44.firebasestorage.app"
const VITE_FIREBASE_MESSAGING_SENDER_ID="826874470985"
const VITE_FIREBASE_APP_ID="1:826874470985:web:6fb64783d7c45032d59598"


/*const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
*/
const firebaseConfig = {
  apiKey: VITE_FIREBASE_API_KEY,
  authDomain: VITE_FIREBASE_AUTH_DOMAIN,
  projectId: VITE_FIREBASE_PROJECT_ID,
  storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (v) => typeof v === 'string' && v.length > 0,
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
