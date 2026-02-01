import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input, Select, Alert, PageLoading } from '../../../components/common';
import { productService } from '../../../services';
import { PRODUCT_CATEGORY_OPTIONS } from '../../../constants';
import { useFreshData } from '../../../hooks';
import type { Product, ProductCategory } from '../../../types';

export function ProductFormPage() {
  const { isLoading } = useFreshData(['products']);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'yoga-equipment' as ProductCategory,
    description: '',
    costPrice: '',
    sellingPrice: '',
    currentStock: '0',
    lowStockThreshold: '1',
    unit: 'piece',
    isActive: true,
    barcode: '',
    notes: '',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && id && !isLoading) {
      const product = productService.getById(id);
      if (product) {
        setFormData({
          name: product.name,
          sku: product.sku,
          category: product.category,
          description: product.description || '',
          costPrice: String(product.costPrice),
          sellingPrice: String(product.sellingPrice),
          currentStock: String(product.currentStock),
          lowStockThreshold: String(product.lowStockThreshold),
          unit: product.unit,
          isActive: product.isActive,
          barcode: product.barcode || '',
          notes: product.notes || '',
        });
      } else {
        setError('Product not found');
      }
    } else if (!isEditing && !isLoading) {
      // Auto-generate SKU for new products
      setFormData(prev => ({
        ...prev,
        sku: productService.generateSku(prev.category),
      }));
    }
  }, [id, isEditing, isLoading]);

  if (isLoading) {
    return <PageLoading />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }
      if (!formData.sku.trim()) {
        throw new Error('SKU is required');
      }
      // Check SKU uniqueness
      if (!productService.isSkuUnique(formData.sku.trim(), isEditing ? id : undefined)) {
        throw new Error('This SKU already exists. Please use a different SKU.');
      }
      if (!formData.costPrice || parseFloat(formData.costPrice) < 0) {
        throw new Error('Cost price must be a positive number');
      }
      if (!formData.sellingPrice || parseFloat(formData.sellingPrice) < 0) {
        throw new Error('Selling price must be a positive number');
      }

      // Check for duplicate SKU
      const existingBySku = productService.getBySku(formData.sku);
      if (existingBySku && (!isEditing || existingBySku.id !== id)) {
        throw new Error('A product with this SKU already exists');
      }

      const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category: formData.category,
        description: formData.description.trim() || undefined,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        currentStock: parseInt(formData.currentStock) || 0,
        lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
        unit: formData.unit,
        isActive: formData.isActive,
        barcode: formData.barcode.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (isEditing && id) {
        productService.update(id, productData);
      } else {
        productService.create(productData);
      }

      navigate('/admin/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-generate SKU when category changes (only for new products with empty/auto-generated SKU)
      if (field === 'category' && !isEditing) {
        const currentSku = prev.sku;
        // Only auto-generate if SKU is empty or matches auto-generated pattern
        if (!currentSku || /^(YEQ|CLT|SUP|ACC|BKS|OTH|PRD)-\d{3}$/.test(currentSku)) {
          updated.sku = productService.generateSku(value as ProductCategory);
        }
      }
      return updated;
    });
  };

  const handleGenerateSku = () => {
    const newSku = productService.generateSku(formData.category);
    setFormData(prev => ({ ...prev, sku: newSku }));
  };

  const margin = formData.costPrice && formData.sellingPrice
    ? ((parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice)) / parseFloat(formData.sellingPrice) * 100).toFixed(1)
    : '0';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Product' : 'Add Product'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update product details' : 'Add a new product to your catalog'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/products')}>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Product Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Yoga Mat Premium"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                    placeholder="e.g., YM-001"
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSku}
                    title="Auto-generate SKU"
                  >
                    Generate
                  </Button>
                </div>
                <p className="mt-1 text-sm text-gray-500">Stock Keeping Unit - auto-generated or custom</p>
              </div>
              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                options={[...PRODUCT_CATEGORY_OPTIONS]}
              />
              <Input
                label="Unit"
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                placeholder="e.g., piece, pack, kg"
              />
              <div className="md:col-span-2">
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Product description..."
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Cost Price"
                type="number"
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', e.target.value)}
                placeholder="0.00"
                required
              />
              <Input
                label="Selling Price"
                type="number"
                min="0"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => handleChange('sellingPrice', e.target.value)}
                placeholder="0.00"
                required
              />
              <div className="flex items-end">
                <div className="w-full bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-500">Margin</div>
                  <div className={`text-lg font-bold ${parseFloat(margin) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margin}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Current Stock"
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => handleChange('currentStock', e.target.value)}
                helperText="Initial stock quantity"
              />
              <Input
                label="Low Stock Threshold"
                type="number"
                min="0"
                value={formData.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
                helperText="Alert when stock falls below this"
              />
              <Input
                label="Barcode"
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Optional barcode"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-6">
            <Input
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Internal notes about this product..."
            />
          </div>

          {/* Status */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Product is active (can be sold and displayed)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/admin/products')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
