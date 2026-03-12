import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Select, Modal } from '../common';
import { invoiceService, productService, inventoryService } from '../../services';
import { formatCurrency } from '../../utils/formatUtils';
import type { Invoice, InvoiceItem, InvoiceStatus, InvoiceType, Member } from '../../types';

// Type for line item in form (before saving)
interface LineItemForm {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number; // Internal cost for profit calculation
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editInvoice?: Invoice | null;
  allMembers: Member[];
}

export function CreateInvoiceModal({ isOpen, onClose, onSaved, editInvoice, allMembers }: CreateInvoiceModalProps) {
  const allProducts = productService.getAll().filter(p => p.isActive && p.currentStock > 0);

  // Modal form state
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
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState<string | null>(null);

  const isEditMode = editInvoice !== null && editInvoice !== undefined;
  const editingInvoiceId = editInvoice?.id ?? null;

  // Populate form when editInvoice changes (only once per invoice)
  const editId = editInvoice?.id ?? '__new__';
  if (isOpen && initialized !== editId) {
    if (editInvoice) {
      setSelectedMemberId(editInvoice.memberId);
      setLineItems(editInvoice.items.map(item => ({
        id: crypto.randomUUID(),
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cost: item.cost || 0
      })));
      if (editInvoice.discount && editInvoice.discount > 0) {
        setDiscountAmount(editInvoice.discount);
        setDiscountType('fixed');
      } else {
        setDiscountAmount(0);
        setDiscountType('fixed');
      }
      setDiscountReason(editInvoice.discountReason || '');
      setShippingCost(editInvoice.shippingCost || 0);
      setInvoiceDate(editInvoice.invoiceDate);
      setDueDate(editInvoice.dueDate);
      setInvoiceStatus(editInvoice.status);
      setInvoiceNotes(editInvoice.notes || '');
      setInvoiceType(editInvoice.invoiceType || 'product-sale');
    } else {
      // Reset for new invoice
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
    }
    setError('');
    setInitialized(editId);
  }

  // Reset initialized when modal closes so next open re-initializes
  if (!isOpen && initialized !== null) {
    setInitialized(null);
  }

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

    const existingItem = lineItems.find(item => item.description === product.name);
    if (existingItem) {
      setLineItems(lineItems.map(item =>
        item.description === product.name
          ? { ...item, quantity: Math.min(item.quantity + 1, product.currentStock) }
          : item
      ));
    } else {
      const newItem: LineItemForm = {
        id: crypto.randomUUID(),
        description: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
        cost: product.costPrice,
      };
      if (lineItems.length === 1 && !lineItems[0].description) {
        setLineItems([newItem]);
      } else {
        setLineItems([...lineItems, newItem]);
      }
    }
    setSelectedProductId('');
  };

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculatedDiscount = discountType === 'percentage'
    ? Math.round(subtotal * discountAmount / 100)
    : discountAmount;
  const total = Math.max(0, subtotal + shippingCost - calculatedDiscount);

  // Create/Update invoice handler
  const handleSaveInvoice = () => {
    setError('');

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
            const product = allProducts.find(p => p.name === item.description);
            if (product && item.quantity > 0) {
              inventoryService.recordSale(
                product.id,
                item.quantity,
                product.costPrice,
                createdInvoice.id,
                undefined,
                invoiceDate
              );
            }
          }
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? 'Failed to update invoice' : 'Failed to create invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit Invoice' : 'Create Invoice'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveInvoice} disabled={isCreating}>
            {isCreating ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Invoice')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
