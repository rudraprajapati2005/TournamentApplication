import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './login/Login.jsx';
import Dashboard from './dashboard/Dashboard.jsx';
import Logout from './logout/Logout.jsx';

function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: '10px', background: '#f0f0f0' }}>
        <Link to="/" style={{ marginRight: '10px' }}>Login</Link>
        <Link to="/dashboard">Dashboard </Link>
        <Link to="/logout">Logout</Link>

      </nav>

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;