import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const WelcomeBanner = () => {
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {}
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={{ position: 'relative', marginBottom: '2rem' }}>
      <h2 style={{ textAlign: 'center', color: '#1976d2', margin: 0 }}>
        Welcome {role}!
      </h2>

      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '0.4rem 0.8rem',
          backgroundColor: '#d32f2f',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default WelcomeBanner;
