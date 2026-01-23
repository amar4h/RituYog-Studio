import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Button } from './Button';

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let details = '';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Page not found';
      message = 'The page you are looking for does not exist.';
    } else if (error.status === 401) {
      title = 'Unauthorized';
      message = 'You need to log in to access this page.';
    } else if (error.status === 403) {
      title = 'Access denied';
      message = 'You do not have permission to access this page.';
    }
  } else if (error instanceof Error) {
    details = error.message;
  }

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/admin/dashboard');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{message}</p>

        {/* Error Details (collapsible in dev) */}
        {details && import.meta.env.DEV && (
          <details className="mb-6 text-left bg-gray-100 rounded-lg p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Technical details
            </summary>
            <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-32 whitespace-pre-wrap">
              {details}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={handleGoBack}>
            Go Back
          </Button>
          <Button variant="outline" onClick={handleReload}>
            Reload Page
          </Button>
          <Button onClick={handleGoHome}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
