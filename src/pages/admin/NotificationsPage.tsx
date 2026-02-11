import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, WhatsAppTemplateModal, PageLoading } from '../../components/common';
import {
  memberService,
  leadService,
  subscriptionService,
  slotService,
  membershipPlanService,
  settingsService,
  notificationLogService,
  whatsappService,
} from '../../services';
import { getDaysRemaining, formatDate, getToday } from '../../utils/dateUtils';
import { useFreshData } from '../../hooks';
import type { NotificationType, Member, Lead, MembershipSubscription, MembershipPlan, SessionSlot } from '../../types';

type TabType = 'pending' | 'sent' | 'all';

// Template selection context for notification
interface TemplateSelectionContext {
  notification: {
    id: string;
    type: NotificationType;
    recipientName: string;
    recipientPhone: string;
    recipientId: string;
    recipientType: 'member' | 'lead';
    details: string;
    isExpired?: boolean;
    member?: Member;
    lead?: Lead;
    subscription?: MembershipSubscription;
    plan?: MembershipPlan;
    slot?: SessionSlot;
  } | null;
}

export function NotificationsPage() {
  // Fetch fresh data from API on mount
  const { isLoading } = useFreshData(['members', 'leads', 'subscriptions', 'notification-logs']);

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [logsVersion, setLogsVersion] = useState(0); // Triggers re-render when logs change

  // Template selection modal state (single send)
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateContext, setTemplateContext] = useState<TemplateSelectionContext>({ notification: null });

  // Bulk template selection modal state
  const [bulkTemplateModalOpen, setBulkTemplateModalOpen] = useState(false);
  const [bulkNotificationType, setBulkNotificationType] = useState<'renewal-reminder' | 'lead-followup' | 'general-notification' | null>(null);

  // General notifications state
  const [generalSectionExpanded, setGeneralSectionExpanded] = useState(false);
  const [generalSelectedIds, setGeneralSelectedIds] = useState<Set<string>>(new Set());

  // Get notification logs (re-fetch when logsVersion changes)
  // Must be called before loading check to maintain hooks order
  const allLogs = useMemo(() => {
    if (isLoading) return [];
    return notificationLogService.getAll();
  }, [logsVersion, isLoading]);

  // Build pending notifications list (real-time from data)
  // Must be called before loading check to maintain hooks order
  const pendingNotifications = useMemo(() => {
    if (isLoading) return [];

    const settings = settingsService.getOrDefault();
    const renewalReminderDays = settings.renewalReminderDays || 7;
    const slots = slotService.getActive();
    const plans = membershipPlanService.getAll();

    // Get all expiring subscriptions (not yet expired)
    const allExpiringSubscriptions = subscriptionService.getExpiringSoon(renewalReminderDays);

    // Filter out members who already have a pending renewal OR have renewed (newer active subscription)
    const expiringSubscriptions = allExpiringSubscriptions.filter(expiring => {
      // Check if member has a pending renewal
      if (subscriptionService.hasPendingRenewal(expiring.memberId)) return false;

      // Check if member has a newer active subscription (already renewed)
      const allMemberSubs = subscriptionService.getByMember(expiring.memberId);
      const hasNewerActiveSub = allMemberSubs.some(sub =>
        sub.id !== expiring.id &&
        sub.status === 'active' &&
        new Date(sub.endDate) > new Date(expiring.endDate)
      );
      return !hasNewerActiveSub;
    });

    // Get recently expired subscriptions (last 7 days)
    const allExpiredSubscriptions = subscriptionService.getRecentlyExpired(7);
    const expiredSubscriptions = allExpiredSubscriptions.filter(expired => {
      // Check if member has a pending renewal
      if (subscriptionService.hasPendingRenewal(expired.memberId)) return false;

      // Check if member has any active subscription (already renewed)
      const allMemberSubs = subscriptionService.getByMember(expired.memberId);
      const hasActiveSub = allMemberSubs.some(sub =>
        sub.id !== expired.id &&
        sub.status === 'active'
      );
      return !hasActiveSub;
    });

    // Get pending leads (older than 2 days, not converted)
    const allLeads = leadService.getUnconverted();
    const twoBusinessDaysAgo = new Date();
    twoBusinessDaysAgo.setDate(twoBusinessDaysAgo.getDate() - 2);
    const pendingLeads = allLeads.filter(lead => {
      const createdAt = new Date(lead.createdAt);
      return createdAt < twoBusinessDaysAgo && lead.status !== 'converted';
    });

    const notifications: {
      id: string;
      type: NotificationType;
      recipientName: string;
      recipientPhone: string;
      recipientId: string;
      recipientType: 'member' | 'lead';
      details: string;
      isExpired?: boolean; // True if membership has already expired
      // Data needed for template generation
      member?: Member;
      lead?: Lead;
      subscription?: MembershipSubscription;
      plan?: MembershipPlan;
    }[] = [];

    const defaultPlan = { id: '', name: 'Unknown Plan', type: 'monthly' as const, price: 0, durationMonths: 1, isActive: true, allowedSessionTypes: ['offline' as const], createdAt: '', updatedAt: '' };

    // Renewal reminders (expiring soon) - sorted by expiry date (nearest first)
    [...expiringSubscriptions]
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .forEach(sub => {
        const member = memberService.getById(sub.memberId);
        const plan = plans.find(p => p.id === sub.planId);
        const slot = slots.find(s => s.id === sub.slotId);
        if (member) {
          const daysLeft = getDaysRemaining(sub.endDate);

          notifications.push({
            id: `renewal-${sub.id}`,
            type: 'renewal-reminder',
            recipientName: `${member.firstName} ${member.lastName}`,
            recipientPhone: member.phone,
            recipientId: member.id,
            recipientType: 'member',
            details: `Expires ${formatDate(sub.endDate)} (${daysLeft}d) • ${slot?.displayName || ''}`,
            isExpired: false,
            member,
            subscription: sub,
            plan: plan || defaultPlan,
          });
        }
      });

    // Expired reminders (expired in last 7 days) - sorted by most recently expired first
    [...expiredSubscriptions]
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
      .forEach(sub => {
        const member = memberService.getById(sub.memberId);
        const plan = plans.find(p => p.id === sub.planId);
        const slot = slots.find(s => s.id === sub.slotId);
        if (member) {
          const daysAgo = Math.abs(getDaysRemaining(sub.endDate));

          notifications.push({
            id: `expired-${sub.id}`,
            type: 'renewal-reminder',
            recipientName: `${member.firstName} ${member.lastName}`,
            recipientPhone: member.phone,
            recipientId: member.id,
            recipientType: 'member',
            details: `Expired ${formatDate(sub.endDate)} (${daysAgo}d ago) • ${slot?.displayName || ''}`,
            isExpired: true,
            member,
            subscription: sub,
            plan: plan || defaultPlan,
          });
        }
      });

    // Lead follow-ups
    pendingLeads.forEach(lead => {
      const daysSinceCreated = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      notifications.push({
        id: `lead-${lead.id}`,
        type: 'lead-followup',
        recipientName: `${lead.firstName} ${lead.lastName}`,
        recipientPhone: lead.phone,
        recipientId: lead.id,
        recipientType: 'lead',
        details: `Registered ${daysSinceCreated}d ago • ${lead.status}`,
        // Store data for template generation
        lead,
      });
    });

    return notifications;
  }, [isLoading]);

  // Build general notifications list (active members + recently expired within 15 days)
  const generalNotifications = useMemo(() => {
    if (isLoading) return [];

    const allMembers = memberService.getAll();
    const slots = slotService.getActive();
    const subscriptions = subscriptionService.getAll();
    const today = getToday();

    // Calculate date 15 days ago
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0];

    // Find unique member IDs with currently active subscriptions
    const activeMemberIds = new Set(
      subscriptions
        .filter(s => s.status === 'active' && s.startDate <= today && s.endDate >= today)
        .map(s => s.memberId)
    );

    // Find unique member IDs with recently expired subscriptions (last 15 days)
    const recentlyExpiredMemberIds = new Set(
      subscriptions
        .filter(s =>
          (s.status === 'expired' || (s.status === 'active' && s.endDate < today)) &&
          s.endDate >= fifteenDaysAgoStr &&
          !activeMemberIds.has(s.memberId) // exclude if they also have an active sub
        )
        .map(s => s.memberId)
    );

    // Combine both sets
    const eligibleMemberIds = new Set([...activeMemberIds, ...recentlyExpiredMemberIds]);
    const eligibleMembers = allMembers.filter(m => eligibleMemberIds.has(m.id));

    return eligibleMembers
      .map(member => {
        // Find active subscription, or most recent one for expired members
        const memberSub = subscriptions.find(
          sub => sub.memberId === member.id && sub.status === 'active' && sub.startDate <= today && sub.endDate >= today
        ) || subscriptions
          .filter(sub => sub.memberId === member.id && (sub.status === 'active' || sub.status === 'expired'))
          .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
        const slot = memberSub ? slots.find(s => s.id === memberSub.slotId) : undefined;
        const isExpired = !activeMemberIds.has(member.id);

        return {
          id: `general-${member.id}`,
          type: 'general-notification' as NotificationType,
          recipientName: `${member.firstName} ${member.lastName}`,
          recipientPhone: member.whatsappNumber || member.phone,
          recipientId: member.id,
          recipientType: 'member' as const,
          details: isExpired ? 'Expired' : (slot ? `${slot.displayName}` : 'No active slot'),
          isExpired,
          member,
          subscription: memberSub,
          slot,
        };
      })
      .sort((a, b) => a.recipientName.localeCompare(b.recipientName));
  }, [isLoading]);

  // Show loading state while fetching data
  if (isLoading) {
    return <PageLoading />;
  }

  // Derive filtered logs from allLogs
  const pendingLogs = allLogs.filter(log => log.status === 'pending');
  const sentLogs = allLogs.filter(log => log.status === 'sent');

  // Get settings and data for rendering
  const settings = settingsService.getOrDefault();
  const slots = slotService.getActive();
  const plans = membershipPlanService.getAll();

  // Handle send WhatsApp - open template selection modal
  const handleSendWhatsApp = (notification: typeof pendingNotifications[0]) => {
    setTemplateContext({ notification });
    setTemplateModalOpen(true);
  };

  // Generate WhatsApp link with selected template
  const generateLinkWithTemplate = (templateIndex: number, extraData?: { extraDays?: number }): string => {
    const notification = templateContext.notification;
    if (!notification) return '';

    if (notification.type === 'renewal-reminder' && notification.member && notification.subscription && notification.plan) {
      // Map filtered index to actual template index
      const actualIndex = getActualTemplateIndex(templateIndex);
      const result = whatsappService.generateRenewalReminder({
        member: notification.member,
        subscription: notification.subscription,
        plan: notification.plan,
        templateIndex: actualIndex,
      });

      // Log the notification when link is generated
      notificationLogService.create({
        type: 'renewal-reminder',
        recipientType: 'member',
        recipientId: notification.member.id,
        recipientName: `${notification.member.firstName} ${notification.member.lastName}`,
        recipientPhone: notification.member.phone,
        message: result.message,
        status: 'pending',
      });

      return result.link;
    }

    if (notification.type === 'lead-followup' && notification.lead) {
      const result = whatsappService.generateLeadFollowUp({
        lead: notification.lead,
        templateIndex,
      });

      // Log the notification when link is generated
      notificationLogService.create({
        type: 'lead-followup',
        recipientType: 'lead',
        recipientId: notification.lead.id,
        recipientName: `${notification.lead.firstName} ${notification.lead.lastName}`,
        recipientPhone: notification.lead.phone,
        message: result.message,
        status: 'pending',
      });

      return result.link;
    }

    if (notification.type === 'general-notification' && notification.member) {
      const result = whatsappService.generateGeneralNotification({
        member: notification.member,
        slot: notification.slot,
        subscription: notification.subscription,
        templateIndex,
        extraDays: extraData?.extraDays,
      });

      notificationLogService.create({
        type: 'general-notification',
        recipientType: 'member',
        recipientId: notification.member.id,
        recipientName: `${notification.member.firstName} ${notification.member.lastName}`,
        recipientPhone: notification.member.phone,
        message: result.message,
        status: 'pending',
      });

      return result.link;
    }

    return '';
  };

  // Get templates for current notification type
  // For renewal reminders: expired members get template #3 only, expiring members get #1 and #2
  const getTemplatesForNotification = () => {
    const notification = templateContext.notification;
    if (!notification) return [];

    if (notification.type === 'renewal-reminder') {
      const allTemplates = whatsappService.getRenewalReminderTemplates();
      if (notification.isExpired) {
        // Expired members: only template #3 (index 2)
        return allTemplates.slice(2, 3);
      } else {
        // Expiring members: templates #1 and #2 (index 0 and 1)
        return allTemplates.slice(0, 2);
      }
    }
    if (notification.type === 'lead-followup') {
      return whatsappService.getLeadFollowUpTemplates();
    }
    if (notification.type === 'general-notification') {
      return whatsappService.getGeneralNotificationTemplates();
    }
    return [];
  };

  // Get the actual template index to use (maps filtered index to real index)
  const getActualTemplateIndex = (filteredIndex: number): number => {
    const notification = templateContext.notification;
    if (notification?.type === 'renewal-reminder' && notification.isExpired) {
      // Expired members use template #3 (index 2)
      return 2;
    }
    return filteredIndex;
  };

  // Get modal title based on notification type
  const getTemplateModalTitle = () => {
    const notification = templateContext.notification;
    if (!notification) return 'Select Template';

    if (notification.type === 'renewal-reminder') {
      return notification.isExpired ? 'Send Expiry Reminder' : 'Send Renewal Reminder';
    }
    if (notification.type === 'lead-followup') {
      return 'Send Follow-up Message';
    }
    if (notification.type === 'general-notification') {
      return 'Send General Notification';
    }
    return 'Select Template';
  };

  // Handle mark as sent
  const handleMarkSent = (id: string) => {
    notificationLogService.markSent(id);
    setLogsVersion(v => v + 1); // Trigger re-render
  };

  // Handle cancel
  const handleCancel = (id: string) => {
    notificationLogService.cancel(id);
    setLogsVersion(v => v + 1); // Trigger re-render
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.size === pendingNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingNotifications.map(n => n.id)));
    }
  };

  // General notifications handlers
  const toggleGeneralSelection = (id: string) => {
    const newSelection = new Set(generalSelectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setGeneralSelectedIds(newSelection);
  };

  const selectAllGeneral = () => {
    if (generalSelectedIds.size === generalNotifications.length) {
      setGeneralSelectedIds(new Set());
    } else {
      setGeneralSelectedIds(new Set(generalNotifications.map(n => n.id)));
    }
  };

  const handleSendGeneralNotification = (notification: typeof generalNotifications[0]) => {
    setTemplateContext({ notification });
    setTemplateModalOpen(true);
  };

  const handleBulkSendGeneral = () => {
    setBulkNotificationType('general-notification');
    setBulkTemplateModalOpen(true);
  };

  // Get the notification type of selected items (for bulk send)
  const getSelectedNotificationType = (): 'renewal-reminder' | 'lead-followup' | 'mixed' | null => {
    const selected = pendingNotifications.filter(n => selectedIds.has(n.id));
    if (selected.length === 0) return null;

    const types = new Set(selected.map(n => n.type));
    if (types.size > 1) return 'mixed';
    return selected[0].type as 'renewal-reminder' | 'lead-followup';
  };

  // Open bulk template selection modal
  const handleBulkSend = () => {
    const notificationType = getSelectedNotificationType();
    if (notificationType === 'mixed') {
      // For mixed types, send with default template (can't pick one template for both types)
      executeBulkSend(0);
    } else if (notificationType) {
      setBulkNotificationType(notificationType);
      setBulkTemplateModalOpen(true);
    }
  };

  // Execute bulk send with selected template
  const executeBulkSend = (templateIndex: number, extraData?: { extraDays?: number }) => {
    const isGeneralBulk = bulkNotificationType === 'general-notification';
    const targetIds = isGeneralBulk ? generalSelectedIds : selectedIds;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetList: any[] = isGeneralBulk ? generalNotifications : pendingNotifications;

    targetList
      .filter((n: any) => targetIds.has(n.id))
      .forEach((n: any) => {
        let link = '';
        let message = '';

        if (n.type === 'renewal-reminder' && n.member && n.subscription && n.plan) {
          const result = whatsappService.generateRenewalReminder({
            member: n.member,
            subscription: n.subscription,
            plan: n.plan,
            templateIndex,
          });
          link = result.link;
          message = result.message;

          notificationLogService.create({
            type: 'renewal-reminder',
            recipientType: 'member',
            recipientId: n.member.id,
            recipientName: `${n.member.firstName} ${n.member.lastName}`,
            recipientPhone: n.member.phone,
            message,
            status: 'pending',
          });
        } else if (n.type === 'lead-followup' && n.lead) {
          const result = whatsappService.generateLeadFollowUp({
            lead: n.lead,
            templateIndex,
          });
          link = result.link;
          message = result.message;

          notificationLogService.create({
            type: 'lead-followup',
            recipientType: 'lead',
            recipientId: n.lead.id,
            recipientName: `${n.lead.firstName} ${n.lead.lastName}`,
            recipientPhone: n.lead.phone,
            message,
            status: 'pending',
          });
        } else if (n.type === 'general-notification' && n.member) {
          const result = whatsappService.generateGeneralNotification({
            member: n.member,
            slot: n.slot,
            subscription: n.subscription,
            templateIndex,
            extraDays: extraData?.extraDays,
          });
          link = result.link;
          message = result.message;

          notificationLogService.create({
            type: 'general-notification',
            recipientType: 'member',
            recipientId: n.member.id,
            recipientName: `${n.member.firstName} ${n.member.lastName}`,
            recipientPhone: n.member.phone,
            message,
            status: 'pending',
          });
        }

        if (link) {
          window.open(link, '_blank');
        }
      });

    if (isGeneralBulk) {
      setGeneralSelectedIds(new Set());
    } else {
      setSelectedIds(new Set());
    }
    setLogsVersion(v => v + 1);
  };

  // Generate bulk send link (called by modal)
  const handleBulkTemplateSelect = (templateIndex: number, extraData?: { extraDays?: number }): string => {
    executeBulkSend(templateIndex, extraData);
    setBulkTemplateModalOpen(false);
    setBulkNotificationType(null);
    return ''; // Return empty string - we handle the sending ourselves
  };

  // Get templates for bulk send
  const getBulkTemplates = () => {
    if (bulkNotificationType === 'renewal-reminder') {
      return whatsappService.getRenewalReminderTemplates();
    }
    if (bulkNotificationType === 'lead-followup') {
      return whatsappService.getLeadFollowUpTemplates();
    }
    if (bulkNotificationType === 'general-notification') {
      return whatsappService.getGeneralNotificationTemplates();
    }
    return [];
  };

  // Get bulk modal title
  const getBulkModalTitle = () => {
    if (bulkNotificationType === 'general-notification') {
      return `Send General Notifications (${generalSelectedIds.size} members)`;
    }
    const count = selectedIds.size;
    if (bulkNotificationType === 'renewal-reminder') {
      return `Send Renewal Reminders (${count} members)`;
    }
    if (bulkNotificationType === 'lead-followup') {
      return `Send Follow-ups (${count} leads)`;
    }
    return 'Select Template';
  };

  // Get badge color for notification type
  const getTypeBadge = (type: NotificationType, isExpired?: boolean) => {
    switch (type) {
      case 'renewal-reminder':
        return isExpired
          ? <Badge variant="error">Expired</Badge>
          : <Badge variant="warning">Renewal</Badge>;
      case 'class-reminder':
        return <Badge variant="info">Class</Badge>;
      case 'payment-confirmation':
        return <Badge variant="success">Payment</Badge>;
      case 'lead-followup':
        return <Badge variant="purple">Lead</Badge>;
      case 'general-notification':
        return <Badge variant="info">General</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Filter logs based on active tab
  const displayedLogs = activeTab === 'pending' ? pendingLogs : activeTab === 'sent' ? sentLogs : allLogs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Send WhatsApp messages to members and leads</p>
        </div>
        <Link to="/admin/settings">
          <Button variant="outline" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Edit Templates
          </Button>
        </Link>
      </div>

      {/* Pending Notifications */}
      <Card title="Pending Messages" subtitle={`${pendingNotifications.length} notifications ready to send`}>
        {pendingNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>All caught up! No pending notifications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bulk actions */}
            <div className="flex items-center justify-between pb-3 border-b">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pendingNotifications.length && pendingNotifications.length > 0}
                  onChange={selectAll}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">Select all</span>
              </label>
              {selectedIds.size > 0 && (
                <Button size="sm" onClick={handleBulkSend}>
                  Send Selected ({selectedIds.size})
                </Button>
              )}
            </div>

            {/* Renewal Reminders Section (Expiring Soon) */}
            {pendingNotifications.filter(n => n.type === 'renewal-reminder' && !n.isExpired).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Expiring Soon ({pendingNotifications.filter(n => n.type === 'renewal-reminder' && !n.isExpired).length})
                </h4>
                <div className="space-y-2">
                  {pendingNotifications
                    .filter(n => n.type === 'renewal-reminder' && !n.isExpired)
                    .map(notification => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        isSelected={selectedIds.has(notification.id)}
                        onToggle={() => toggleSelection(notification.id)}
                        onSend={() => handleSendWhatsApp(notification)}
                        getTypeBadge={getTypeBadge}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Expired Reminders Section (Expired in last 7 days) */}
            {pendingNotifications.filter(n => n.type === 'renewal-reminder' && n.isExpired).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Recently Expired ({pendingNotifications.filter(n => n.type === 'renewal-reminder' && n.isExpired).length})
                </h4>
                <div className="space-y-2">
                  {pendingNotifications
                    .filter(n => n.type === 'renewal-reminder' && n.isExpired)
                    .map(notification => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        isSelected={selectedIds.has(notification.id)}
                        onToggle={() => toggleSelection(notification.id)}
                        onSend={() => handleSendWhatsApp(notification)}
                        getTypeBadge={getTypeBadge}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Lead Follow-ups Section */}
            {pendingNotifications.filter(n => n.type === 'lead-followup').length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Lead Follow-ups ({pendingNotifications.filter(n => n.type === 'lead-followup').length})
                </h4>
                <div className="space-y-2">
                  {pendingNotifications
                    .filter(n => n.type === 'lead-followup')
                    .map(notification => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        isSelected={selectedIds.has(notification.id)}
                        onToggle={() => toggleSelection(notification.id)}
                        onSend={() => handleSendWhatsApp(notification)}
                        getTypeBadge={getTypeBadge}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* General Notifications - Collapsible */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setGeneralSectionExpanded(!generalSectionExpanded)}
          className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${generalSectionExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">General Notifications</h3>
              <p className="text-sm text-gray-500">Holiday announcements, review requests, welcome messages</p>
            </div>
          </div>
          <Badge variant="info">{generalNotifications.length} members</Badge>
        </button>

        {generalSectionExpanded && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100">
            {generalNotifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No members found.</p>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {/* Bulk actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generalSelectedIds.size === generalNotifications.length && generalNotifications.length > 0}
                      onChange={selectAllGeneral}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-600">Select all</span>
                  </label>
                  {generalSelectedIds.size > 0 && (
                    <Button size="sm" onClick={handleBulkSendGeneral}>
                      Send Selected ({generalSelectedIds.size})
                    </Button>
                  )}
                </div>

                {/* Member list */}
                <div className="space-y-2">
                  {generalNotifications.map(notification => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      isSelected={generalSelectedIds.has(notification.id)}
                      onToggle={() => toggleGeneralSelection(notification.id)}
                      onSend={() => handleSendGeneralNotification(notification)}
                      getTypeBadge={getTypeBadge}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification History */}
      <Card title="Message History">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'pending'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending ({pendingLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'sent'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sent ({sentLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All ({allLogs.length})
          </button>
        </div>

        {/* Logs list */}
        {displayedLogs.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No messages in this category</p>
        ) : (
          <div className="space-y-2">
            {displayedLogs.slice(0, 20).map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getTypeBadge(log.type)}
                  <div>
                    <p className="font-medium text-gray-900">{log.recipientName}</p>
                    <p className="text-xs text-gray-500">
                      {log.recipientPhone} • {formatDate(log.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {log.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleMarkSent(log.id)}>
                        Mark Sent
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleCancel(log.id)}>
                        Cancel
                      </Button>
                    </>
                  )}
                  {log.status === 'sent' && (
                    <Badge variant="success">Sent {log.sentAt ? formatDate(log.sentAt) : ''}</Badge>
                  )}
                  {log.status === 'cancelled' && (
                    <Badge variant="error">Cancelled</Badge>
                  )}
                </div>
              </div>
            ))}
            {displayedLogs.length > 20 && (
              <p className="text-center text-sm text-gray-500 pt-2">
                Showing first 20 of {displayedLogs.length} messages
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Template Selection Modal (Single) */}
      <WhatsAppTemplateModal
        isOpen={templateModalOpen}
        onClose={() => {
          setTemplateModalOpen(false);
          setTemplateContext({ notification: null });
          setLogsVersion(v => v + 1); // Refresh logs after modal closes
        }}
        templates={getTemplatesForNotification()}
        title={getTemplateModalTitle()}
        recipientName={templateContext.notification?.recipientName || ''}
        onSelect={generateLinkWithTemplate}
        showExtraDaysInput={templateContext.notification?.type === 'general-notification'
          ? (idx) => getTemplatesForNotification()[idx]?.name?.toLowerCase().includes('extra membership')
          : undefined
        }
      />

      {/* Bulk Template Selection Modal */}
      <WhatsAppTemplateModal
        isOpen={bulkTemplateModalOpen}
        onClose={() => {
          setBulkTemplateModalOpen(false);
          setBulkNotificationType(null);
          setLogsVersion(v => v + 1); // Refresh logs after modal closes
        }}
        templates={getBulkTemplates()}
        title={getBulkModalTitle()}
        recipientName={`${bulkNotificationType === 'general-notification' ? generalSelectedIds.size : selectedIds.size} recipients`}
        onSelect={handleBulkTemplateSelect}
        skipNavigation
        showExtraDaysInput={bulkNotificationType === 'general-notification'
          ? (idx) => getBulkTemplates()[idx]?.name?.toLowerCase().includes('extra membership')
          : undefined
        }
      />
    </div>
  );
}

// Notification row component
interface NotificationRowProps {
  notification: {
    id: string;
    type: NotificationType;
    recipientName: string;
    recipientPhone: string;
    recipientId: string;
    recipientType: 'member' | 'lead';
    details: string;
    isExpired?: boolean;
  };
  isSelected: boolean;
  onToggle: () => void;
  onSend: () => void;
  getTypeBadge: (type: NotificationType, isExpired?: boolean) => React.ReactNode;
}

function NotificationRow({ notification, isSelected, onToggle, onSend, getTypeBadge }: NotificationRowProps) {
  const detailLink = notification.recipientType === 'member'
    ? `/admin/members/${notification.recipientId}`
    : `/admin/leads/${notification.recipientId}`;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isSelected ? 'bg-indigo-50 border-indigo-200'
      : notification.isExpired ? 'bg-red-50 border-red-200'
      : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <div>
          <div className="flex items-center gap-2">
            <Link to={detailLink} className="font-medium text-gray-900 hover:text-indigo-600">
              {notification.recipientName}
            </Link>
            {getTypeBadge(notification.type, notification.isExpired)}
          </div>
          <p className="text-xs text-gray-500">
            {notification.recipientPhone} • {notification.details}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSend}>
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Send
        </Button>
      </div>
    </div>
  );
}
