import { useState, useMemo, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import { memberAuthService, memberService, subscriptionService, attendanceService, slotService } from '../../services';

// ── Campaign Configuration ──
// Must match BASANT_RITU_CAMPAIGN dates in AttendancePage.tsx
const CAMPAIGN_LABEL = 'Basant Ritu Attendance Challenge';
const CAMPAIGN_PRIZE = 'Yoga Mat Bag from Wiselife';
const CAMPAIGN_START = '2026-01-23';
const CAMPAIGN_END = '2026-02-28';

function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// ── Campaign Leaderboard (loads data independently) ──
function CampaignLeaderboard() {
  const { isLoading } = useFreshData(['members', 'subscriptions', 'attendance', 'slots']);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const effectiveEnd = useMemo(() => today < CAMPAIGN_END ? today : CAMPAIGN_END, [today]);

  const leaderboard = useMemo(() => {
    const allSubs = subscriptionService.getAll().filter(s =>
      (s.status === 'active' || s.status === 'expired') &&
      s.startDate <= effectiveEnd &&
      s.endDate >= CAMPAIGN_START
    );
    const slots = slotService.getAll();

    const latestSubByMember = new Map<string, { slotId: string; endDate: string }>();
    for (const sub of allSubs) {
      const existing = latestSubByMember.get(sub.memberId);
      if (!existing || sub.endDate > existing.endDate) {
        latestSubByMember.set(sub.memberId, { slotId: sub.slotId, endDate: sub.endDate });
      }
    }

    const slotGroups = new Map<string, Array<{ memberId: string; name: string }>>();
    for (const [memberId, info] of latestSubByMember) {
      const member = memberService.getById(memberId);
      if (!member) continue;
      if (!slotGroups.has(info.slotId)) slotGroups.set(info.slotId, []);
      slotGroups.get(info.slotId)!.push({ memberId: member.id, name: `${member.firstName} ${member.lastName}` });
    }

    const result: Array<{
      slotId: string;
      slotName: string;
      slotTime: string;
      first: { names: string[]; count: number };
      second: { names: string[]; count: number } | null;
    }> = [];

    for (const [slotId, members] of slotGroups) {
      const slot = slots.find(s => s.id === slotId);
      if (!slot) continue;

      const counts: Array<{ name: string; count: number }> = [];
      for (const m of members) {
        const presentDates = new Set(
          attendanceService.getByMember(m.memberId)
            .filter(r =>
              r.status === 'present' &&
              r.date >= CAMPAIGN_START &&
              r.date <= effectiveEnd
            )
            .map(r => r.date)
        );
        counts.push({ name: formatShortName(m.name), count: presentDates.size });
      }

      counts.sort((a, b) => b.count - a.count);
      if (counts.length === 0 || counts[0].count === 0) continue;

      const firstCount = counts[0].count;
      const firstNames = counts.filter(c => c.count === firstCount).map(c => c.name);

      const secondCandidates = counts.filter(c => c.count < firstCount && c.count > 0);
      let second: { names: string[]; count: number } | null = null;
      if (secondCandidates.length > 0) {
        const secondCount = secondCandidates[0].count;
        second = {
          names: secondCandidates.filter(c => c.count === secondCount).map(c => c.name),
          count: secondCount,
        };
      }

      result.push({
        slotId,
        slotName: slot.displayName,
        slotTime: slot.startTime,
        first: { names: firstNames, count: firstCount },
        second,
      });
    }

    result.sort((a, b) => a.slotTime.localeCompare(b.slotTime));
    return result;
  }, [today, effectiveEnd]);

  if (isLoading || leaderboard.length === 0) return null;

  return (
    <div className="w-full max-w-sm">
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="text-center pt-4 pb-2 px-4">
          <div className="text-2xl leading-none mb-1">&#127942;</div>
          <h2 className="text-white font-bold text-sm tracking-wide uppercase">{CAMPAIGN_LABEL}</h2>
          <p className="text-indigo-300 text-[11px] mt-0.5">Prize: <span className="text-amber-300 font-medium">{CAMPAIGN_PRIZE}</span></p>
          <p className="text-indigo-200 text-[11px] mt-1">Current standings &middot; Final winner declared on 2nd March</p>
        </div>
        <div className="px-3 pb-3 space-y-1.5">
          {leaderboard.map(batch => (
            <div key={batch.slotId} className="bg-white/[0.07] backdrop-blur-sm rounded-xl px-3 py-2">
              <div className="text-indigo-300/70 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                {batch.slotName}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">&#129351;</span>
                <span className="text-amber-200 font-semibold text-[13px] flex-1 truncate">{batch.first.names.join(', ')}</span>
                <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap">{batch.first.count} days</span>
              </div>
              {batch.second && batch.first.names.length === 1 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm leading-none">&#129352;</span>
                  <span className="text-gray-300/80 font-medium text-xs flex-1 truncate">{batch.second.names.join(', ')}</span>
                  <span className="bg-white/[0.08] text-gray-400 px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap">{batch.second.count} days</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Member Picker (shown when multiple family members share a phone) ──
function MemberPicker({ candidates, onSelect }: {
  candidates: Array<{ id: string; firstName: string; lastName: string }>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-2xl p-[2px] shadow-lg">
        <div className="bg-white rounded-2xl p-5">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">Who's logging in?</h2>
            <p className="text-xs text-gray-500 mt-1">Multiple members found with this number</p>
          </div>
          <div className="space-y-2">
            {candidates.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50/80 hover:bg-indigo-50 border border-gray-200/80 hover:border-indigo-200 rounded-xl transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {c.firstName[0]}{c.lastName[0]}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Login Page ──
export function MemberLoginPage() {
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Array<{ id: string; firstName: string; lastName: string }> | null>(null);
  const { login, loginAsCandidate, isAuthenticated, isAdminViewing } = useMemberAuth();
  const navigate = useNavigate();

  // Redirect if member is logged in (not just admin)
  if (isAuthenticated && !isAdminViewing) {
    return <Navigate to="/member" replace />;
  }

  const normalizePhone = (raw: string) => {
    let clean = raw.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = clean.slice(1);
    } else if (clean.startsWith('91') && clean.length > 10) {
      clean = clean.slice(clean.length - 10);
    }
    return clean;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || !password.trim()) {
      setError('Please enter your phone number and password');
      return;
    }

    setLoading(true);
    const result = await login(normalizePhone(phone), password);
    setLoading(false);

    if (result.success) {
      navigate('/member', { replace: true });
    } else if (result.candidates && result.candidates.length > 1) {
      // Multiple family members — show picker
      setCandidates(result.candidates);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleSelectCandidate = (memberId: string) => {
    loginAsCandidate(memberId);
    navigate('/member', { replace: true });
  };

  const handleActivate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await memberAuthService.activateAccount(normalizePhone(phone), password);
    setLoading(false);

    if (result.success) {
      setSuccess('Account activated! You can now log in.');
      setPassword('');
      setConfirmPassword('');
      setMode('login');
    } else {
      setError(result.error || 'Activation failed');
    }
  };

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30 flex flex-col items-center justify-center px-4 py-8 gap-4">
      {/* Page heading */}
      <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">Member Portal</h1>

      {/* Member picker (shown when multiple family members match) */}
      {candidates ? (
        <MemberPicker candidates={candidates} onSelect={handleSelectCandidate} />
      ) : (
        <>
          {/* Login / Activate form */}
          <div className="w-full max-w-sm">
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-2xl p-[2px] shadow-lg">
              <div className="bg-white rounded-2xl p-5">

                {/* Tab toggle */}
                <div className="flex mb-4 bg-gray-100 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      mode === 'login'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('activate'); setError(''); setSuccess(''); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      mode === 'activate'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Activate Account
                  </button>
                </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50/80 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50/80 border border-green-200 rounded-xl text-sm text-green-700">
                  {success}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your registered phone number"
                      className="w-full px-3 py-3 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoComplete="tel"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3 py-3 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleActivate} className="space-y-4">
                  <p className="text-xs text-gray-500 mb-2">
                    First time here? Enter your registered phone number and set a password.
                  </p>

                  <div>
                    <label htmlFor="act-phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      id="act-phone"
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your registered phone number"
                      className="w-full px-3 py-3 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoComplete="tel"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="act-password" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      id="act-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a password"
                      className="w-full px-3 py-3 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="act-confirm" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      id="act-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-3 border border-gray-200/80 rounded-xl bg-gray-50/50 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium text-sm hover:from-green-600 hover:to-emerald-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-lg shadow-green-500/25 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Activating...' : 'Activate Account'}
                  </button>
                </form>
              )}
              </div>
            </div>
          </div>

          {/* Campaign leaderboard — below the form */}
          <CampaignLeaderboard />
        </>
      )}
    </div>
  );
}
