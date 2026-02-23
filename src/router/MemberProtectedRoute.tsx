import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMemberAuth } from '../hooks/useMemberAuth';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function MemberProtectedRoute() {
  const { isAuthenticated, isLoading } = useMemberAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // isAuthenticated is true for both member login and admin login
  if (!isAuthenticated) {
    return <Navigate to="/member/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
