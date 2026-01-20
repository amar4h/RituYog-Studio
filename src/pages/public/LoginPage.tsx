import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, Alert } from '../../components/common';
import { settingsService } from '../../services';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const settings = settingsService.getOrDefault();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page they were trying to visit
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const success = login(password);

    if (success) {
      navigate(from, { replace: true });
    } else {
      setError('Invalid password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          {settings.logoData ? (
            <img
              src={settings.logoData}
              alt={settings.studioName}
              className="w-16 h-16 object-contain rounded-2xl mx-auto mb-4"
            />
          ) : (
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{settings.studioName}</h1>
          <p className="text-gray-600 mt-1">Admin Login</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="error" dismissible onDismiss={() => setError('')}>
                {error}
              </Alert>
            )}

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={!password}
            >
              Sign In
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
