import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from '../public/PublicHeader';
import { PublicFooter } from '../public/PublicFooter';

export function PublicLayout() {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50 h-6 bg-[#1F1346]"></div>
      <PublicHeader />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
