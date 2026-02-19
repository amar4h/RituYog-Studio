import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Alert, Modal, PageLoading } from '../../components/common';
import { invoiceService, memberService, subscriptionService, membershipPlanService, paymentService, settingsService, productService, inventoryService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import { formatDate, getCurrentMonthRange } from '../../utils/dateUtils';
import { generateInvoicePDF } from '../../utils/pdfUtils';
import { useFreshData } from '../../hooks';
import type { Invoice, InvoiceItem, InvoiceStatus, InvoiceType, Member } from '../../types';
import type { Column } from '../../components/common';

// Type for line item in form (before saving)
interface LineItemForm {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number; // Internal cost for profit calculation
}

export function InvoiceListPage() {
  // Fetch fresh data from API on mount
  const { isLoading } = useFreshData(['invoices', 'members', 'subscriptions']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sharingInvoiceId, setSharingInvoiceId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Create/Edit Invoice Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, cost: 0 }
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountReason, setDiscountReason] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('sent');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('product-sale');
  const [selectedProductId, setSelectedProductId] = useState('');
  const isEditMode = editingInvoiceId !== null;

  // Show loading state while fetching data
  if (isLoading) {
    return <PageLoading />;
  }

  // Get data after loading is complete
  const allMembers = memberService.getAll();
  const allInvoices = invoiceService.getAll();
  const allProducts = productService.getAll().filter(p => p.isActive && p.currentStock > 0);

  // Check if Web Share API with files is supported
  const canShareFiles = typeof navigator !== 'undefined' &&
    navigator.share !== undefined &&
    navigator.canShare !== undefined;

  // Filter and sort invoices (most recent first)
  const invoices = allInvoices
    .filter(invoice => {
      const member = memberService.getById(invoice.memberId);
      const matchesSearch = !search || (member &&
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(search.toLowerCase())) ||
        invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || invoice.status === statusFilter;

      const matchesType = !typeFilter || invoice.invoiceType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      // Sort by createdAt timestamp (most recent first)
      const createdAtA = a.createdAt || a.invoiceDate;
      const createdAtB = b.createdAt || b.invoiceDate;
      return createdAtB.localeCompare(createdAtA);
    });

  // Share handler
  const handleShare = async (invoice: Invoice) => {
    if (!canShareFiles) {
      setError('Sharing is not supported on this device');
      return;
    }

    setSharingInvoiceId(invoice.id);
    setError('');
    try {
      const member = memberService.getById(invoice.memberId);
      const subscription = invoice.subscriptionId
        ? subscriptionService.getById(invoice.subscriptionId)
        : null;
      const plan = subscription
        ? membershipPlanService.getById(subscription.planId)
        : null;
      const payments = paymentService.getByInvoice(invoice.id);
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
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to share PDF');
    } finally {
      setSharingInvoiceId(null);
    }
  };

  // Line item helpers
  const addLineItem = () => {
    setLineItems([...lineItems, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, cost: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItemForm, value: string | number) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Add product from inventory to line items
  const addProductToLineItems = (productId: string) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    // Check if product already exists in line items
    const existingItem = lineItems.find(item => item.description === product.name);
    if (existingItem) {
      // Increase quantity if already exists
      setLineItems(lineItems.map(item =>
        item.description === product.name
          ? { ...item, quantity: Math.min(item.quantity + 1, product.currentStock) }
          : item
      ));
    } else {
      // Add new line item with product details
      const newItem: LineItemForm = {
        id: crypto.randomUUID(),
        description: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
        cost: product.costPrice,
      };
      // Replace empty first item or add to list
      if (lineItems.length === 1 && !lineItems[0].description) {
        setLineItems([newItem]);
      } else {
        setLineItems([...lineItems, newItem]);
      }
    }
    setSelectedProductId(''); // Reset selector
  };

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculatedDiscount = discountType === 'percentage'
    ? Math.round(subtotal * discountAmount / 100)
    : discountAmount;
  const total = Math.max(0, subtotal + shippingCost - calculatedDiscount);

  // Reset form
  const resetForm = () => {
    setEditingInvoiceId(null);
    setSelectedMemberId('');
    setLineItems([{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, cost: 0 }]);
    setDiscountAmount(0);
    setDiscountType('fixed');
    setDiscountReason('');
    setShippingCost(0);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date().toISOString().split('T')[0]);
    setInvoiceStatus('sent');
    setInvoiceNotes('');
    setInvoiceType('product-sale');
    setSelectedProductId('');
  };

  // Edit invoice handler - populate form with existing invoice data
  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id);
    setSelectedMemberId(invoice.memberId);
    setLineItems(invoice.items.map(item => ({
      id: crypto.randomUUID(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      cost: item.cost || 0
    })));
    // Calculate discount type from stored values
    if (invoice.discount && invoice.discount > 0) {
      setDiscountAmount(invoice.discount);
      setDiscountType('fixed');
    } else {
      setDiscountAmount(0);
      setDiscountType('fixed');
    }
    setDiscountReason(invoice.discountReason || '');
    setShippingCost(invoice.shippingCost || 0);
    setInvoiceDate(invoice.invoiceDate);
    setDueDate(invoice.dueDate);
    setInvoiceStatus(invoice.status);
    setInvoiceNotes(invoice.notes || '');
    setShowCreateModal(true);
  };

  // Create/Update invoice handler
  const handleSaveInvoice = () => {
    setError('');

    // Validation
    if (!selectedMemberId) {
      setError('Please select a member');
      return;
    }

    const validItems = lineItems.filter(item => item.description.trim() && item.unitPrice > 0);
    if (validItems.length === 0) {
      setError('Please add at least one item with description and price');
      return;
    }

    setIsCreating(true);
    try {
      const items: InvoiceItem[] = validItems.map(item => {
        // Use form cost, or look up product costPrice as fallback (search all products, not just in-stock)
        let cost = item.cost > 0 ? item.cost : undefined;
        if (!cost && invoiceType === 'product-sale') {
          const product = productService.getAll().find(p => p.name === item.description.trim());
          if (product && product.costPrice > 0) cost = product.costPrice;
        }
        return {
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          cost,
        };
      });

      if (isEditMode && editingInvoiceId) {
        // Update existing invoice
        const existingInvoice = invoiceService.getById(editingInvoiceId);
        if (!existingInvoice) {
          setError('Invoice not found');
          return;
        }

        invoiceService.update(editingInvoiceId, {
          memberId: selectedMemberId,
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          items: items,
          amount: subtotal,
          discount: calculatedDiscount,
          discountReason: discountReason || undefined,
          shippingCost: shippingCost || undefined,
          totalAmount: total,
          status: invoiceStatus,
          notes: invoiceNotes || undefined
        });
      } else {
        // Create new invoice
        const invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
          memberId: selectedMemberId,
          invoiceNumber: invoiceService.generateInvoiceNumber(),
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          invoiceType: invoiceType,
          items: items,
          amount: subtotal,
          discount: calculatedDiscount,
          discountReason: discountReason || undefined,
          shippingCost: shippingCost || undefined,
          totalAmount: total,
          amountPaid: 0,
          status: invoiceStatus,
          notes: invoiceNotes || undefined
        };

        const createdInvoice = invoiceService.create(invoice);

        // Deduct inventory for product sales
        if (invoiceType === 'product-sale') {
          for (const item of items) {
            // Find product by name to get ID and cost
            const product = allProducts.find(p => p.name === item.description);
            if (product && item.quantity > 0) {
              inventoryService.recordSale(
                product.id,
                item.quantity,
                product.costPrice,
                createdInvoice.id
              );
            }
          }
        }
      }

      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? 'Failed to update invoice' : 'Failed to create invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (invoice) => (
        <Link
          to={`/admin/invoices/${invoice.id}`}
          className="font-mono font-medium text-indigo-600 hover:text-indigo-700"
        >
          {invoice.invoiceNumber}
        </Link>
      ),
    },
    {
      key: 'member',
      header: 'Member',
      render: (invoice) => {
        const member = memberService.getById(invoice.memberId);
        if (!member) return <span className="text-gray-400">Unknown</span>;
        return (
          <Link
            to={`/admin/members/${member.id}`}
            className="text-gray-900 hover:text-indigo-600"
          >
            {member.firstName} {member.lastName}
          </Link>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (invoice) => (
        <span className="text-gray-600">{formatDate(invoice.invoiceDate)}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (invoice) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
          invoice.invoiceType === 'product-sale'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {invoice.invoiceType === 'product-sale' ? 'Product' : 'Membership'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (invoice) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
          {(invoice.discount ?? 0) > 0 && (
            <p className="text-green-600 text-xs">
              Discount: {formatCurrency(invoice.discount ?? 0)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'paid',
      header: 'Paid',
      render: (invoice) => (
        <span className={invoice.amountPaid >= invoice.totalAmount ? 'text-green-600' : 'text-gray-600'}>
          {formatCurrency(invoice.amountPaid)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (invoice) => {
        const balance = invoice.totalAmount - invoice.amountPaid;
        return (
          <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
            {formatCurrency(balance)}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (invoice) => (
        <div className="flex gap-1 justify-end">
          <Link to={`/admin/invoices/${invoice.id}`}>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          {invoice.status === 'draft' && invoice.invoiceType === 'product-sale' && (
            <Button variant="outline" size="sm" onClick={() => handleEditInvoice(invoice)}>
              Edit
            </Button>
          )}
          {invoice.status !== 'paid' && (
            <Link to={`/admin/payments/record`} state={{ invoiceId: invoice.id }}>
              <Button variant="outline" size="sm">Pay</Button>
            </Link>
          )}
          {canShareFiles && (
            <button
              onClick={() => handleShare(invoice)}
              disabled={sharingInvoiceId === invoice.id}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
              title="Share PDF"
            >
              {sharingInvoiceId === invoice.id ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>
          )}
        </div>
      ),
    },
  ];

  // Stats
  const { start, end } = getCurrentMonthRange();
  const thisMonthInvoices = allInvoices.filter(i =>
    i.invoiceDate >= start && i.invoiceDate <= end
  );
  const pendingAmount = allInvoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + (Number(i.totalAmount || 0) - Number(i.amountPaid || 0)), 0);
  const paidThisMonth = thisMonthInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amountPaid || 0), 0);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">View and manage all invoices</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{allInvoices.length}</p>
            <p className="text-sm text-gray-600">Total Invoices</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {allInvoices.filter(i => i.status === 'sent' || i.status === 'draft').length}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(pendingAmount)}</p>
            <p className="text-sm text-gray-600">Outstanding</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(paidThisMonth)}</p>
            <p className="text-sm text-gray-600">Collected (This Month)</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search by member or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'membership', label: 'Membership' },
              { value: 'product-sale', label: 'Product Sale' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'sent', label: 'Sent' },
              { value: 'partially-paid', label: 'Partially Paid' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {invoices.length} invoices found
            </span>
          </div>
        </div>
      </Card>

      {/* Invoices table */}
      {invoices.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No invoices found"
          description={search || statusFilter || typeFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Invoices are automatically created when subscriptions are added."
          }
        />
      ) : (
        <Card>
          <DataTable
            data={invoices}
            columns={columns}
            keyExtractor={(invoice) => invoice.id}
          />
        </Card>
      )}

      {/* Create/Edit Invoice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title={isEditMode ? 'Edit Invoice' : 'Create Invoice'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Invoice Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="invoiceType"
                  value="product-sale"
                  checked={invoiceType === 'product-sale'}
                  onChange={() => setInvoiceType('product-sale')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Product Sale</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="invoiceType"
                  value="membership"
                  checked={invoiceType === 'membership'}
                  onChange={() => setInvoiceType('membership')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Membership/Other</span>
              </label>
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member <span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              options={[
                { value: '', label: 'Select a member...' },
                ...allMembers.map(m => ({
                  value: m.id,
                  label: `${m.firstName} ${m.lastName}${m.phone ? ` (${m.phone})` : ''}`
                }))
              ]}
            />
            <p className="mt-1 text-xs text-gray-500">
              Need to add someone? <Link to="/admin/members/new" className="text-indigo-600 hover:text-indigo-700">Create a new member</Link> first.
            </p>
          </div>

          {/* Quick Add from Inventory (for product sales) */}
          {invoiceType === 'product-sale' && allProducts.length > 0 && (
            <div className="bg-indigo-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-indigo-700 mb-2">
                Quick Add from Inventory
              </label>
              <div className="flex gap-2">
                <Select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  options={[
                    { value: '', label: 'Select a product...' },
                    ...allProducts.map(p => ({
                      value: p.id,
                      label: `${p.name} (${p.currentStock} in stock) - ${formatCurrency(p.sellingPrice)}`
                    }))
                  ]}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => selectedProductId && addProductToLineItems(selectedProductId)}
                  disabled={!selectedProductId}
                >
                  Add
                </Button>
              </div>
              <p className="mt-1 text-xs text-indigo-600">
                Select a product to auto-fill price and cost. Stock will be deducted when invoice is created.
              </p>
            </div>
          )}

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Line Items <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <div className="col-span-3">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Cost</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>
              {/* Items */}
              {lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <Input
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="text-center"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      value={item.cost || ''}
                      onChange={(e) => updateLineItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-2 text-right font-medium text-gray-900">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLineItem}>
                + Add Item
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Cost is for internal tracking only and will not appear on the invoice.
              </p>
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount (optional)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                min={0}
                placeholder="Amount"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              />
              <Select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percentage')}
                options={[
                  { value: 'fixed', label: 'Fixed (Rs)' },
                  { value: 'percentage', label: 'Percentage (%)' }
                ]}
              />
              <Input
                placeholder="Reason"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>
          </div>

          {/* Shipping Cost (product sales only) */}
          {invoiceType === 'product-sale' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Cost (optional)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={shippingCost || ''}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Dates and Status */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value as InvoiceStatus)}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'sent', label: 'Sent' }
                ]}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
              placeholder="Additional notes for this invoice..."
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {shippingCost > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span>+{formatCurrency(shippingCost)}</span>
              </div>
            )}
            {calculatedDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount{discountType === 'percentage' ? ` (${discountAmount}%)` : ''}</span>
                <span>-{formatCurrency(calculatedDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveInvoice} disabled={isCreating}>
              {isCreating ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Invoice')}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
