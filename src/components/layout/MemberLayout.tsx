import { Outlet } from 'react-router-dom';
import { MemberHeader } from './MemberHeader';
import { MemberBottomNav } from './MemberBottomNav';

export function MemberLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
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
