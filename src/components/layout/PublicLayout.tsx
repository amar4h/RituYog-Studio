import { Outlet, Link, useLocation } from 'react-router-dom';
import { settingsService } from '../../services';

export function PublicLayout() {
  const settings = settingsService.getOrDefault();
  const location = useLocation();

  const isRegisterPage = location.pathname === '/register';
  const isBookTrialPage = location.pathname === '/book-trial';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            {settings.logoData ? (
              <img
                src={settings.logoData}
                alt={settings.studioName}
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            )}
            <span className="text-xl font-bold text-gray-900">{settings.studioName}</span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            {/* Show "Back to Home" on inner pages */}
            <Link
              to="/"
              className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </Link>

            <div className="h-4 w-px bg-gray-300" />

            {/* Register link - styled with solid color when active */}
            <Link
              to="/register"
              className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                isRegisterPage
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white'
              }`}
            >
              Register Interest
            </Link>

            {/* Book Trial link - styled with solid color when active */}
            <Link
              to="/book-trial"
              className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                isBookTrialPage
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white'
              }`}
            >
              Book Trial
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-600 text-sm">
              {settings.studioName}
              {settings.address && <span className="ml-2">| {settings.address}</span>}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {settings.phone && (
                <a href={`tel:${settings.phone}`} className="hover:text-gray-700">
                  {settings.phone}
                </a>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`} className="hover:text-gray-700">
                  {settings.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
