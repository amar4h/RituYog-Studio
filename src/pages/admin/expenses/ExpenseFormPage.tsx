import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Button, Input, Select, Alert, PageLoading } from '../../../components/common';
import { expenseService, productService, inventoryService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { getToday } from '../../../utils/dateUtils';
import { useFreshData } from '../../../hooks';
import { EXPENSE_CATEGORY_OPTIONS, EXPENSE_PAYMENT_STATUS_OPTIONS } from '../../../constants';
import type { Expense, ExpenseCategory, ExpenseItem, ExpensePaymentStatus, PaymentMethod } from '../../../types';

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Select Method' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
];

export function ExpenseFormPage() {
  const { isLoading } = useFreshData(['expenses', 'products']);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);
  const isProcurement = searchParams.get('category') === 'procurement';

  const [formData, setFormData] = useState({
    category: (isProcurement ? 'procurement' : '') as ExpenseCategory | '',
    description: '',
    vendorName: '',
    vendorContact: '',
    vendorGstin: '',
    expenseDate: getToday(),
    dueDate: '',
    paymentStatus: 'pending' as ExpensePaymentStatus,
    paymentMethod: '' as PaymentMethod | '',
    paymentReference: '',
    invoiceNumber: '',
    isRecurring: false,
    notes: '',
  });

  const [items, setItems] = useState<ExpenseItem[]>([
    { description: '', productId: '', quantity: 1, unitCost: 0, total: 0 },
  ]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const products = productService.getAll().filter(p => p.isActive);

  useEffect(() => {
    if (isEditing && id && !isLoading) {
      const expense = expenseService.getById(id);
      if (expense) {
        setFormData({
          category: expense.category,
          description: expense.description,
          vendorName: expense.vendorName,
          vendorContact: expense.vendorContact || '',
          vendorGstin: expense.vendorGstin || '',
          expenseDate: expense.expenseDate,
          dueDate: expense.dueDate || '',
          paymentStatus: expense.paymentStatus,
          paymentMethod: expense.paymentMethod || '',
          paymentReference: expense.paymentReference || '',
          invoiceNumber: expense.invoiceNumber || '',
          isRecurring: expense.isRecurring || false,
          notes: expense.notes || '',
        });
        if (expense.items.length > 0) {
          setItems(expense.items);
        }
      } else {
        setError('Expense not found');
      }
    }
  }, [id, isEditing, isLoading]);

  if (isLoading) {
    return <PageLoading />;
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof ExpenseItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index] };

      if (field === 'productId' && value) {
        const product = products.find(p => p.id === value);
        if (product) {
          item.productId = value as string;
          item.description = product.name;
          item.unitCost = product.costPrice;
          item.total = (item.quantity || 1) * product.costPrice;
        }
      } else if (field === 'quantity' || field === 'unitCost') {
        const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
        (item as Record<string, unknown>)[field] = numValue;
        item.total = (field === 'quantity' ? numValue : item.quantity || 1) * (field === 'unitCost' ? numValue : item.unitCost);
      } else {
        (item as Record<string, unknown>)[field] = value;
      }

      newItems[index] = item;
      return newItems;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', productId: '', quantity: 1, unitCost: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!formData.category) {
        throw new Error('Category is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.vendorName.trim()) {
        throw new Error('Vendor name is required');
      }

      const validItems = items.filter(item => item.description.trim() && item.total > 0);
      if (validItems.length === 0) {
        throw new Error('At least one line item with amount is required');
      }

      // Generate expense number if new
      let expenseNumber = '';
      if (!isEditing) {
        expenseNumber = expenseService.generateExpenseNumber();
      }

      const amount = validItems.reduce((sum, item) => sum + item.total, 0);
      const amountPaid = formData.paymentStatus === 'paid' ? amount : 0;

      const expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = {
        expenseNumber: isEditing ? '' : expenseNumber, // Will be ignored on update
        category: formData.category as ExpenseCategory,
        description: formData.description.trim(),
        vendorName: formData.vendorName.trim(),
        vendorContact: formData.vendorContact.trim() || undefined,
        vendorGstin: formData.vendorGstin.trim() || undefined,
        amount,
        totalAmount: amount,
        amountPaid,
        items: validItems,
        expenseDate: formData.expenseDate,
        dueDate: formData.dueDate || undefined,
        paidDate: formData.paymentStatus === 'paid' ? getToday() : undefined,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod as PaymentMethod || undefined,
        paymentReference: formData.paymentReference.trim() || undefined,
        invoiceNumber: formData.invoiceNumber.trim() || undefined,
        isRecurring: formData.isRecurring,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditing && id) {
        expenseService.update(id, expenseData);
      } else {
        const createdExpense = expenseService.create(expenseData);

        // If procurement, update inventory
        if (formData.category === 'procurement') {
          for (const item of validItems) {
            if (item.productId && item.quantity) {
              inventoryService.recordPurchase(
                item.productId,
                item.quantity,
                item.unitCost,
                createdExpense.id,
                formData.vendorName
              );
            }
          }
        }
      }

      navigate('/admin/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Expense' : isProcurement ? 'Record Purchase' : 'Add Expense'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update expense details' : isProcurement ? 'Record a product purchase and update inventory' : 'Record a new expense'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/expenses')}>
          Cancel
        </Button>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Expense Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                options={[
                  { value: '', label: 'Select Category' },
                  ...EXPENSE_CATEGORY_OPTIONS,
                ]}
                required
              />
              <Input
                label="Expense Date"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => handleChange('expenseDate', e.target.value)}
                required
              />
              <div className="md:col-span-2">
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Brief description of the expense..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Vendor Info */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Vendor Name"
                value={formData.vendorName}
                onChange={(e) => handleChange('vendorName', e.target.value)}
                placeholder="e.g., ABC Supplies"
                required
              />
              <Input
                label="Vendor Contact"
                value={formData.vendorContact}
                onChange={(e) => handleChange('vendorContact', e.target.value)}
                placeholder="Phone or email"
              />
              <Input
                label="Vendor GSTIN"
                value={formData.vendorGstin}
                onChange={(e) => handleChange('vendorGstin', e.target.value)}
                placeholder="Tax ID"
              />
              <Input
                label="Invoice Number"
                value={formData.invoiceNumber}
                onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                placeholder="Vendor's invoice number"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                  {formData.category === 'procurement' && (
                    <div className="col-span-3">
                      <Select
                        label={index === 0 ? 'Product' : ''}
                        value={item.productId || ''}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        options={[
                          { value: '', label: 'Select Product' },
                          ...products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` })),
                        ]}
                      />
                    </div>
                  )}
                  <div className={formData.category === 'procurement' ? 'col-span-3' : 'col-span-5'}>
                    <Input
                      label={index === 0 ? 'Description' : ''}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label={index === 0 ? 'Quantity' : ''}
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label={index === 0 ? 'Unit Cost' : ''}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost || ''}
                      onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <div className={`${index === 0 ? 'pt-6' : ''} font-medium`}>
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className={index === 0 ? 'mt-6' : ''}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(subtotal)}</div>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Payment Status"
                value={formData.paymentStatus}
                onChange={(e) => handleChange('paymentStatus', e.target.value)}
                options={[...EXPENSE_PAYMENT_STATUS_OPTIONS]}
              />
              <Select
                label="Payment Method"
                value={formData.paymentMethod}
                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                options={PAYMENT_METHOD_OPTIONS}
              />
              <Input
                label="Payment Reference"
                value={formData.paymentReference}
                onChange={(e) => handleChange('paymentReference', e.target.value)}
                placeholder="Transaction ID, cheque no., etc."
              />
              <Input
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-6">
            <Input
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes..."
            />
            <label className="flex items-center gap-3 mt-4">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => handleChange('isRecurring', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                This is a recurring expense
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/admin/expenses')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Expense' : 'Create Expense'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
