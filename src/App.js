import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './login/Login.jsx';
import Dashboard from './dashboard/Dashboard.jsx';
import Logout from './logout/Logout.jsx';
import Home from './components/Home.jsx';
import TournamentDetails from './components/TournamentDetails.jsx';
import CreateTournament from './components/CreateTournament.jsx';
import EditTournament from './components/EditTournament.jsx';
import { AuthProvider } from './context/AuthContext.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import { useAuth } from './context/AuthContext.js';
import './App.css';
import TeamHub from './components/TeamHub.jsx';
import MatchCenter from './components/MatchCenter.jsx';
import Messages from './components/Messages.jsx';

const NavigationBar = () => {
  const { user } = useAuth();

  return (
    <nav className="main-nav">
      <div className="nav-logo">
        <Link to="/">SportNet</Link>
      </div>
      <div className="nav-links">
        <Link to="/">Home</Link>
        {!user ? (
          <Link to="/login">Login</Link>
        ) : (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {user.role === 'Organizer' && (
              <Link to="/create-tournament">Create Tournament</Link>
            )}
            <Link to="/team-hub">Team Hub</Link>
            <Link to="/match-center">Match Center</Link>
            <Link to="/messages">Messages</Link>
            <Link to="/logout">Logout</Link>
          </>
        )}
      </div>
    </nav>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NavigationBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logout"
            element={
              <ProtectedRoute>
                <Logout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-tournament"
            element={
              <ProtectedRoute>
                <CreateTournament />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-tournament/:id"
            element={
              <ProtectedRoute>
                <EditTournament />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tournament/:id"
            element={
              <ProtectedRoute>
                <TournamentDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team-hub"
            element={
              <ProtectedRoute>
                <TeamHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/match-center"
            element={
              <ProtectedRoute>
                <MatchCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<h1>404 - Page Not Found</h1>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;