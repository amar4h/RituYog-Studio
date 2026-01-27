import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, PageLoading } from '../../components/common';
import { formatCurrency } from '../../utils/formatUtils';
import { getDaysRemaining } from '../../utils/dateUtils';
import {
  memberService,
  leadService,
  subscriptionService,
  paymentService,
  invoiceService,
  slotService,
  settingsService,
} from '../../services';
import { getToday, getCurrentMonthRange } from '../../utils/dateUtils';
import { useFreshData } from '../../hooks';

export function DashboardPage() {
  // Fetch fresh data from API on mount
  const { isLoading } = useFreshData(['members', 'leads', 'subscriptions', 'invoices', 'payments']);

  const [showAllExpiring, setShowAllExpiring] = useState(false);
  const [chartMonths, setChartMonths] = useState<3 | 6 | 12>(6);
  const [selectedChartMonth, setSelectedChartMonth] = useState<number | null>(null);

  // Get settings for default toggle states
  const settings = settingsService.getOrDefault();
  const [showRevenue, setShowRevenue] = useState(settings.dashboardShowRevenue ?? false);
  const [showMonthlyChart, setShowMonthlyChart] = useState(settings.dashboardShowChart ?? true);

  // Show loading state while fetching data (MUST be after all hooks)
  if (isLoading) {
    return <PageLoading />;
  }

  // Get data for stats
  const members = memberService.getAll();
  const activeMembers = members.filter(m => m.status === 'active');
  const leads = leadService.getPending();
  const allExpiringSubscriptions = subscriptionService.getExpiringSoon(7);
  const slots = slotService.getActive();

  // Get all subscriptions to check for renewals
  const allSubscriptions = subscriptionService.getAll();

  // Filter out members who already have a scheduled/future renewal subscription
  // and sort by expiry date (earliest first)
  const expiringSubscriptions = allExpiringSubscriptions
    .filter(expiring => {
      // Use hasPendingRenewal which checks for future subscriptions (scheduled or active with future start)
      return !subscriptionService.hasPendingRenewal(expiring.memberId);
    })
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  // Calculate current month revenue and invoices
  const { start, end } = getCurrentMonthRange();
  const monthlyRevenue = paymentService.getRevenue(start, end);

  // Calculate current month invoices total
  const allInvoicesForMonth = invoiceService.getAll().filter(inv =>
    inv.invoiceDate >= start && inv.invoiceDate <= end
  );
  const monthlyInvoices = allInvoicesForMonth.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

  // Calculate monthly invoices and payments for chart (configurable period)
  const getMonthlyChartData = (months: number) => {
    const data: { month: string; shortMonth: string; invoices: number; payments: number }[] = [];
    const now = new Date();
    const allPayments = paymentService.getAll();
    const allInvoices = invoiceService.getAll();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = date.toISOString().split('T')[0];
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      // Calculate invoice amounts for this month
      const monthInvoices = allInvoices.filter(inv =>
        inv.invoiceDate >= monthStart &&
        inv.invoiceDate <= monthEnd
      );
      const invoiceTotal = monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

      // Calculate payment amounts for this month
      const monthPayments = allPayments.filter(p =>
        p.paymentDate >= monthStart &&
        p.paymentDate <= monthEnd &&
        p.status === 'completed'
      );
      const paymentTotal = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        shortMonth: date.toLocaleDateString('en-US', { month: 'short' }),
        invoices: invoiceTotal,
        payments: paymentTotal,
      });
    }
    return data;
  };
  const monthlyChartData = getMonthlyChartData(chartMonths);
  const maxChartValue = Math.max(
    ...monthlyChartData.map(d => Math.max(d.invoices, d.payments)),
    1
  );

  // Calculate slot utilization
  const today = getToday();

  // Calculate pending notifications
  const renewalReminderDays = settings.renewalReminderDays || 7;

  // Members needing renewal reminders (expiring within reminder window, not yet renewed)
  // Also filter out members who have already renewed (have newer active subscription)
  const renewalReminders = expiringSubscriptions.filter(sub => {
    const daysLeft = getDaysRemaining(sub.endDate);
    if (daysLeft > renewalReminderDays || daysLeft < 0) return false;

    // Check if member has a newer active subscription (already renewed)
    const allMemberSubs = subscriptionService.getByMember(sub.memberId);
    const hasNewerActiveSub = allMemberSubs.some(s =>
      s.id !== sub.id &&
      s.status === 'active' &&
      new Date(s.endDate) > new Date(sub.endDate)
    );
    return !hasNewerActiveSub;
  });

  // Recently expired subscriptions (last 7 days) that haven't renewed
  const expiredSubscriptions = subscriptionService.getRecentlyExpired(7).filter(sub => {
    // Check if member has a pending renewal
    if (subscriptionService.hasPendingRenewal(sub.memberId)) return false;

    // Check if member has any active subscription (already renewed)
    const allMemberSubs = subscriptionService.getByMember(sub.memberId);
    const hasActiveSub = allMemberSubs.some(s =>
      s.id !== sub.id &&
      s.status === 'active'
    );
    return !hasActiveSub;
  });

  // Leads needing follow-up (pending leads older than 2 days)
  const twoBusinessDaysAgo = new Date();
  twoBusinessDaysAgo.setDate(twoBusinessDaysAgo.getDate() - 2);
  const leadsNeedingFollowUp = leads.filter(lead => {
    const createdAt = new Date(lead.createdAt);
    return createdAt < twoBusinessDaysAgo;
  });

  const totalPendingNotifications = renewalReminders.length + expiredSubscriptions.length + leadsNeedingFollowUp.length;

  const slotUtilization = slots.map(slot => {
    // Get all membership subscriptions for this slot
    const slotSubscriptions = allSubscriptions.filter(s => s.slotId === slot.id);

    // Filter for currently active subscriptions (status active AND within date range)
    const currentlyActiveSubscriptions = slotSubscriptions.filter(s =>
      s.status === 'active' && s.startDate <= today && s.endDate >= today
    );

    // Filter for scheduled subscriptions (future members - either status 'scheduled' or active with future start)
    const scheduledSubscriptions = slotSubscriptions.filter(s =>
      s.status === 'scheduled' || (s.status === 'active' && s.startDate > today)
    );

    // Get member IDs who have active subscriptions
    const activeMemberIds = new Set(currentlyActiveSubscriptions.map(s => s.memberId));

    // Filter scheduled subscriptions to only include NEW members (not renewals)
    // Renewals are members who already have an active subscription
    const newScheduledSubscriptions = scheduledSubscriptions.filter(s => !activeMemberIds.has(s.memberId));

    // Total booked = currently active + NEW scheduled only (renewals don't double-count)
    const subscriberCount = currentlyActiveSubscriptions.length + newScheduledSubscriptions.length;
    const utilization = Math.round((subscriberCount / slot.capacity) * 100);

    return {
      slot,
      subscribers: subscriberCount,
      utilization: Math.min(100, utilization),
    };
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's an overview of your studio.</p>
      </div>

      {/* Stats grid - compact layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Small stat tiles with icons */}
        <SmallStatCard
          title="Active Members"
          value={activeMembers.length}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <SmallStatCard
          title="Pending Leads"
          value={leads.length}
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
        <SmallStatCard
          title="Expiring Soon"
          value={expiringSubscriptions.length}
          color="yellow"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* This Month card with toggle visibility - shows both Invoices and Payments */}
        <div
          onClick={() => setShowRevenue(!showRevenue)}
          className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg mt-0.5">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">This Month</p>
              {showRevenue ? (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-sm flex-shrink-0"></span>
                    <span className="text-sm font-bold text-blue-700">{formatCurrency(monthlyInvoices)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-sm flex-shrink-0"></span>
                    <span className="text-sm font-bold text-green-700">{formatCurrency(monthlyRevenue)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-400">••••••</p>
              )}
            </div>
            <div className="text-gray-400 flex-shrink-0 mt-0.5">
              {showRevenue ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Chart card with toggle visibility */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">Invoices & Payments</p>
                {/* Legend */}
                <div className="flex items-center gap-2 text-[9px]">
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-blue-500 rounded-sm"></span> Invoices</span>
                  <span className="flex items-center gap-0.5"><span className="w-2 h-2 bg-green-500 rounded-sm"></span> Payments</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Period selector */}
              <div className="flex text-[10px] bg-gray-100 rounded overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMonths(m as 3 | 6 | 12)}
                    className={`px-2 py-0.5 ${chartMonths === m ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
              {/* Toggle visibility */}
              <button
                onClick={() => setShowMonthlyChart(!showMonthlyChart)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {showMonthlyChart ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {showMonthlyChart ? (
            <>
              <div className="flex items-end gap-1 h-20 mt-1">
                {monthlyChartData.map((data, index) => {
                  const maxBarHeight = 56; // pixels (h-14)
                  const invoiceHeight = maxChartValue > 0 ? Math.max((data.invoices / maxChartValue) * maxBarHeight, 2) : 2;
                  const paymentHeight = maxChartValue > 0 ? Math.max((data.payments / maxChartValue) * maxBarHeight, 2) : 2;
                  const isSelected = selectedChartMonth === index;
                  return (
                    <div
                      key={index}
                      className={`flex flex-col items-center flex-1 min-w-0 cursor-pointer rounded transition-colors ${isSelected ? 'bg-gray-100' : ''}`}
                      onClick={() => setSelectedChartMonth(isSelected ? null : index)}
                    >
                      <div className="flex items-end gap-[2px] w-full" style={{ height: maxBarHeight }}>
                        {/* Invoice bar (blue) */}
                        <div
                          className={`flex-1 rounded-t transition-all ${isSelected ? 'bg-blue-600' : 'bg-blue-500'}`}
                          style={{ height: `${invoiceHeight}px` }}
                          title={`Invoices: ${formatCurrency(data.invoices)}`}
                        />
                        {/* Payment bar (green) */}
                        <div
                          className={`flex-1 rounded-t transition-all ${isSelected ? 'bg-green-600' : 'bg-green-500'}`}
                          style={{ height: `${paymentHeight}px` }}
                          title={`Payments: ${formatCurrency(data.payments)}`}
                        />
                      </div>
                      <span className={`text-[9px] mt-1 truncate w-full text-center ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{data.shortMonth}</span>
                    </div>
                  );
                })}
              </div>
              {/* Selected month details - shown on tap for mobile */}
              {selectedChartMonth !== null && (
                <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-gray-100 text-xs">
                  <span className="text-gray-600">
                    <span className="font-medium">{monthlyChartData[selectedChartMonth].month}:</span>
                  </span>
                  <span className="text-blue-700">
                    Inv: {formatCurrency(monthlyChartData[selectedChartMonth].invoices)}
                  </span>
                  <span className="text-green-700">
                    Rcvd: {formatCurrency(monthlyChartData[selectedChartMonth].payments)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-end gap-1 h-16">
              {monthlyChartData.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                  <div className="flex items-end gap-[1px] w-full h-12">
                    <div className="flex-1 bg-gray-200 rounded-t" style={{ height: '40%' }} />
                    <div className="flex-1 bg-gray-200 rounded-t" style={{ height: '40%' }} />
                  </div>
                  <span className="text-[8px] text-gray-400 mt-0.5 truncate w-full text-center">{data.shortMonth}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Notifications Alert */}
      {totalPendingNotifications > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">Pending Notifications</h3>
                <p className="text-sm text-indigo-700">
                  {renewalReminders.length > 0 && (
                    <span>{renewalReminders.length} expiring soon</span>
                  )}
                  {renewalReminders.length > 0 && expiredSubscriptions.length > 0 && ' • '}
                  {expiredSubscriptions.length > 0 && (
                    <span>{expiredSubscriptions.length} recently expired</span>
                  )}
                  {(renewalReminders.length > 0 || expiredSubscriptions.length > 0) && leadsNeedingFollowUp.length > 0 && ' • '}
                  {leadsNeedingFollowUp.length > 0 && (
                    <span>{leadsNeedingFollowUp.length} lead follow-up{leadsNeedingFollowUp.length !== 1 ? 's' : ''}</span>
                  )}
                </p>
              </div>
            </div>
            <Link to="/admin/notifications">
              <Button variant="primary" size="sm">
                Send Messages
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Slot utilization and expiring members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slot utilization */}
        <Card title="Session Slots" subtitle={`Today: ${today}`}>
          <div className="space-y-4">
            {slotUtilization.map(({ slot, subscribers, utilization }) => (
              <div key={slot.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{slot.displayName}</span>
                  <span className="text-gray-600">
                    {subscribers}/{slot.capacity} members
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      utilization >= 90 ? 'bg-red-500' :
                      utilization >= 70 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Expiring memberships */}
        <Card title="Expiring Memberships" subtitle="Next 7 days (not yet renewed)">
          {expiringSubscriptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No memberships expiring in the next 7 days
            </p>
          ) : (
            <div className="space-y-2">
              {(showAllExpiring ? expiringSubscriptions : expiringSubscriptions.slice(0, 5)).map(subscription => {
                const member = memberService.getById(subscription.memberId);
                const daysLeft = getDaysRemaining(subscription.endDate);
                const slot = slots.find(s => s.id === subscription.slotId);
                return (
                  <div
                    key={subscription.id}
                    className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg"
                  >
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                      daysLeft <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                    </span>
                    <Link
                      to={`/admin/members/${subscription.memberId}`}
                      className="font-medium text-gray-900 hover:text-indigo-600 truncate flex-1 min-w-0"
                    >
                      {member?.firstName} {member?.lastName}
                    </Link>
                    {slot && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {(() => {
                          const [h, m] = slot.startTime.split(':').map(Number);
                          const hour = h % 12 || 12;
                          const ampm = h >= 12 ? 'PM' : 'AM';
                          return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
                        })()}
                      </span>
                    )}
                    <Link
                      to="/admin/subscriptions/new"
                      state={{
                        memberId: subscription.memberId,
                        slotId: subscription.slotId,
                        planId: subscription.planId,
                        isRenewal: true,
                      }}
                    >
                      <Button size="sm" variant="primary">
                        Renew
                      </Button>
                    </Link>
                  </div>
                );
              })}
              {expiringSubscriptions.length > 5 && (
                <button
                  onClick={() => setShowAllExpiring(!showAllExpiring)}
                  className="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium pt-2 cursor-pointer"
                >
                  {showAllExpiring
                    ? 'Show less'
                    : `+${expiringSubscriptions.length - 5} more expiring`}
                </button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction
            label="Add Member"
            href="/admin/members/new"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            }
          />
          <QuickAction
            label="New Subscription"
            href="/admin/subscriptions/new"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <QuickAction
            label="Record Payment"
            href="/admin/payments/record"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <QuickAction
            label="View Leads"
            href="/admin/leads"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorStyles = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorStyles[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

interface QuickActionProps {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function QuickAction({ label, href, icon }: QuickActionProps) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors group"
    >
      <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow mb-2">
        {icon}
      </div>
      <span className="text-sm font-medium text-center">{label}</span>
    </a>
  );
}

interface SmallStatCardProps {
  title: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  icon?: React.ReactNode;
}

function SmallStatCard({ title, value, color, icon }: SmallStatCardProps) {
  const iconBgStyles = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  const textStyles = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    yellow: 'text-yellow-700',
    purple: 'text-purple-700',
    red: 'text-red-700',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-2">
        {icon && (
          <div className={`p-1.5 rounded-lg ${iconBgStyles[color]}`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 truncate">{title}</p>
          <p className={`text-lg font-bold ${textStyles[color]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
