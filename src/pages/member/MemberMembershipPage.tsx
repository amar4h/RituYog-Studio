import { useState, useMemo, useEffect } from 'react';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { useFreshData } from '../../hooks/useFreshData';
import {
  subscriptionService, slotService, membershipPlanService,
  invoiceService, paymentService, settingsService,
} from '../../services';
import { PageLoading } from '../../components/common/LoadingSpinner';
import { Card } from '../../components/common/Card';
import { formatCurrency } from '../../utils/formatUtils';
import { downloadInvoicePDF, generateInvoicePDF } from '../../utils/pdfUtils';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { Invoice } from '../../types';

export function MemberMembershipPage() {
  const { member, memberId, refreshMember } = useMemberAuth();

  // ALL HOOKS before loading check
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showPastSubs, setShowPastSubs] = useState(false);
  const [error, setError] = useState('');

  const { isLoading } = useFreshData([
    'members', 'subscriptions', 'invoices', 'payments', 'slots', 'plans',
  ]);

  useEffect(() => {
    if (!isLoading && !member && memberId) {
      refreshMember();
    }
  }, [isLoading, member, memberId, refreshMember]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Active subscription
  const activeSub = useMemo(() => {
    if (!member) return null;
    const subs = subscriptionService.getAll().filter(
      s => s.memberId === member.id &&
        (s.status === 'active' || s.status === 'expired') &&
        s.startDate <= today
    );
    return subs.sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;
  }, [member, today]);

  // All subscriptions (for history)
  const allSubs = useMemo(() => {
    if (!member) return [];
    return subscriptionService.getByMember(member.id)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [member]);

  const pastSubs = useMemo(() => {
    return allSubs.filter(s => s.id !== activeSub?.id);
  }, [allSubs, activeSub]);

  // All invoices for member
  const invoices = useMemo(() => {
    if (!member) return [];
    return invoiceService.getByMember(member.id)
      .sort((a, b) => (b.invoiceDate || b.createdAt).localeCompare(a.invoiceDate || a.createdAt));
  }, [member]);

  // Check Web Share API availability
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;

  const handleDownload = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    setError('');
    try {
      const sub = invoice.subscriptionId ? subscriptionService.getById(invoice.subscriptionId) : null;
      const plan = sub?.planId ? membershipPlanService.getById(sub.planId) : null;
      const pmts = paymentService.getByInvoice(invoice.id);
      const settings = settingsService.getOrDefault();
      await downloadInvoicePDF({ invoice, member, subscription: sub, plan, payments: pmts, settings });
    } catch {
      setError('Failed to download invoice');
    }
    setDownloadingId(null);
  };

  const handleShare = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    setError('');
    try {
      const sub = invoice.subscriptionId ? subscriptionService.getById(invoice.subscriptionId) : null;
      const plan = sub?.planId ? membershipPlanService.getById(sub.planId) : null;
      const pmts = paymentService.getByInvoice(invoice.id);
      const settings = settingsService.getOrDefault();
      const blob = await generateInvoicePDF({ invoice, member, subscription: sub, plan, payments: pmts, settings });
      const file = new File([blob], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${invoice.invoiceNumber}` });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Failed to share invoice');
      }
    }
    setDownloadingId(null);
  };

  if (isLoading) return <PageLoading />;

  if (!member) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        No member data available.
      </div>
    );
  }

  const daysRemaining = activeSub
    ? Math.max(0, differenceInDays(parseISO(activeSub.endDate), new Date()))
    : 0;
  const activeSlot = activeSub?.slotId ? slotService.getById(activeSub.slotId) : null;
  const activePlan = activeSub?.planId ? membershipPlanService.getById(activeSub.planId) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Membership</h1>

      {/* Current subscription */}
      {activeSub ? (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Current Plan</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                activeSub.status === 'active'
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600'
              }`}>
                {activeSub.status === 'active' ? 'Active' : 'Expired'}
              </span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold text-gray-900">
                {activePlan?.name || 'Membership'}
              </div>
              <div className={`text-lg font-black ${daysRemaining <= 7 ? 'text-amber-600' : 'bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                {daysRemaining}<span className="text-xs font-normal text-gray-500 ml-1">days left</span>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Batch</span>
                <span className="text-gray-900 font-medium whitespace-nowrap">
                  {activeSlot?.displayName || activeSub.slotId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Period</span>
                <span className="text-gray-900 whitespace-nowrap">
                  {format(parseISO(activeSub.startDate), 'd MMM')} – {format(parseISO(activeSub.endDate), 'd MMM yyyy')}
                </span>
              </div>
              {activePlan && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(activePlan.price)}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-6 text-center text-sm text-gray-500">
            No active subscription found.
          </div>
        </Card>
      )}

      {/* Invoices */}
      <Card>
        <div className="p-4">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Invoices</h2>

          {error && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          {invoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No invoices found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map(inv => {
                const paid = inv.amountPaid >= inv.totalAmount;
                return (
                  <div key={inv.id} className="py-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {paid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <span className="whitespace-nowrap">
                            {format(parseISO(inv.invoiceDate || inv.createdAt), 'd MMM yyyy')}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span>{formatCurrency(inv.totalAmount)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        {canShare && (
                          <button
                            onClick={() => handleShare(inv)}
                            disabled={downloadingId === inv.id}
                            className="p-2.5 text-gray-400 hover:text-gray-600 rounded-xl active:scale-90 transition-all duration-200"
                            title="Share"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                          </button>
                        )}

                        <button
                          onClick={() => handleDownload(inv)}
                          disabled={downloadingId === inv.id}
                          className="p-2.5 text-indigo-600 hover:text-indigo-800 rounded-xl active:scale-90 transition-all duration-200"
                          title="Download PDF"
                        >
                          {downloadingId === inv.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Past subscriptions */}
      {pastSubs.length > 0 && (
        <Card>
          <div className="p-4">
            <button
              onClick={() => setShowPastSubs(!showPastSubs)}
              className="w-full flex items-center justify-between text-sm"
            >
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Past Subscriptions ({pastSubs.length})
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${showPastSubs ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPastSubs && (
              <div className="mt-3 space-y-2">
                {pastSubs.map(sub => {
                  const plan = sub.planId ? membershipPlanService.getById(sub.planId) : null;
                  const subSlot = sub.slotId ? slotService.getById(sub.slotId) : null;
                  return (
                    <div key={sub.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{plan?.name || 'Membership'}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>{subSlot?.displayName || sub.slotId}</div>
                        <div className="whitespace-nowrap">
                          {format(parseISO(sub.startDate), 'd MMM yyyy')} – {format(parseISO(sub.endDate), 'd MMM yyyy')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
