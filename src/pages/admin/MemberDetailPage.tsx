import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, Button, StatusBadge, Badge, ConfirmDialog, Alert, Modal, Input, Select, WhatsAppTemplateModal } from '../../components/common';
import {
  memberService,
  subscriptionService,
  invoiceService,
  paymentService,
  attendanceService,
  slotService,
  settingsService,
  whatsappService,
  membershipPlanService,
} from '../../services';
import { formatCurrency, formatPhone, formatName } from '../../utils/formatUtils';
import { formatDate, getDaysRemaining, getMonthStart, getMonthEnd, getToday } from '../../utils/dateUtils';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Extra days modal state
  const [showExtraDaysModal, setShowExtraDaysModal] = useState(false);
  const [extraDays, setExtraDays] = useState(0);
  const [extraDaysReason, setExtraDaysReason] = useState('');

  // Batch transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSlotId, setTransferSlotId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Renewal reminder template modal state
  const [showRenewalTemplateModal, setShowRenewalTemplateModal] = useState(false);

  const member = id ? memberService.getById(id) : null;

  if (!member) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Member not found</h2>
        <p className="text-gray-600 mt-2">The member you're looking for doesn't exist.</p>
        <Link to="/admin/members" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
          ← Back to Members
        </Link>
      </div>
    );
  }

  const subscription = subscriptionService.getActiveMemberSubscription(member.id);
  const invoices = invoiceService.getByMember(member.id);
  const payments = paymentService.getByMember(member.id);

  // Attendance data
  const attendanceRecords = attendanceService.getByMember(member.id);
  const recentAttendance = attendanceRecords.slice(0, 10);

  // Get this month's attendance summary if member has an assigned slot
  const memberSlot = member.assignedSlotId ? slotService.getById(member.assignedSlotId) : null;
  const monthStart = getMonthStart();
  const monthEnd = getMonthEnd();
  const monthSummary = member.assignedSlotId
    ? attendanceService.getMemberSummaryForPeriod(member.id, member.assignedSlotId, monthStart, monthEnd)
    : null;
  const attendanceRate = monthSummary && monthSummary.totalWorkingDays > 0
    ? Math.round((monthSummary.presentDays / monthSummary.totalWorkingDays) * 100)
    : 0;

  // Get all slots for transfer
  const allSlots = slotService.getActive();

  const handleDelete = () => {
    try {
      memberService.delete(member.id);
      navigate('/admin/members');
    } catch (err) {
      setError('Failed to delete member');
    }
  };

  const handleAddExtraDays = () => {
    if (!subscription || extraDays <= 0) return;

    try {
      subscriptionService.extendSubscription(subscription.id, extraDays, extraDaysReason || undefined);
      setSuccess(`Added ${extraDays} extra days to subscription`);
      setShowExtraDaysModal(false);
      setExtraDays(0);
      setExtraDaysReason('');
      // Force re-render by navigating to the same page
      navigate(`/admin/members/${member.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add extra days');
    }
  };

  const handleTransferSlot = () => {
    if (!subscription || !transferSlotId) return;

    try {
      const result = subscriptionService.transferSlot(
        subscription.id,
        transferSlotId,
        getToday(),
        transferReason || undefined
      );
      setSuccess(`Member transferred to new slot successfully${result.warning ? `. ${result.warning}` : ''}`);
      setShowTransferModal(false);
      setTransferSlotId('');
      setTransferReason('');
      navigate(`/admin/members/${member.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer slot');
    }
  };

  const daysRemaining = subscription ? getDaysRemaining(subscription.endDate) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/admin/members" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Members
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {formatName(member.firstName, member.lastName)}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={member.status} />
            {member.source && (
              <Badge variant="outline">{member.source}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/members/${member.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contact Info */}
        <Card title="Contact Information">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-gray-900">
                <a href={`mailto:${member.email}`} className="text-indigo-600 hover:text-indigo-700">
                  {member.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-gray-900 flex items-center gap-2">
                {formatPhone(member.phone)}
                <a
                  href={whatsappService.generateLink(member.phone, `Hi ${member.firstName}, this is ${settingsService.getOrDefault().studioName}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                  title="Send WhatsApp message"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              </dd>
            </div>
            {member.address && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-gray-900">{member.address}</dd>
              </div>
            )}
            {member.age && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Age</dt>
                <dd className="mt-1 text-gray-900">{member.age} years</dd>
              </div>
            )}
            {member.emergencyContact && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                <dd className="mt-1 text-gray-900">
                  {member.emergencyContact.name} - {formatPhone(member.emergencyContact.phone)}
                  {member.emergencyContact.relationship && (
                    <span className="text-gray-500"> ({member.emergencyContact.relationship})</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </Card>


        {/* Membership Status */}
        <Card title="Membership">
          {subscription ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                daysRemaining && daysRemaining <= 7 ? 'bg-yellow-50' : 'bg-green-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {subscription.status === 'active' ? 'Active' : 'Expired'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
                    </p>
                  </div>
                  <StatusBadge status={subscription.paymentStatus} />
                </div>
                {daysRemaining !== null && daysRemaining > 0 && (
                  <p className={`text-sm mt-2 ${
                    daysRemaining <= 7 ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    {daysRemaining} days remaining
                  </p>
                )}
              </div>
              <div className="text-sm">
                <p className="text-gray-600">
                  Amount: {formatCurrency(subscription.payableAmount)}
                </p>
                {subscription.discountAmount > 0 && (
                  <p className="text-green-600">
                    Discount: {formatCurrency(subscription.discountAmount)}
                  </p>
                )}
                {subscription.extensionDays && subscription.extensionDays > 0 && (
                  <p className="text-indigo-600">
                    +{subscription.extensionDays} extra days added
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Link to="/admin/subscriptions/new" state={{ memberId: member.id, isRenewal: true }}>
                  <Button variant="outline" fullWidth>
                    {subscription.status === 'expired' ? 'Renew Membership' : 'Extend Membership'}
                  </Button>
                </Link>
                {daysRemaining !== null && daysRemaining <= 7 && (
                  <button
                    onClick={() => setShowRenewalTemplateModal(true)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Send Renewal Reminder
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExtraDaysModal(true)}
                  >
                    + Extra Days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTransferSlotId('');
                      setShowTransferModal(true);
                    }}
                  >
                    Transfer Slot
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No active membership</p>
              <Link to="/admin/subscriptions/new" state={{ memberId: member.id }}>
                <Button size="sm" className="mt-2">
                  Create Subscription
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Medical Conditions */}
      {member.medicalConditions && member.medicalConditions.length > 0 && (
        <Card title="Medical Conditions">
          <div className="space-y-2">
            {member.medicalConditions.map((condition, index) => (
              <div key={index} className="p-3 bg-red-50 rounded-lg">
                <p className="font-medium text-red-900">{condition.condition}</p>
                {condition.details && (
                  <p className="text-sm text-red-700 mt-1">{condition.details}</p>
                )}
                <p className="text-xs text-red-600 mt-1">
                  Reported: {formatDate(condition.reportedDate)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attendance History */}
      <Card title="Attendance History">
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Total Classes Attended</p>
              <p className="text-2xl font-bold text-gray-900">{member.classesAttended || 0}</p>
            </div>
            {monthSummary && (
              <>
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {monthSummary.presentDays} / {monthSummary.totalWorkingDays}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Attendance Rate</p>
                  <p className={`text-2xl font-bold ${
                    attendanceRate >= 80 ? 'text-green-600' :
                    attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {attendanceRate}%
                  </p>
                </div>
              </>
            )}
            {memberSlot && (
              <div>
                <p className="text-sm text-gray-500">Assigned Slot</p>
                <p className="text-lg font-medium text-gray-900">{memberSlot.displayName}</p>
              </div>
            )}
          </div>

          {/* Recent Attendance */}
          {recentAttendance.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No attendance records yet</p>
          ) : (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Attendance</h4>
              <div className="space-y-2">
                {recentAttendance.map(record => {
                  const slot = slotService.getById(record.slotId);
                  return (
                    <div
                      key={record.id}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        record.status === 'present' ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(record.date)}
                        </p>
                        <p className="text-xs text-gray-500">{slot?.displayName || 'Unknown slot'}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        record.status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Link to Attendance Page */}
          <div className="pt-2">
            <Link to="/admin/attendance">
              <Button variant="outline" size="sm">
                Go to Attendance Page
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Payment & Invoice History - Side by side on xl screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Payment History */}
        <Card title="Payment History">
          {payments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No payments recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.slice(0, 5).map(payment => (
                    <tr key={payment.id}>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600 capitalize">
                        {payment.paymentMethod}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={payment.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Invoice History */}
        <Card title="Invoice History">
          {invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No invoices generated</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.slice(0, 5).map(invoice => (
                    <tr key={invoice.id}>
                      <td className="px-3 py-2 text-sm font-mono text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-3 py-2">
                        <Link to={`/admin/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Member"
        message={`Are you sure you want to delete ${formatName(member.firstName, member.lastName)}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Extra Days Modal */}
      <Modal
        isOpen={showExtraDaysModal}
        onClose={() => {
          setShowExtraDaysModal(false);
          setExtraDays(0);
          setExtraDaysReason('');
        }}
        title="Add Extra Days"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Add extra days to the current subscription. This extends the end date without creating a new subscription.
          </p>
          {subscription && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p><span className="text-gray-500">Current end date:</span> {formatDate(subscription.endDate)}</p>
              {extraDays > 0 && (
                <p className="text-green-600 mt-1">
                  New end date: {formatDate(
                    new Date(new Date(subscription.endDate).getTime() + extraDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  )}
                </p>
              )}
            </div>
          )}
          <Input
            label="Number of Days"
            type="number"
            min={1}
            max={365}
            value={extraDays || ''}
            onChange={(e) => setExtraDays(parseInt(e.target.value) || 0)}
            placeholder="Enter number of days"
          />
          <Input
            label="Reason (Optional)"
            value={extraDaysReason}
            onChange={(e) => setExtraDaysReason(e.target.value)}
            placeholder="e.g., Holiday closure, Medical leave"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowExtraDaysModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExtraDays} disabled={extraDays <= 0}>
              Add {extraDays || 0} Days
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferSlotId('');
          setTransferReason('');
        }}
        title="Transfer to Different Slot"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Move this member to a different session slot. The transfer will take effect immediately.
          </p>
          {memberSlot && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p><span className="text-gray-500">Current slot:</span> {memberSlot.displayName}</p>
              <p className="text-gray-400 text-xs">{memberSlot.startTime} - {memberSlot.endTime}</p>
            </div>
          )}
          <Select
            label="New Session Slot"
            value={transferSlotId}
            onChange={(e) => setTransferSlotId(e.target.value)}
            options={[
              { value: '', label: 'Select a slot...' },
              ...allSlots
                .filter(s => s.id !== member.assignedSlotId)
                .map(s => {
                  const capacityCheck = subscription
                    ? subscriptionService.checkSlotCapacity(s.id, getToday(), subscription.endDate)
                    : null;
                  const capacityStatus = capacityCheck
                    ? capacityCheck.available
                      ? capacityCheck.isExceptionOnly
                        ? ' (Exception only)'
                        : ''
                      : ' (Full)'
                    : '';
                  return {
                    value: s.id,
                    label: `${s.displayName} (${s.startTime} - ${s.endTime})${capacityStatus}`,
                    disabled: capacityCheck ? !capacityCheck.available : false,
                  };
                }),
            ]}
          />
          <Input
            label="Reason (Optional)"
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            placeholder="e.g., Schedule change, Personal preference"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransferSlot} disabled={!transferSlotId}>
              Transfer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Renewal Reminder Template Modal */}
      {subscription && (
        <WhatsAppTemplateModal
          isOpen={showRenewalTemplateModal}
          onClose={() => setShowRenewalTemplateModal(false)}
          templates={whatsappService.getRenewalReminderTemplates()}
          title="Send Renewal Reminder"
          recipientName={formatName(member.firstName, member.lastName)}
          onSelect={(templateIndex) =>
            whatsappService.generateRenewalReminder({
              member,
              subscription,
              plan: membershipPlanService.getById(subscription.planId) || { name: 'Membership' } as any,
              templateIndex,
            }).link
          }
        />
      )}
    </div>
  );
}
