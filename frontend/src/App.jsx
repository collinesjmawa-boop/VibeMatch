import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Room from './pages/Room';
import Auth from './pages/Auth';
import NamePicker from './pages/NamePicker';
import Dashboard from './pages/Dashboard';
import PostView from './pages/PostView';
import Institutional from './pages/Institutional';
import './App.css';

// Allow both authenticated users AND guests through
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const isGuest = new URLSearchParams(location.search).get('guest') === 'true';

  if (user === undefined) return <div className="loading-screen">✦ Loading…</div>;
  if (!user && !isGuest) return <Navigate to="/" replace />;
  return children;
}

// Root: unauthenticated → Landing; authenticated → Home
function RootPage() {
  const { user } = useAuth();
  if (user === undefined) return <div className="loading-screen">✦ Loading…</div>;
  return user ? <Home /> : <Landing />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Root */}
          <Route path="/" element={<RootPage />} />

          {/* Authenticated vibe selector */}
          <Route path="/vibe" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          {/* Auth */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/name-picker" element={<ProtectedRoute><NamePicker /></ProtectedRoute>} />

          {/* Public post share */}
          <Route path="/post/:postId" element={<PostView />} />

          {/* Vibe Dashboard (guest-accessible in read-only) */}
          <Route path="/dashboard/:vibe" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Call Room */}
          <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />

          {/* Institutional info page */}
          <Route path="/institutional" element={<Institutional />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
