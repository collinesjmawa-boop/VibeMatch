import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';

function App() {
  return (
    <Router>
      <div className="app-container mood-gradient-default">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
