import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Alert, PageLoading } from '../../../components/common';
import { productService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { useFreshData } from '../../../hooks';
import { PRODUCT_CATEGORY_OPTIONS } from '../../../constants';
import type { Product, ProductCategory } from '../../../types';
import type { Column } from '../../../components/common';

export function ProductListPage() {
  const { isLoading } = useFreshData(['products']);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<string>('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (isLoading) {
    return <PageLoading />;
  }

  const allProducts = productService.getAll();

  // Filter products
  const products = allProducts.filter(product => {
    const matchesSearch = !search ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !categoryFilter || product.category === categoryFilter;

    const matchesStock = !stockFilter ||
      (stockFilter === 'low' && product.currentStock <= product.lowStockThreshold) ||
      (stockFilter === 'out' && product.currentStock === 0) ||
      (stockFilter === 'in' && product.currentStock > 0);

    return matchesSearch && matchesCategory && matchesStock && product.isActive;
  });

  const lowStockCount = allProducts.filter(p => p.isActive && p.currentStock <= p.lowStockThreshold).length;
  const stockValue = productService.getStockValue();

  const getCategoryLabel = (category: ProductCategory) => {
    return PRODUCT_CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
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
      key: 'category',
      header: 'Category',
      render: (product) => (
        <span className="text-gray-600">{getCategoryLabel(product.category)}</span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortValue: (product) => product.sellingPrice,
      render: (product) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">{formatCurrency(product.sellingPrice)}</div>
          <div className="text-sm text-gray-500">Cost: {formatCurrency(product.costPrice)}</div>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      sortValue: (product) => product.currentStock,
      render: (product) => {
        const isLow = product.currentStock <= product.lowStockThreshold;
        const isOut = product.currentStock === 0;
        return (
          <div className="text-center">
            <span className={`font-medium ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
              {product.currentStock} {product.unit}
            </span>
            {isLow && !isOut && (
              <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">Low</span>
            )}
            {isOut && (
              <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Out</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'value',
      header: 'Stock Value',
      sortValue: (product) => product.currentStock * product.costPrice,
      render: (product) => (
        <span className="text-gray-600">{formatCurrency(product.currentStock * product.costPrice)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (product) => (
        <div className="flex gap-2 justify-end">
          {product.currentStock > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/sales/product?productId=${product.id}`)}
              title="Sell this product"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Button>
          )}
          <Link to={`/admin/products/${product.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product catalog and inventory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/sales/product')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            New Sale
          </Button>
          <Button onClick={() => navigate('/admin/products/new')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
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

      {/* Stats */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 font-medium">Total Products</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{allProducts.filter(p => p.isActive).length}</div>
            <div className="text-xs text-gray-400">{stockValue.totalItems} items in stock</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">Stock Value</div>
            <div className="text-lg font-bold text-blue-700 mt-0.5">{formatCurrency(stockValue.totalCost)}</div>
            <div className="text-xs text-blue-500">At cost price</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-green-600 font-medium">Retail Value</div>
            <div className="text-lg font-bold text-green-700 mt-0.5">{formatCurrency(stockValue.totalValue)}</div>
            <div className="text-xs text-green-500">At selling price</div>
          </div>
          <div className={`p-3 rounded-lg ${lowStockCount > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <div className={`text-xs font-medium ${lowStockCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Low Stock</div>
            <div className={`text-lg font-bold mt-0.5 ${lowStockCount > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
              {lowStockCount}
            </div>
            <div className={`text-xs ${lowStockCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
              {lowStockCount > 0 ? 'Need restocking' : 'All stocked'}
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            options={[
              { value: '', label: 'All Stock Levels' },
              { value: 'in', label: 'In Stock' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {products.length} {products.length === 1 ? 'product' : 'products'} found
            </span>
          </div>
        </div>
      </Card>

      {/* Products table */}
      {products.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No products found"
          description={search || categoryFilter || stockFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Get started by adding your first product."
          }
          action={
            !search && !categoryFilter && !stockFilter && (
              <Link to="/admin/products/new">
                <Button>Add Product</Button>
              </Link>
            )
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
    </div>
  );
}
