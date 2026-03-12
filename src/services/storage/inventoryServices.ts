/**
 * Product, Inventory, and Expense Services
 * Dual-mode: localStorage (default) or API
 */

import type {
  Product,
  ProductCategory,
  InventoryTransaction,
  InventoryTransactionType,
  Expense,
  ExpenseCategory,
  ExpensePaymentStatus,
  ExpenseItem,
  PaymentMethod,
} from '../../types';
import { STORAGE_KEYS } from '../../constants';
import { getAll, getById, createDual, updateDual, removeDual } from './helpers';
import { settingsService } from './settingsService';

// ============================================
// PRODUCT SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const productService = {
  // Synchronous CRUD methods
  getAll: () => getAll<Product>(STORAGE_KEYS.PRODUCTS),
  getById: (id: string) => getById<Product>(STORAGE_KEYS.PRODUCTS, id),
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Product>(STORAGE_KEYS.PRODUCTS, data),
  update: (id: string, data: Partial<Product>) =>
    updateDual<Product>(STORAGE_KEYS.PRODUCTS, id, data),
  delete: (id: string) => removeDual<Product>(STORAGE_KEYS.PRODUCTS, id),

  // Custom query methods
  getBySku: (sku: string): Product | null => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return products.find(p => p.sku === sku) || null;
  },

  getByCategory: (category: ProductCategory): Product[] => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return products.filter(p => p.category === category);
  },

  getActive: (): Product[] => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return products.filter(p => p.isActive);
  },

  getLowStock: (): Product[] => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return products.filter(p => p.isActive && p.currentStock <= p.lowStockThreshold);
  },

  search: (query: string): Product[] => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    const lowerQuery = query.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.sku.toLowerCase().includes(lowerQuery) ||
      (p.description && p.description.toLowerCase().includes(lowerQuery))
    );
  },

  // Stock value calculation
  getStockValue: (): { totalCost: number; totalValue: number; totalItems: number } => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS).filter(p => p.isActive);
    return {
      totalCost: products.reduce((sum, p) => sum + (p.currentStock * p.costPrice), 0),
      totalValue: products.reduce((sum, p) => sum + (p.currentStock * p.sellingPrice), 0),
      totalItems: products.reduce((sum, p) => sum + p.currentStock, 0),
    };
  },

  // Update stock level (used by inventory service)
  updateStock: (productId: string, newStock: number): Product | null => {
    return productService.update(productId, { currentStock: newStock });
  },

  // Generate SKU based on category
  generateSku: (category: ProductCategory): string => {
    // Category prefixes
    const prefixMap: Record<ProductCategory, string> = {
      'yoga-equipment': 'YEQ',
      'clothing': 'CLT',
      'supplements': 'SUP',
      'accessories': 'ACC',
      'books': 'BKS',
      'other': 'OTH',
    };

    const prefix = prefixMap[category] || 'PRD';
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);

    // Find highest number for this prefix
    let maxNum = 0;
    products.forEach(p => {
      if (p.sku.startsWith(prefix + '-')) {
        const numPart = parseInt(p.sku.substring(prefix.length + 1), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    // Generate next SKU with 3-digit padding
    return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
  },

  // Check if SKU is unique
  isSkuUnique: (sku: string, excludeId?: string): boolean => {
    const products = getAll<Product>(STORAGE_KEYS.PRODUCTS);
    return !products.some(p => p.sku === sku && p.id !== excludeId);
  },
};

// ============================================
// INVENTORY SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const inventoryService = {
  // Synchronous CRUD methods
  getAll: () => getAll<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS),
  getById: (id: string) => getById<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, id),
  create: (data: Omit<InventoryTransaction, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, data),
  update: (id: string, data: Partial<InventoryTransaction>) =>
    updateDual<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, id, data),
  delete: (id: string) => removeDual<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, id),

  // Query methods
  getByProduct: (productId: string): InventoryTransaction[] => {
    const transactions = getAll<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS);
    return transactions
      .filter(t => t.productId === productId)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  },

  getByType: (type: InventoryTransactionType): InventoryTransaction[] => {
    const transactions = getAll<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS);
    return transactions.filter(t => t.type === type);
  },

  getByDateRange: (startDate: string, endDate: string): InventoryTransaction[] => {
    const transactions = getAll<InventoryTransaction>(STORAGE_KEYS.INVENTORY_TRANSACTIONS);
    return transactions.filter(t =>
      t.transactionDate >= startDate && t.transactionDate <= endDate
    );
  },

  // Record a purchase (stock in from vendor)
  recordPurchase: (
    productId: string,
    quantity: number,
    unitCost: number,
    expenseId?: string,
    vendorName?: string,
    notes?: string,
    date?: string
  ): InventoryTransaction => {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;

    // Create transaction record
    const transaction = inventoryService.create({
      productId,
      type: 'purchase',
      quantity,
      unitCost,
      totalValue: quantity * unitCost,
      expenseId,
      vendorName,
      previousStock,
      newStock,
      transactionDate: date || new Date().toISOString().split('T')[0],
      notes,
    });

    // Update product stock
    productService.updateStock(productId, newStock);

    return transaction;
  },

  // Record a sale (stock out to customer)
  recordSale: (
    productId: string,
    quantity: number,
    unitCost: number,
    invoiceId: string,
    notes?: string,
    date?: string
  ): InventoryTransaction => {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.currentStock < quantity) {
      throw new Error('Insufficient stock');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock - quantity;

    // Create transaction record
    const transaction = inventoryService.create({
      productId,
      type: 'sale',
      quantity: -quantity, // Negative for stock out
      unitCost,
      totalValue: quantity * unitCost,
      invoiceId,
      previousStock,
      newStock,
      transactionDate: date || new Date().toISOString().split('T')[0],
      notes,
    });

    // Update product stock
    productService.updateStock(productId, newStock);

    return transaction;
  },

  // Record studio consumption (stock out for internal use)
  recordConsumption: (
    productId: string,
    quantity: number,
    notes?: string,
    date?: string
  ): { transaction: InventoryTransaction; expense: Expense } => {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.currentStock < quantity) {
      throw new Error('Insufficient stock');
    }

    const previousStock = product.currentStock;
    const newStock = previousStock - quantity;
    const today = date || new Date().toISOString().split('T')[0];
    const totalCost = quantity * product.costPrice;

    // Create expense record for studio consumption
    const expense = expenseService.create({
      expenseNumber: expenseService.generateExpenseNumber(),
      category: 'supplies',
      description: `Studio consumption: ${product.name} (${quantity} ${product.unit})`,
      vendorName: 'Studio Consumption',
      amount: totalCost,
      totalAmount: totalCost,
      amountPaid: totalCost,  // Auto-paid (internal consumption)
      items: [{
        description: product.name,
        productId: product.id,
        quantity,
        unitCost: product.costPrice,
        total: totalCost,
      }],
      expenseDate: today,
      paymentStatus: 'paid',
      paidDate: today,
      notes: notes || `Consumed from inventory for studio use`,
    });

    // Create transaction record linked to expense
    const transaction = inventoryService.create({
      productId,
      type: 'consumed',
      quantity: -quantity,
      unitCost: product.costPrice,
      totalValue: totalCost,
      expenseId: expense.id,  // Link to expense
      previousStock,
      newStock,
      transactionDate: today,
      notes,
    });

    // Update product stock
    productService.updateStock(productId, newStock);

    return { transaction, expense };
  },

  // Record stock adjustment (manual correction)
  recordAdjustment: (
    productId: string,
    newStockLevel: number,
    notes?: string,
    date?: string
  ): InventoryTransaction => {
    const product = productService.getById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const previousStock = product.currentStock;
    const quantityChange = newStockLevel - previousStock;
    const today = date || new Date().toISOString().split('T')[0];

    // Create transaction record
    const transaction = inventoryService.create({
      productId,
      type: 'adjustment',
      quantity: quantityChange,
      unitCost: product.costPrice,
      totalValue: Math.abs(quantityChange) * product.costPrice,
      previousStock,
      newStock: newStockLevel,
      transactionDate: today,
      notes,
    });

    // Update product stock
    productService.updateStock(productId, newStockLevel);

    return transaction;
  },

  // Calculate Cost of Goods Sold for a period
  getCostOfGoodsSold: (startDate: string, endDate: string): { cogs: number; count: number } => {
    const transactions = inventoryService.getByDateRange(startDate, endDate);
    const salesTransactions = transactions.filter(t => t.type === 'sale');
    return {
      cogs: salesTransactions.reduce((sum, t) => sum + t.totalValue, 0),
      count: salesTransactions.length,
    };
  },
};

// ============================================
// EXPENSE SERVICE
// Dual-mode: localStorage (default) or API
// ============================================

export const expenseService = {
  // Synchronous CRUD methods
  getAll: () => getAll<Expense>(STORAGE_KEYS.EXPENSES),
  getById: (id: string) => getById<Expense>(STORAGE_KEYS.EXPENSES, id),
  create: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) =>
    createDual<Expense>(STORAGE_KEYS.EXPENSES, data),
  update: (id: string, data: Partial<Expense>) =>
    updateDual<Expense>(STORAGE_KEYS.EXPENSES, id, data),
  delete: (id: string) => removeDual<Expense>(STORAGE_KEYS.EXPENSES, id),

  // Query methods
  getByCategory: (category: ExpenseCategory): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses.filter(e => e.category === category);
  },

  getByVendor: (vendorName: string): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    const lowerVendor = vendorName.toLowerCase();
    return expenses.filter(e => e.vendorName.toLowerCase().includes(lowerVendor));
  },

  getByDateRange: (startDate: string, endDate: string): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses
      .filter(e => e.expenseDate >= startDate && e.expenseDate <= endDate)
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  },

  getPending: (): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses.filter(e => e.paymentStatus === 'pending' || e.paymentStatus === 'partial');
  },

  getRecurring: (): Expense[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses.filter(e => e.isRecurring);
  },

  // Generate expense number
  generateExpenseNumber: (): string => {
    const settings = settingsService.getOrDefault();
    const prefix = settings.expensePrefix || 'EXP';
    const startNumber = settings.expenseStartNumber || 1;

    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);

    // Find the highest existing number
    let maxNum = 0;
    expenses.forEach(exp => {
      const match = exp.expenseNumber.match(new RegExp(`${prefix}-(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    // Next number is max of (highest existing, startNumber - 1) + 1
    const nextNumber = Math.max(maxNum, startNumber - 1) + 1;
    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  },

  // Repair expenses with missing expenseNumber
  repairMissingNumbers: (): number => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    let repaired = 0;
    for (const exp of expenses) {
      if (!exp.expenseNumber) {
        const newNumber = expenseService.generateExpenseNumber();
        expenseService.update(exp.id, { expenseNumber: newNumber });
        repaired++;
      }
    }
    return repaired;
  },

  // Record payment for an expense
  recordPayment: (
    expenseId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string
  ): Expense | null => {
    const expense = expenseService.getById(expenseId);
    if (!expense) return null;

    const newAmountPaid = expense.amountPaid + amount;
    const today = new Date().toISOString().split('T')[0];

    let paymentStatus: ExpensePaymentStatus = 'partial';
    if (newAmountPaid >= expense.totalAmount) {
      paymentStatus = 'paid';
    }

    return expenseService.update(expenseId, {
      amountPaid: newAmountPaid,
      paymentStatus,
      paymentMethod: method,
      paymentReference: reference,
      paidDate: paymentStatus === 'paid' ? today : undefined,
    });
  },

  // Get total expenses by category for a period
  getTotalByCategory: (startDate: string, endDate: string): Record<ExpenseCategory, number> => {
    const expenses = expenseService.getByDateRange(startDate, endDate);
    const categories: ExpenseCategory[] = [
      'procurement', 'rent', 'utilities', 'salaries', 'maintenance',
      'marketing', 'insurance', 'professional-fees', 'equipment',
      'supplies', 'travel', 'other'
    ];

    const result: Record<ExpenseCategory, number> = {} as Record<ExpenseCategory, number>;
    categories.forEach(cat => {
      result[cat] = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.totalAmount, 0);
    });

    return result;
  },

  // Get monthly expense totals
  getMonthlyExpenses: (months: number): { month: string; total: number }[] => {
    const expenses = getAll<Expense>(STORAGE_KEYS.EXPENSES);
    const result: { month: string; total: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = date.toISOString().split('T')[0];
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const monthTotal = expenses
        .filter(e => e.expenseDate >= monthStart && e.expenseDate <= monthEnd)
        .reduce((sum, e) => sum + e.totalAmount, 0);

      result.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total: monthTotal,
      });
    }

    return result;
  },

  // Create a procurement expense with inventory transactions
  createProcurement: (
    vendorName: string,
    items: { productId: string; quantity: number; unitCost: number }[],
    paymentDetails: {
      paid: boolean;
      method?: PaymentMethod;
      reference?: string;
    },
    notes?: string
  ): { expense: Expense; transactions: InventoryTransaction[] } => {
    const today = new Date().toISOString().split('T')[0];

    // Build expense items
    const expenseItems: ExpenseItem[] = items.map(item => {
      const product = productService.getById(item.productId);
      return {
        description: product ? product.name : `Product ${item.productId}`,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost,
      };
    });

    const amount = expenseItems.reduce((sum, item) => sum + item.total, 0);

    // Create expense
    const expense = expenseService.create({
      expenseNumber: expenseService.generateExpenseNumber(),
      category: 'procurement',
      description: `Product procurement from ${vendorName}`,
      vendorName,
      amount,
      totalAmount: amount,
      amountPaid: paymentDetails.paid ? amount : 0,
      items: expenseItems,
      expenseDate: today,
      paymentStatus: paymentDetails.paid ? 'paid' : 'pending',
      paymentMethod: paymentDetails.method,
      paymentReference: paymentDetails.reference,
      paidDate: paymentDetails.paid ? today : undefined,
      notes,
    });

    // Create inventory transactions for each item
    const transactions: InventoryTransaction[] = items.map(item =>
      inventoryService.recordPurchase(
        item.productId,
        item.quantity,
        item.unitCost,
        expense.id,
        vendorName,
        `Procurement: ${expense.expenseNumber}`
      )
    );

    return { expense, transactions };
  },

  // Get total expenses for a period
  getTotal: (startDate: string, endDate: string): number => {
    const expenses = expenseService.getByDateRange(startDate, endDate);
    return expenses.reduce((sum, e) => sum + e.totalAmount, 0);
  },
};
