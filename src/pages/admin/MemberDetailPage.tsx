import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, Button, StatusBadge, Badge, ConfirmDialog, Alert } from '../../components/common';
import {
  memberService,
  subscriptionService,
  invoiceService,
  paymentService,
  attendanceService,
  slotService,
} from '../../services';
import { formatCurrency, formatPhone, formatName } from '../../utils/formatUtils';
import { formatDate, getDaysRemaining, getMonthStart, getMonthEnd } from '../../utils/dateUtils';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

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

  const handleDelete = () => {
    try {
      memberService.delete(member.id);
      navigate('/admin/members');
    } catch (err) {
      setError('Failed to delete member');
    }
  };

  const daysRemaining = subscription ? getDaysRemaining(subscription.endDate) : null;

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <dd className="mt-1 text-gray-900">{formatPhone(member.phone)}</dd>
            </div>
            {member.address && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-gray-900">{member.address}</dd>
              </div>
            )}
            {member.dateOfBirth && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd className="mt-1 text-gray-900">{formatDate(member.dateOfBirth)}</dd>
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
              </div>
              <Link to="/admin/subscriptions/new" state={{ memberId: member.id }}>
                <Button variant="outline" fullWidth>
                  {subscription.status === 'expired' ? 'Renew Membership' : 'Extend Membership'}
                </Button>
              </Link>
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

      {/* Payment History */}
      <Card title="Payment History">
        {payments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No payments recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.slice(0, 5).map(payment => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {payment.receiptNumber || '-'}
                    </td>
                    <td className="px-4 py-3">
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.slice(0, 5).map(invoice => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatCurrency(invoice.amountPaid)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3">
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
    </div>
  );
}
