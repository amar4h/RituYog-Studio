import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, Button, StatusBadge, Alert, Modal, PageLoading } from '../../components/common';
import { invoiceService, memberService, paymentService, subscriptionService, membershipPlanService, settingsService, whatsappService } from '../../services';
import { useFreshData } from '../../hooks';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDate } from '../../utils/dateUtils';
import { downloadInvoicePDF, getInvoicePDFUrl, generateInvoicePDF } from '../../utils/pdfUtils';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading } = useFreshData(['invoices', 'members', 'subscriptions', 'payments']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);

  // Check if Web Share API with files is supported
  const canShareFiles = typeof navigator !== 'undefined' &&
    navigator.share !== undefined &&
    navigator.canShare !== undefined;

  const invoice = !isLoading && id ? invoiceService.getById(id) : null;
  const member = invoice ? memberService.getById(invoice.memberId) : null;
  const payments = invoice ? paymentService.getByInvoice(invoice.id) : [];
  const subscription = invoice?.subscriptionId
    ? subscriptionService.getById(invoice.subscriptionId)
    : null;
  const plan = subscription
    ? membershipPlanService.getById(subscription.planId)
    : null;

  const balance = invoice ? invoice.totalAmount - invoice.amountPaid : 0;

  // Generate PDF preview on mount
  useEffect(() => {
    if (!invoice) return;

    const generatePdf = async () => {
      setLoadingPdf(true);
      try {
        const settings = settingsService.getOrDefault();
        const url = await getInvoicePDFUrl({
          invoice,
          member,
          subscription,
          plan,
          payments,
          settings,
        });
        setPdfUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate PDF preview');
      } finally {
        setLoadingPdf(false);
      }
    };

    generatePdf();

    // Cleanup URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [invoice?.id]); // Re-generate when invoice changes

  if (isLoading) {
    return <PageLoading />;
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Invoice not found</h2>
        <p className="text-gray-600 mt-2">The invoice you're looking for doesn't exist.</p>
        <Link to="/admin/invoices" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
          ← Back to Invoices
        </Link>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setError('');
    try {
      const settings = settingsService.getOrDefault();
      await downloadInvoicePDF({
        invoice,
        member,
        subscription,
        plan,
        payments,
        settings,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleSharePDF = async () => {
    if (!canShareFiles) {
      setError('Sharing is not supported on this device');
      return;
    }

    setSharing(true);
    setError('');
    try {
      const settings = settingsService.getOrDefault();
      const blob = await generateInvoicePDF({
        invoice,
        member,
        subscription,
        plan,
        payments,
        settings,
      });

      const file = new File([blob], `${invoice.invoiceNumber}.pdf`, {
        type: 'application/pdf',
      });

      // Check if can share this file
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${invoice.invoiceNumber}`,
          text: member
            ? `Invoice for ${member.firstName} ${member.lastName} - ${formatCurrency(invoice.totalAmount)}`
            : `Invoice ${invoice.invoiceNumber}`,
        });
      } else {
        setError('File sharing is not supported on this device');
      }
    } catch (err) {
      // User cancelled share is not an error
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to share PDF');
    } finally {
      setSharing(false);
    }
  };

  const handleDelete = () => {
    try {
      // Delete associated payments first
      payments.forEach(payment => {
        paymentService.delete(payment.id);
      });

      // Delete the invoice
      invoiceService.delete(invoice.id);

      // Navigate back to invoices list
      navigate('/admin/invoices');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/admin/invoices" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Invoice {invoice.invoiceNumber}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={invoice.status} />
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{formatDate(invoice.invoiceDate)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status !== 'paid' && balance > 0 && (
            <Link to="/admin/payments/record" state={{ invoiceId: invoice.id }}>
              <Button>Record Payment</Button>
            </Link>
          )}
          {member && invoice.status === 'paid' && payments.length > 0 && (
            <a
              href={whatsappService.generatePaymentConfirmation({
                member,
                payment: payments[0],
                invoice,
                plan: plan || { name: 'Membership' } as any,
              }).link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
              title="Send payment receipt"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send Receipt
            </a>
          )}
          {member && invoice.status !== 'paid' && (
            <a
              href={whatsappService.generateLink(
                member.phone,
                `Hi ${member.firstName}, this is a reminder about your pending payment of ${formatCurrency(balance)} for invoice #${invoice.invoiceNumber}. Please complete the payment at your earliest convenience. - ${settingsService.getOrDefault().studioName}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
              title="Send payment reminder"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send Reminder
            </a>
          )}
          {canShareFiles && (
            <Button variant="outline" onClick={handleSharePDF} loading={sharing}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF} loading={downloading}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Preview - Main Area */}
        <div className="lg:col-span-2">
          <Card title="Invoice Preview">
            {loadingPdf ? (
              <div className="flex items-center justify-center h-[800px] bg-gray-50 rounded-lg">
                <div className="text-center">
                  <svg className="animate-spin h-8 w-8 mx-auto text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="mt-2 text-gray-600">Generating PDF preview...</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[800px] border border-gray-200 rounded-lg"
                title="Invoice PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-[800px] bg-gray-50 rounded-lg">
                <div className="text-center">
                  <svg className="h-12 w-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-gray-600">Failed to load PDF preview</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card title="Summary">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Status</span>
                  <StatusBadge status={invoice.status} />
                </div>
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </p>
                </div>
                {balance > 0 && (
                  <div className="text-center py-2 bg-red-50 rounded-lg mt-2">
                    <p className="text-sm text-red-600">Balance Due</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(balance)}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Date</span>
                  <span className="text-gray-900">{formatDate(invoice.invoiceDate)}</span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Due Date</span>
                    <span className="text-gray-900">{formatDate(invoice.dueDate)}</span>
                  </div>
                )}
                {invoice.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid Date</span>
                    <span className="text-green-600">{formatDate(invoice.paidDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Member Info */}
          {member && (
            <Card title="Member">
              <div className="space-y-2">
                <Link
                  to={`/admin/members/${member.id}`}
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {member.firstName} {member.lastName}
                </Link>
                <p className="text-sm text-gray-600">{member.email}</p>
              </div>
            </Card>
          )}

          {subscription && plan && (
            <Card title="Subscription">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-medium text-gray-900">{plan.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Period</p>
                  <p className="text-gray-900">
                    {subscription.startDate} to {subscription.endDate}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <StatusBadge status={subscription.status} />
                </div>
              </div>
            </Card>
          )}

          {/* Payment History */}
          <Card title="Payments">
            {payments.length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {payments.map(payment => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {balance > 0 && (
            <Link to="/admin/payments/record" state={{ invoiceId: invoice.id }}>
              <Button fullWidth>
                Record Payment
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Invoice"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete invoice{' '}
            <span className="font-semibold text-gray-900">
              {invoice.invoiceNumber}
            </span>
            ?
          </p>
          {payments.length > 0 && (
            <p className="text-amber-600 text-sm">
              This invoice has {payments.length} payment(s) recorded. They will also be deleted.
            </p>
          )}
          <p className="text-sm text-red-600">
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Invoice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
