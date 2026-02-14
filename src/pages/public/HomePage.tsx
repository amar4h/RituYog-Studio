import { Link } from 'react-router-dom';
import { settingsService } from '../../services';

export function HomePage() {
  const settings = settingsService.getOrDefault();

  return (
    <div className="flex-1 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 sm:py-24 text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6">
            Welcome to {settings.studioName}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Begin your journey to wellness. Join our yoga community and transform your mind, body, and spirit.
          </p>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Book Trial Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Book a Trial Class</h3>
              <p className="text-gray-600 mb-6">
                Experience our studio with a complimentary trial session. Choose your preferred time slot and start your yoga journey.
              </p>
              <Link
                to="/book-trial"
                className="inline-block w-full bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Book Free Trial
              </Link>
            </div>

            {/* Register Interest Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Register Your Interest</h3>
              <p className="text-gray-600 mb-6">
                Interested in joining? Register your details and we'll get in touch with membership options and class schedules.
              </p>
              <Link
                to="/register"
                className="inline-block w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Register Interest
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 border-t border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">Why Choose Us?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Flexible Timings</h4>
              <p className="text-sm text-gray-600">Multiple session slots from early morning to evening</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Small Batches</h4>
              <p className="text-sm text-gray-600">Personalized attention with limited class sizes</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Expert Instructors</h4>
              <p className="text-sm text-gray-600">Certified and experienced yoga practitioners</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">All Levels Welcome</h4>
              <p className="text-sm text-gray-600">From beginners to advanced practitioners</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        {(settings.phone || settings.email || settings.address) && (
          <div className="py-16 border-t border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Get in Touch</h3>
            <div className="flex flex-wrap justify-center gap-8 text-center">
              {settings.phone && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Phone</p>
                  <a href={`tel:${settings.phone}`} className="text-indigo-600 font-medium hover:text-indigo-700">
                    {settings.phone}
                  </a>
                </div>
              )}
              {settings.email && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  <a href={`mailto:${settings.email}`} className="text-indigo-600 font-medium hover:text-indigo-700">
                    {settings.email}
                  </a>
                </div>
              )}
              {settings.address && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  <p className="text-gray-700">{settings.address}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
