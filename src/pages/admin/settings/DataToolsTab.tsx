import { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Alert, StatusBadge } from '../../../components/common';
import { invoiceService, paymentService, memberService, subscriptionService, isApiMode } from '../../../services';
import { formatDate } from '../../../utils/dateUtils';
import { formatCurrency } from '../../../utils/formatUtils';
import type { Invoice } from '../../../types';
import type { SettingsTabProps } from './types';

export function DataToolsTab(_props: SettingsTabProps) {
  const [dtSearch, setDtSearch] = useState('');
  const [dtStatusFilter, setDtStatusFilter] = useState('');
  const [dtDateFrom, setDtDateFrom] = useState('');
  const [dtDateTo, setDtDateTo] = useState('');
  const [dtSortCol, setDtSortCol] = useState<string>('invDate');
  const [dtSortDir, setDtSortDir] = useState<'asc' | 'desc'>('desc');
  const [dtInvoices, setDtInvoices] = useState<Invoice[]>([]);
  const [dtEditingId, setDtEditingId] = useState<string | null>(null);
  const [dtInvNumber, setDtInvNumber] = useState('');
  const [dtInvDate, setDtInvDate] = useState('');
  const [dtDueDate, setDtDueDate] = useState('');
  const [dtStatus, setDtStatus] = useState('');
  const [dtPaymentDate, setDtPaymentDate] = useState('');
  const [dtPaymentMode, setDtPaymentMode] = useState('');
  const [dtSaving, setDtSaving] = useState(false);
  const [dtError, setDtError] = useState('');
  const [dtSuccess, setDtSuccess] = useState('');
  const [dtRefreshKey, setDtRefreshKey] = useState(0);

  // Load invoices
  useEffect(() => {
    if (isApiMode()) {
      invoiceService.async.getAll().then(setDtInvoices).catch(console.error);
    } else {
      setDtInvoices(invoiceService.getAll());
    }
  }, [dtRefreshKey]);

  // Filter & sort invoices
  const dtFiltered = useMemo(() => {
    const filtered = dtInvoices.filter(inv => {
      const member = memberService.getById(inv.memberId);
      const memberName = member ? `${member.firstName} ${member.lastName}` : '';
      const matchesSearch = !dtSearch ||
        inv.invoiceNumber.toLowerCase().includes(dtSearch.toLowerCase()) ||
        memberName.toLowerCase().includes(dtSearch.toLowerCase());
      const matchesStatus = !dtStatusFilter || inv.status === dtStatusFilter;
      const matchesDateFrom = !dtDateFrom || inv.invoiceDate >= dtDateFrom;
      const matchesDateTo = !dtDateTo || inv.invoiceDate <= dtDateTo;
      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });

    const getSortValue = (inv: Invoice): string | number => {
      switch (dtSortCol) {
        case 'invNumber': return inv.invoiceNumber;
        case 'member': {
          const m = memberService.getById(inv.memberId);
          return m ? `${m.firstName} ${m.lastName}` : '';
        }
        case 'amount': return inv.totalAmount;
        case 'invDate': return inv.invoiceDate;
        case 'dueDate': return inv.dueDate;
        case 'status': return inv.status;
        case 'payDate': {
          const p = paymentService.getByInvoice(inv.id);
          return p[0]?.paymentDate || '';
        }
        case 'payMode': {
          const p = paymentService.getByInvoice(inv.id);
          return p[0]?.paymentMethod || '';
        }
        default: return inv.invoiceDate;
      }
    };

    return filtered.sort((a, b) => {
      const aVal = getSortValue(a);
      const bVal = getSortValue(b);
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return dtSortDir === 'asc' ? cmp : -cmp;
    });
  }, [dtInvoices, dtSearch, dtStatusFilter, dtDateFrom, dtDateTo, dtSortCol, dtSortDir]);

  function handleDtSort(col: string) {
    if (dtSortCol === col) {
      setDtSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setDtSortCol(col);
      setDtSortDir('asc');
    }
  }

  function handleDtEdit(inv: Invoice) {
    setDtEditingId(inv.id);
    setDtInvNumber(inv.invoiceNumber);
    setDtInvDate(inv.invoiceDate);
    setDtDueDate(inv.dueDate);
    setDtStatus(inv.status);
    setDtError('');
    const payments = paymentService.getByInvoice(inv.id);
    const payment = payments[0];
    setDtPaymentDate(payment?.paymentDate || '');
    setDtPaymentMode(payment?.paymentMethod || '');
  }

  function handleDtCancel() {
    setDtEditingId(null);
    setDtError('');
  }

  async function handleDtSave(invId: string) {
    setDtSaving(true);
    setDtError('');
    try {
      if (!dtInvNumber.trim()) throw new Error('Invoice number is required');
      const duplicate = dtInvoices.find(i => i.id !== invId && i.invoiceNumber === dtInvNumber.trim());
      if (duplicate) throw new Error(`Invoice number "${dtInvNumber}" already exists`);

      const invoiceUpdates: Record<string, string> = {
        invoiceNumber: dtInvNumber.trim(),
        invoiceDate: dtInvDate,
        dueDate: dtDueDate,
        status: dtStatus as Invoice['status'],
      };

      const payments = paymentService.getByInvoice(invId);
      if (payments[0]) {
        const paymentUpdates: Record<string, string> = {};
        if (dtPaymentDate) paymentUpdates.paymentDate = dtPaymentDate;
        if (dtPaymentMode) paymentUpdates.paymentMethod = dtPaymentMode;
        if (Object.keys(paymentUpdates).length > 0) {
          await paymentService.async.update(payments[0].id, paymentUpdates);
        }
        // Sync payment date to invoice's paidDate
        if (dtPaymentDate && dtStatus === 'paid') {
          invoiceUpdates.paidDate = dtPaymentDate;
        }
      }

      await invoiceService.async.update(invId, invoiceUpdates);

      setDtEditingId(null);
      setDtSuccess('Invoice updated successfully');
      setDtRefreshKey(k => k + 1);
      setTimeout(() => setDtSuccess(''), 3000);
    } catch (err) {
      setDtError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setDtSaving(false);
    }
  }

  return (
    <>
      {dtSuccess && (
        <Alert variant="success" dismissible onDismiss={() => setDtSuccess('')}>
          {dtSuccess}
        </Alert>
      )}
      {dtError && (
        <Alert variant="error" dismissible onDismiss={() => setDtError('')}>
          {dtError}
        </Alert>
      )}

      <Card title="Invoice & Payment Editor">
        <p className="text-sm text-gray-600 mb-4">
          Search and edit invoice numbers, dates, status, and payment details.
        </p>

        {/* Search & Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="sm:col-span-2 md:col-span-2">
            <Input
              placeholder="Search by invoice number or member name..."
              value={dtSearch}
              onChange={(e) => setDtSearch(e.target.value)}
            />
          </div>
          <select
            value={dtStatusFilter}
            onChange={(e) => setDtStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partially-paid">Partially Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dtDateFrom}
              onChange={(e) => setDtDateFrom(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="From"
              title="Invoice date from"
            />
            <span className="text-gray-400 shrink-0">{'\u2013'}</span>
            <input
              type="date"
              value={dtDateTo}
              onChange={(e) => setDtDateTo(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="To"
              title="Invoice date to"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-3">{dtFiltered.length} invoices found</p>

        {/* Invoice List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  { key: 'invNumber', label: 'Invoice #' },
                  { key: 'member', label: 'Member' },
                  { key: '', label: 'Details' },
                  { key: 'amount', label: 'Amount' },
                  { key: 'invDate', label: 'Inv Date' },
                  { key: 'dueDate', label: 'Due Date' },
                  { key: 'status', label: 'Status' },
                  { key: 'payDate', label: 'Pay Date' },
                  { key: 'payMode', label: 'Pay Mode' },
                ].map(col => (
                  <th
                    key={col.label}
                    className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase ${col.key ? 'cursor-pointer hover:text-gray-700 select-none' : ''}`}
                    onClick={col.key ? () => handleDtSort(col.key) : undefined}
                  >
                    {col.label}
                    {col.key && dtSortCol === col.key && (
                      <span className="ml-1">{dtSortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dtFiltered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                    {dtSearch || dtStatusFilter ? 'No invoices match your search.' : 'No invoices found.'}
                  </td>
                </tr>
              ) : (
                dtFiltered.map(inv => {
                  const isEditing = dtEditingId === inv.id;
                  const member = memberService.getById(inv.memberId);
                  const memberName = member ? `${member.firstName} ${member.lastName}` : 'Unknown';
                  const itemSummary = inv.items?.map(item => item.description).join(', ') || '-';
                  const sub = inv.subscriptionId ? subscriptionService.getById(inv.subscriptionId) : null;
                  const payments = paymentService.getByInvoice(inv.id);
                  const payment = payments[0];

                  return (
                    <tr key={inv.id} className={isEditing ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                      {/* Invoice Number */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={dtInvNumber}
                            onChange={(e) => setDtInvNumber(e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="font-medium text-gray-900 whitespace-nowrap">{inv.invoiceNumber}</span>
                        )}
                      </td>

                      {/* Member (read-only) */}
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{memberName}</td>

                      {/* Item Details (read-only) */}
                      <td className="px-3 py-2 text-gray-600 max-w-xs">
                        <div className="truncate" title={itemSummary}>{itemSummary}</div>
                        {sub && (
                          <div className="text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(sub.startDate)} {'\u2013'} {formatDate(sub.endDate)}
                          </div>
                        )}
                      </td>

                      {/* Amount (read-only) */}
                      <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{formatCurrency(inv.totalAmount)}</td>

                      {/* Invoice Date */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="date"
                            value={dtInvDate}
                            onChange={(e) => setDtInvDate(e.target.value)}
                            className="w-36 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="whitespace-nowrap">{formatDate(inv.invoiceDate)}</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="date"
                            value={dtDueDate}
                            onChange={(e) => setDtDueDate(e.target.value)}
                            className="w-36 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="whitespace-nowrap">{formatDate(inv.dueDate)}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={dtStatus}
                            onChange={(e) => setDtStatus(e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                            <option value="partially-paid">Partially Paid</option>
                            <option value="overdue">Overdue</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <StatusBadge status={inv.status} />
                        )}
                      </td>

                      {/* Payment Date */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            type="date"
                            value={dtPaymentDate}
                            onChange={(e) => setDtPaymentDate(e.target.value)}
                            className="w-36 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="whitespace-nowrap">{payment?.paymentDate ? formatDate(payment.paymentDate) : '-'}</span>
                        )}
                      </td>

                      {/* Payment Mode */}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={dtPaymentMode}
                            onChange={(e) => setDtPaymentMode(e.target.value)}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">-</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                            <option value="bank-transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <span className="text-gray-600">{payment?.paymentMethod || '-'}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleDtSave(inv.id)}
                              loading={dtSaving}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDtCancel}
                              disabled={dtSaving}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDtEdit(inv)}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
