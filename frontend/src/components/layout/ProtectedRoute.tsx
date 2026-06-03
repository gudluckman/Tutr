import { Navigate, Outlet } from 'react-router-dom';
import { hasToken } from '../../api/authApi';

export function ProtectedRoute() {
  return hasToken() ? <Outlet /> : <Navigate to="/login" replace />;
}

