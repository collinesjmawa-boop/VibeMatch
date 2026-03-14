import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Room from './pages/Room';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PostView from './pages/PostView';
import './App.css';

// ... (ProtectedRoute logic remains same)

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
          
          {/* Public Post View (Viral Sharing) */}
          <Route path="/post/:postId" element={<PostView />} />
          
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
