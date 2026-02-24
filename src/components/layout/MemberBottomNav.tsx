import { NavLink } from 'react-router-dom';
import { useMemberAuth } from '../../hooks/useMemberAuth';

interface NavTabProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavTab({ to, icon, label }: NavTabProps) {
  return (
    <NavLink
      to={to}
      end={to === '/member'}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center justify-center py-2 text-xs transition-all duration-200 ${
          isActive ? 'text-indigo-600 font-medium' : 'text-gray-400 active:scale-95'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="w-6 h-6 mb-0.5">{icon}</span>
          <span>{label}</span>
          {isActive && (
            <span className="w-5 h-0.5 mt-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
          )}
        </>
      )}
    </NavLink>
  );
}

export function MemberBottomNav() {
  const { isAdminViewing } = useMemberAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-white/60 shadow-[0_-4px_20px_rgba(99,102,241,0.04)] z-30 safe-area-bottom">
      <div className="max-w-lg mx-auto flex" style={{ minHeight: '56px' }}>
        <NavTab
          to="/member"
          label="Home"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />
        <NavTab
          to="/member/attendance"
          label="Attendance"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <NavTab
          to="/member/membership"
          label="Membership"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        {!isAdminViewing && (
          <NavTab
            to="/member/settings"
            label="Settings"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        )}
      </div>
    </nav>
  );
}
