import { useState } from 'react';
import { settingsService } from '../../services';

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about-rituyog' },
  { label: 'Services', path: '/services-yoga-classes' },
  { label: 'Our Flow', path: '/our-yoga-class-structure' },
  { label: 'Testimonials', path: '/rituyog-testimonials' },
  { label: 'Photo Gallery', path: '/yoga-studio-images' },
  { label: 'Our Plans', path: '/yoga-membership-plans' },
  { label: 'Members', path: '/member/login', local: true },
  { label: 'Admin', path: '/login', local: true },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const settings = settingsService.getOrDefault();
  const websiteUrl = (settings.website || 'https://rituyog.com').replace(/\/$/, '');

  return (
    <header className="sticky top-6 z-40 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href={websiteUrl} className="flex items-center gap-2 shrink-0">
            <img
              src={settings.logoData || '/images/logo.png'}
              alt="ऋतुYog"
              className="h-10 sm:h-14 w-auto"
              style={settings.logoData ? undefined : { filter: 'hue-rotate(90deg)' }}
            />
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.path}
                href={item.local ? item.path : `${websiteUrl}${item.path}`}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-[#673de6] hover:bg-gray-50 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-md text-gray-700 hover:text-[#673de6] hover:bg-gray-50"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.path}
                href={item.local ? item.path : `${websiteUrl}${item.path}`}
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-[#673de6] hover:bg-gray-50 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
