// src/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, roles }) {
  const at = localStorage.getItem('accessToken');
  const role = localStorage.getItem('role');
  if (!at) return <Navigate to="/" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />;
  return children;
}
