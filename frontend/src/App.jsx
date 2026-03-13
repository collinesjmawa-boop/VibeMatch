import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Room from './pages/Room';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import './App.css';

// Component to protect routes
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  console.log('Auth State (ProtectedRoute):', user);
  if (user === undefined) return <div className="loading-screen">✨ Loading VibeMatch...</div>;
  if (!user) return <Navigate to="/auth" />;
  
  return children;
}

// Landing logic: if logged in, go to Vibe Selection. If not, go to Auth.
function LandingPage() {
  const { user } = useAuth();
  if (user === undefined) return <div className="loading-screen">✨ Loading...</div>;
  return user ? <Home /> : <Navigate to="/auth" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Landing / Vibe Selection */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/vibe" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          
          {/* Auth */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Vibe Dashboard */}
          <Route path="/dashboard/:vibe" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Call Room */}
          <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
          
          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
