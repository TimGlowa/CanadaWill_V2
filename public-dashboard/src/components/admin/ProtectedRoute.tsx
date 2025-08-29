import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission, 
}: ProtectedRouteProps) {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginForm 
        onLogin={async ({ email, password }) => await login(email, password)}
        error={undefined}
        loading={loading}
      />
    );
  }

  // Check role requirement
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have the required role to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Required role: {requiredRole}</p>
        </div>
      </div>
    );
  }

  // Check permission requirement
  if (requiredPermission && !user.permissions.includes(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have the required permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Required permission: {requiredPermission}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 