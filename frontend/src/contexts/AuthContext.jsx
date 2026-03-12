import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
    });
    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);
  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

  return (
    <AuthContext.Provider value={{ user, logout, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  return useContext(AuthContext);
}
