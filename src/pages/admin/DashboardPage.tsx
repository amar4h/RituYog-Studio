import { Card } from '../../components/common';
import { formatCurrency } from '../../utils/formatUtils';
import {
  memberService,
  leadService,
  subscriptionService,
  paymentService,
  slotService,
  slotSubscriptionService,
} from '../../services';
import { getToday, getCurrentMonthRange } from '../../utils/dateUtils';

export function DashboardPage() {
  // Get data for stats
  const members = memberService.getAll();
  const activeMembers = members.filter(m => m.status === 'active');
  const leads = leadService.getPending();
  const expiringSubscriptions = subscriptionService.getExpiringSoon(7);
  const slots = slotService.getActive();

  // Calculate revenue
  const { start, end } = getCurrentMonthRange();
  const monthlyRevenue = paymentService.getRevenue(start, end);

  // Calculate slot utilization
  const today = getToday();

  // Get all active subscriptions to count members per slot
  const allSubscriptions = subscriptionService.getAll();
  const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active');

  const slotUtilization = slots.map(slot => {
    // Method 1: Count active members assigned to this slot
    const membersAssignedToSlot = activeMembers.filter(m => m.assignedSlotId === slot.id).length;
    // Method 2: Count active subscriptions for this slot
    const subscribersWithActiveSubscription = activeSubscriptions.filter(s => s.slotId === slot.id).length;
    // Method 3: Check slot subscriptions as fallback
    const slotSubscribers = slotSubscriptionService.getActiveForSlot(slot.id);
    // Use the highest count (in case data is in different places)
    const subscriberCount = Math.max(membersAssignedToSlot, subscribersWithActiveSubscription, slotSubscribers.length);
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
        <Card title="Expiring Memberships" subtitle="Next 7 days">
          {expiringSubscriptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No memberships expiring in the next 7 days
            </p>
          ) : (
            <div className="space-y-3">
              {expiringSubscriptions.slice(0, 5).map(subscription => {
                const member = memberService.getById(subscription.memberId);
                return (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {member?.firstName} {member?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires: {subscription.endDate}
                      </p>
                    </div>
                    <a
                      href={`/admin/members/${subscription.memberId}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      View →
                    </a>
                  </div>
                );
              })}
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
