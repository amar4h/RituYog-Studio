import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/common';
import { formatCurrency } from '../../utils/formatUtils';
import { getDaysRemaining } from '../../utils/dateUtils';
import {
  memberService,
  leadService,
  subscriptionService,
  paymentService,
  slotService,
  settingsService,
} from '../../services';
import { getToday, getCurrentMonthRange } from '../../utils/dateUtils';

export function DashboardPage() {
  const [showAllExpiring, setShowAllExpiring] = useState(false);

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

  // Calculate revenue
  const { start, end } = getCurrentMonthRange();
  const monthlyRevenue = paymentService.getRevenue(start, end);

  // Calculate slot utilization
  const today = getToday();

  // Calculate pending notifications
  const settings = settingsService.getOrDefault();
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

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Members"
          value={activeMembers.length}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Pending Leads"
          value={leads.length}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
          color="purple"
        />
        <StatCard
          title="Expiring Soon"
          value={expiringSubscriptions.length}
          subtitle="Next 7 days"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="yellow"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(monthlyRevenue)}
          subtitle="Revenue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
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
                      <span className="text-xs text-gray-500 whitespace-nowrap">{slot.displayName}</span>
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
