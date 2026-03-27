import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);       // undefined = loading, null = logged out
  const [userProfile, setUserProfile] = useState(null); // Firestore profile doc
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch Firestore profile
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          setUserProfile(snap.exists() ? snap.data() : null);
        } catch {
          setUserProfile(null);
        }
        setIsGuest(false);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);
  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  // Refresh profile after registration/update
  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      setUserProfile(snap.exists() ? snap.data() : null);
    } catch { /* silent */ }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      isGuest,
      setIsGuest,
      logout,
      signInWithGoogle,
      resetPassword,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
