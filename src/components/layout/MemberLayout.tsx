import { Outlet } from 'react-router-dom';
import { MemberHeader } from './MemberHeader';
import { MemberBottomNav } from './MemberBottomNav';

export function MemberLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MemberHeader />
      <main className="pb-20">
        <div className="max-w-lg mx-auto px-4 py-4">
          <Outlet />
        </div>
      </main>
      <MemberBottomNav />
    </div>
  );
}
