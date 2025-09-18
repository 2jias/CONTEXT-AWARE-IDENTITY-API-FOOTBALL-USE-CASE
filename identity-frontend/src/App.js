import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PlayerDashboard from './pages/PlayerDashboard';
import HomePage from './pages/HomePage';
import CoachDashboard from './pages/CoachDashboard';
import JournalistDashboard from './pages/JournalistDashboard';
import DeveloperDashboard from './pages/DeveloperDashboard';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard'; // optional
import Security2FA from './pages/Security2FA';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/player" element={
          <ProtectedRoute roles={['Player']}>
            <PlayerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/coach" element={
          <ProtectedRoute roles={['Coach']}>
            <CoachDashboard />
          </ProtectedRoute>
        } />
        <Route path="/journalist" element={
          <ProtectedRoute roles={['Journalist']}>
            <JournalistDashboard />
          </ProtectedRoute>
        } />
        <Route path="/developer" element={
          <ProtectedRoute roles={['Developer']}>
            <DeveloperDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['Developer']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/settings/security" element={
          <ProtectedRoute roles={['Player','Coach','Journalist','Developer']}>
            <Security2FA />
          </ProtectedRoute>
        } />

      </Routes>
    </Router>
  );
}

export default App;
