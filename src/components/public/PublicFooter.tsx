import { settingsService } from '../../services';

const SITE_CONFIG = {
  name: 'ऋतुYog',
  phone: '+91 9899404797',
  phoneLink: 'tel:+919899404797',
  email: 'hello@rituyog.com',
  emailLink: 'mailto:hello@rituyog.com',
  whatsappUrl: 'https://wa.me/+919899404797',
  instagramUrl: 'https://www.instagram.com/rituyog_/',
  googleReviewUrl: 'https://g.page/r/CawouF1YrXkrEBM/review',
  communityUrl: 'https://chat.whatsapp.com/B6yzBv0FbfREcEFGa9DjiT',
  testAppUrl: 'https://darkslategrey-oryx-397719.hostingersite.com/',
};

export function PublicFooter() {
  const settings = settingsService.getOrDefault();
  const websiteUrl = (settings.website || 'https://rituyog.com').replace(/\/$/, '');

  const aboutLinks = [
    { label: 'About', href: `${websiteUrl}/about-rituyog` },
    { label: 'Our Services', href: `${websiteUrl}/services-yoga-classes` },
    { label: 'Our Flow', href: `${websiteUrl}/our-yoga-class-structure` },
    { label: 'Our Plans', href: `${websiteUrl}/yoga-membership-plans` },
    { label: 'Testimonials', href: `${websiteUrl}/rituyog-testimonials` },
    { label: 'Admin', href: '/login' },
  ];

  const quickLinks = [
    { label: 'Home', href: websiteUrl },
    { label: 'Photo Gallery', href: `${websiteUrl}/yoga-studio-images` },
    { label: 'Register', href: '/register' },
    { label: 'Book Trial', href: '/book-trial' },
    { label: 'FAQs', href: `${websiteUrl}/yoga-faqs` },
    { label: 'T&C', href: `${websiteUrl}/terms-and-conditions` },
  ];

  return (
    <footer className="bg-[#1F1346] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-6">

          {/* Column 1: Logo + Google Review */}
          <div className="sm:col-span-2 lg:col-span-1 text-center lg:text-left">
            <a href={websiteUrl} className="inline-block">
              <img
                src="/images/logo.png"
                alt={SITE_CONFIG.name}
                className="h-28 w-auto mb-4"
                style={{ filter: 'hue-rotate(90deg)' }}
              />
            </a>
            <p className="text-white/90 text-sm leading-relaxed">
              Happy with our service? Please take a minute to review us on{' '}
              <a
                href={SITE_CONFIG.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                Google
              </a>.
            </p>
          </div>

          {/* Column 2: About */}
          <div className="text-center lg:text-left">
            <h3 className="text-lg font-semibold mb-4">About {SITE_CONFIG.name}</h3>
            <ul className="space-y-2">
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/90 underline hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div className="text-center lg:text-left">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/90 underline hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Get In Touch */}
          <div className="text-center lg:text-left">
            <h3 className="text-lg font-semibold mb-4">Get In Touch</h3>
            <a href={`${websiteUrl}/contact`} className="text-white/90 underline hover:text-white text-sm">
              Contact Us
            </a>
            <p className="text-white/90 text-sm mt-3 leading-relaxed">
              Let's Talk, Breathe, Stretch, Heal & Transform Together!
            </p>
            <p className="text-white/90 text-sm mt-3">
              <strong>Call Us:</strong>{' '}
              <a href={SITE_CONFIG.phoneLink} className="underline hover:text-white">
                {SITE_CONFIG.phone}
              </a>
            </p>
            <p className="text-white/90 text-sm mt-2">
              <strong>Email Us:</strong>{' '}
              <a href={SITE_CONFIG.emailLink} className="underline hover:text-white">
                {SITE_CONFIG.email}
              </a>
            </p>

            {/* Social Links */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-4">
              {/* Instagram */}
              <a
                href={SITE_CONFIG.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href={SITE_CONFIG.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>

              {/* Test App - nearly invisible */}
              <a
                href={SITE_CONFIG.testAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/10 hover:text-white/30 text-xs ml-1 no-underline"
              >
                Test App
              </a>
            </div>
          </div>

          {/* Column 5: QR Code + Join Community */}
          <div className="flex flex-col items-center sm:col-span-2 lg:col-span-1">
            <img
              src="/images/community-qr.png"
              alt="Join Our Community QR Code"
              className="w-36 h-36 rounded-lg mb-3"
            />
            <a
              href={SITE_CONFIG.communityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gray-900 hover:bg-black text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
            >
              Join Our Community
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6">
          <p className="text-white/80 text-sm text-center lg:text-left">
            &copy; {new Date().getFullYear()}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
