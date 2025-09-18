import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');

  const go = (path) => {
    if (location.pathname !== path) navigate(path);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {}
    localStorage.clear();
    navigate('/');
  };

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="brand" onClick={() => go('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-logo">Ball</div>
          </div>

          <div className="row">
            {role === 'Developer' && (
              <button className="btn" onClick={() => go('/admin')}>ADMIN</button>
            )}
            {/* 👇 SECURITY button sits right next to LOG OUT */}
            <button className="btn" onClick={() => go('/settings/security')}>SECURITY</button>
            <div className="avatar" title={role || 'Guest'}>👤</div>
            <button className="btn btn-danger" onClick={logout}>LOG OUT</button>
          </div>
        </div>
      </header>

      <main className="container">{children}</main>
    </>
  );
}
