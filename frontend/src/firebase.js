import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAtX1GrV1GvR0NTdKdXRsmORmTLpUBo2fI",
  authDomain: "vibematch-3662d.firebaseapp.com",
  projectId: "vibematch-3662d",
  storageBucket: "vibematch-3662d.firebasestorage.app",
  messagingSenderId: "1039357890518",
  appId: "1:1039357890518:web:97ecc1a075fe123cafde77",
  measurementId: "G-N46L1YNJRM"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;


