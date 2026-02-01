import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, Modal, Alert, EmptyState, EmptyIcons, PageLoading } from '../../../components/common';
import { productService, inventoryService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { formatDate } from '../../../utils/dateUtils';
import { useFreshData } from '../../../hooks';
import { PRODUCT_CATEGORY_OPTIONS, INVENTORY_TRANSACTION_TYPE_OPTIONS } from '../../../constants';
import type { Product, InventoryTransaction, InventoryTransactionType } from '../../../types';
import type { Column } from '../../../components/common';

export function InventoryPage() {
  const { isLoading } = useFreshData(['products', 'inventory']);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Adjustment modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'adjustment' | 'consumed' | 'damaged'>('adjustment');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  // Transaction history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [productTransactions, setProductTransactions] = useState<InventoryTransaction[]>([]);

  if (isLoading) {
    return <PageLoading />;
  }

  const allProducts = productService.getAll().filter(p => p.isActive);
  const stockValue = productService.getStockValue();
  const lowStockProducts = productService.getLowStock();

  // Filter products
  const products = allProducts.filter(product => {
    const matchesSearch = !search ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getTypeLabel = (type: InventoryTransactionType) => {
    return INVENTORY_TRANSACTION_TYPE_OPTIONS.find(t => t.value === type)?.label || type;
  };

  const openAdjustModal = (product: Product, type: 'adjustment' | 'consumed' | 'damaged') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setAdjustmentQty('');
    setAdjustmentNotes('');
    setShowAdjustModal(true);
  };

  const handleAdjustment = async () => {
    if (!selectedProduct || !adjustmentQty) return;

    const qty = parseInt(adjustmentQty);
    if (isNaN(qty) || qty === 0) {
      setError('Please enter a valid quantity');
      return;
    }

    try {
      if (adjustmentType === 'consumed') {
        if (qty > selectedProduct.currentStock) {
          throw new Error('Cannot consume more than current stock');
        }
        const { expense } = inventoryService.recordConsumption(selectedProduct.id, qty, adjustmentNotes);
        setSuccess(`Recorded consumption of ${qty} ${selectedProduct.unit}(s) of ${selectedProduct.name}. Expense ${expense.expenseNumber} created.`);
      } else if (adjustmentType === 'damaged') {
        if (qty > selectedProduct.currentStock) {
          throw new Error('Cannot mark more damaged than current stock');
        }
        // recordAdjustment takes new stock level, so subtract qty from current
        const newStock = selectedProduct.currentStock - qty;
        inventoryService.recordAdjustment(selectedProduct.id, newStock, adjustmentNotes || 'Damaged/written off');
        setSuccess(`Marked ${qty} ${selectedProduct.unit}(s) of ${selectedProduct.name} as damaged`);
      } else {
        // For manual adjustment, qty represents the change (+/-)
        const newStock = selectedProduct.currentStock + qty;
        inventoryService.recordAdjustment(selectedProduct.id, newStock, adjustmentNotes || 'Manual adjustment');
        setSuccess(`Adjusted stock of ${selectedProduct.name} by ${qty > 0 ? '+' : ''}${qty}`);
      }

      setShowAdjustModal(false);
      setSelectedProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
    }
  };

  const openHistoryModal = (product: Product) => {
    setHistoryProduct(product);
    const transactions = inventoryService.getByProduct(product.id);
    setProductTransactions(transactions.slice(0, 20)); // Last 20 transactions
    setShowHistoryModal(true);
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (product) => (
        <div>
          <Link
            to={`/admin/products/${product.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600"
          >
            {product.name}
          </Link>
          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Current Stock',
      render: (product) => {
        const isLow = product.currentStock <= product.lowStockThreshold;
        const isOut = product.currentStock === 0;
        return (
          <div>
            <span className={`text-lg font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
              {product.currentStock}
            </span>
            <span className="text-gray-500 ml-1">{product.unit}s</span>
            {isLow && (
              <div className="text-xs text-amber-600 mt-1">
                Below threshold ({product.lowStockThreshold})
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'value',
      header: 'Stock Value',
      render: (product) => (
        <div>
          <div className="font-medium">{formatCurrency(product.currentStock * product.costPrice)}</div>
          <div className="text-sm text-gray-500">@ {formatCurrency(product.costPrice)} each</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (product) => (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => openHistoryModal(product)}>
            History
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAdjustModal(product, 'consumed')}>
            Consume
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAdjustModal(product, 'adjustment')}>
            Adjust
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">Track and manage your stock levels</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/expenses/new?category=procurement">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record Purchase
            </Button>
          </Link>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{stockValue.totalItems}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Cost Value</div>
          <div className="text-2xl font-bold text-indigo-600">{formatCurrency(stockValue.totalCost)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Retail Value</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(stockValue.totalValue)}</div>
        </Card>
        <Card className={`p-4 ${lowStockProducts.length > 0 ? 'bg-amber-50 border-amber-200' : ''}`}>
          <div className="text-sm text-gray-500">Low Stock Alerts</div>
          <div className={`text-2xl font-bold ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {lowStockProducts.length}
          </div>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Alert variant="warning">
          <div className="font-medium">Low Stock Alert</div>
          <div className="text-sm mt-1">
            {lowStockProducts.map(p => p.name).join(', ')} {lowStockProducts.length === 1 ? 'is' : 'are'} running low on stock.
          </div>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              ...PRODUCT_CATEGORY_OPTIONS,
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          </div>
        </div>
      </Card>

      {/* Products table */}
      {products.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No products found"
          description="Add products to start tracking inventory."
          action={
            <Link to="/admin/products/new">
              <Button>Add Product</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <DataTable
            data={products}
            columns={columns}
            keyExtractor={(product) => product.id}
          />
        </Card>
      )}

      {/* Adjustment Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={adjustmentType === 'consumed' ? 'Record Consumption' : adjustmentType === 'damaged' ? 'Record Damaged' : 'Adjust Stock'}
      >
        <div className="space-y-4">
          {selectedProduct && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-sm text-gray-600">Current stock: {selectedProduct.currentStock} {selectedProduct.unit}s</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {adjustmentType === 'adjustment' ? 'Adjustment Quantity (use negative to reduce)' : 'Quantity'}
                </label>
                <Input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder={adjustmentType === 'adjustment' ? 'e.g., 5 or -3' : 'e.g., 2'}
                  min={adjustmentType === 'adjustment' ? undefined : 1}
                  max={adjustmentType !== 'adjustment' ? selectedProduct.currentStock : undefined}
                />
              </div>

              <Input
                label="Notes"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder={
                  adjustmentType === 'consumed' ? 'e.g., Used for class demo' :
                  adjustmentType === 'damaged' ? 'e.g., Damaged during delivery' :
                  'e.g., Stock count correction'
                }
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdjustment}>
                  {adjustmentType === 'consumed' ? 'Record Consumption' :
                   adjustmentType === 'damaged' ? 'Record Damaged' :
                   'Adjust Stock'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Stock History - ${historyProduct?.name || ''}`}
      >
        <div className="space-y-4">
          {productTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No transactions found</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-3 py-2">{formatDate(tx.transactionDate)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          tx.type === 'purchase' ? 'bg-green-100 text-green-700' :
                          tx.type === 'sale' ? 'bg-blue-100 text-blue-700' :
                          tx.type === 'consumed' ? 'bg-amber-100 text-amber-700' :
                          tx.type === 'damaged' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {getTypeLabel(tx.type)}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-medium ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {tx.previousStock} → {tx.newStock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
