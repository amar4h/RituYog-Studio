import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, Button, Input, SearchableSelect, Alert, PageLoading } from '../../../components/common';
import { productService, memberService, invoiceService, inventoryService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { getToday } from '../../../utils/dateUtils';
import { useFreshData } from '../../../hooks';
import type { Product, InvoiceItem } from '../../../types';

interface SaleItem {
  productId: string;
  product: Product | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function ProductSalePage() {
  const { isLoading } = useFreshData(['products', 'members', 'invoices']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get('productId');

  const [memberId, setMemberId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([
    { productId: '', product: null, quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [discount, setDiscount] = useState('0');
  const [shippingCost, setShippingCost] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const products = productService.getAll().filter(p => p.isActive && p.currentStock > 0);
  const members = memberService.getAll()
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  // Auto-add product if passed via URL
  useEffect(() => {
    if (!isLoading && preselectedProductId && !initialized) {
      const product = products.find(p => p.id === preselectedProductId);
      if (product) {
        setItems([{
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          total: product.sellingPrice,
        }]);
      }
      setInitialized(true);
    }
  }, [isLoading, preselectedProductId, products, initialized]);

  if (isLoading) {
    return <PageLoading />;
  }

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId) || null;
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = {
        productId,
        product,
        quantity: 1,
        unitPrice: product?.sellingPrice || 0,
        total: product?.sellingPrice || 0,
      };
      return newItems;
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = newItems[index];
      const maxQty = item.product?.currentStock || 0;
      const validQty = Math.min(Math.max(1, quantity), maxQty);
      newItems[index] = {
        ...item,
        quantity: validQty,
        total: validQty * item.unitPrice,
      };
      return newItems;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { productId: '', product: null, quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = parseFloat(discount) || 0;
  const shippingAmount = parseFloat(shippingCost) || 0;
  const total = Math.max(0, subtotal + shippingAmount - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!memberId) {
      setError('Please select a member');
      return;
    }

    const validItems = items.filter(item => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one product');
      return;
    }

    // Check stock availability
    for (const item of validItems) {
      if (item.product && item.quantity > item.product.currentStock) {
        setError(`Insufficient stock for ${item.product.name}. Available: ${item.product.currentStock}`);
        return;
      }
    }

    setSaving(true);

    try {
      // Generate invoice number
      const invoiceNumber = invoiceService.generateInvoiceNumber();

      // Prepare invoice items
      const invoiceItems: InvoiceItem[] = validItems.map(item => ({
        description: item.product!.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        cost: item.product!.costPrice, // Store cost for COGS calculation
      }));

      // Create invoice
      const invoice = invoiceService.create({
        invoiceNumber,
        memberId,
        subscriptionId: undefined, // Product sale, no subscription
        invoiceType: 'product-sale',
        items: invoiceItems,
        amount: subtotal,
        discount: discountAmount,
        shippingCost: shippingAmount || undefined,
        tax: 0,
        totalAmount: total,
        amountPaid: 0,
        status: 'sent',
        invoiceDate: getToday(),
        dueDate: getToday(),
        notes: notes || undefined,
      });

      // Deduct inventory for each item
      for (const item of validItems) {
        inventoryService.recordSale(
          item.productId,
          item.quantity,
          item.product!.costPrice,
          invoice.id
        );
      }

      // Navigate to invoice detail or payment page
      navigate(`/admin/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
    } finally {
      setSaving(false);
    }
  };

  const selectedMember = members.find(m => m.id === memberId);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <Link to="/admin/invoices" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Billing
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Product Sale</h1>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member Selection */}
        <Card>
          <SearchableSelect
            label="Select Member"
            value={memberId}
            onChange={setMemberId}
            placeholder="Type to search members..."
            options={members.map(m => ({
              value: m.id,
              label: `${m.firstName} ${m.lastName}`,
              sublabel: `${m.phone}${m.status !== 'active' ? ` - ${m.status}` : ''}`,
            }))}
            required
          />
          {selectedMember && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">{selectedMember.firstName} {selectedMember.lastName}</p>
              <p className="text-gray-500">{selectedMember.phone}{selectedMember.status !== 'active' ? ` (${selectedMember.status})` : ''}</p>
            </div>
          )}
        </Card>

        {/* Products */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Products</h3>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              + Add
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                {/* Product Selector - Full width */}
                <SearchableSelect
                  value={item.productId}
                  onChange={(val) => handleProductChange(index, val)}
                  placeholder="Type to search products..."
                  options={products.map(p => ({
                    value: p.id,
                    label: p.name,
                    sublabel: `${formatCurrency(p.sellingPrice)} - ${p.currentStock} in stock`,
                  }))}
                />

                {/* Show details only when product selected */}
                {item.productId && (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {/* Quantity */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(index, item.quantity + 1)}
                        disabled={item.quantity >= (item.product?.currentStock || 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>

                    {/* Price Info */}
                    <div className="text-right flex-1">
                      <p className="text-xs text-gray-500">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </p>
                      <p className="font-bold text-indigo-600">{formatCurrency(item.total)}</p>
                    </div>

                    {/* Remove Button */}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Summary */}
        <Card>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 whitespace-nowrap">Shipping</span>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 whitespace-nowrap">Discount</span>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max={subtotal + shippingAmount}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-medium text-gray-900">Total</span>
              <span className="text-2xl font-bold text-indigo-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
          />
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Link to="/admin/invoices" className="flex-1">
            <Button type="button" variant="outline" fullWidth>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            fullWidth
            disabled={saving || !memberId || items.every(i => !i.productId)}
            className="flex-1"
          >
            {saving ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
