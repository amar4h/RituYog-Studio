import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Alert, PageLoading } from '../../../components/common';
import { expenseService, inventoryService, productService, invoiceService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { formatDate, getToday } from '../../../utils/dateUtils';
import { useFreshData } from '../../../hooks';
import { EXPENSE_CATEGORY_OPTIONS, EXPENSE_PAYMENT_STATUS_OPTIONS } from '../../../constants';
import type { Expense, ExpenseCategory, ExpensePaymentStatus } from '../../../types';
import type { Column } from '../../../components/common';

type BreakdownPeriod = 'fy' | 'quarter' | 'month';

function getExpenseBreakdown(allExpenses: Expense[], startDate: string, endDate: string) {
  const periodExpenses = allExpenses.filter(
    e => e.expenseDate >= startDate && e.expenseDate <= endDate
  );
  const totalSpent = periodExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const procurement = periodExpenses.filter(e => e.category === 'procurement').reduce((sum, e) => sum + e.totalAmount, 0);
  const studioExpenses = totalSpent - procurement;

  // COGS and consumed from inventory transactions in the same period
  const txns = inventoryService.getByDateRange(startDate, endDate);
  const cogs = txns.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.totalValue, 0);
  const consumed = txns.filter(t => t.type === 'consumed').reduce((sum, t) => sum + t.totalValue, 0);

  // Product sales revenue from invoices in the same period
  const productCostMap = new Map<string, number>();
  for (const p of productService.getAll()) {
    productCostMap.set(p.name.toLowerCase(), p.costPrice);
  }
  const salesInvoices = invoiceService.getAll().filter(
    inv => inv.invoiceType === 'product-sale' && inv.invoiceDate >= startDate && inv.invoiceDate <= endDate
  );
  const salesRevenue = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const salesCost = salesInvoices.reduce((sum, inv) => {
    const items = inv.items || [];
    return sum + items.reduce((s, item) => {
      const unitCost = item.cost ?? productCostMap.get(item.description.toLowerCase()) ?? 0;
      return s + unitCost * (item.quantity || 1);
    }, 0);
  }, 0);

  return { totalSpent, procurement, studioExpenses, cogs, consumed, salesRevenue, salesCost };
}

export function ExpenseListPage() {
  const { isLoading } = useFreshData(['expenses', 'inventory', 'products', 'invoices']);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [bdPeriod, setBdPeriod] = useState<BreakdownPeriod>('fy');

  if (isLoading) {
    return <PageLoading />;
  }

  const allExpenses = expenseService.getAll();

  // Calculate period dates
  const today = getToday();
  const thisMonth = today.substring(0, 7); // YYYY-MM
  // Indian Financial Year: Apr 1 - Mar 31
  const todayYear = parseInt(today.substring(0, 4), 10);
  const todayMonth = parseInt(today.substring(5, 7), 10);
  const fyStartYear = todayMonth >= 4 ? todayYear : todayYear - 1;
  const fyStart = `${fyStartYear}-04-01`;
  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
  // Quarter start (Indian FY quarters: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar)
  const fyQuarter = todayMonth >= 4 ? Math.ceil((todayMonth - 3) / 3) : Math.ceil((todayMonth + 9) / 3);
  const qStartMonth = ((fyQuarter - 1) * 3 + 4) > 12 ? ((fyQuarter - 1) * 3 + 4) - 12 : (fyQuarter - 1) * 3 + 4;
  const qStartYear = qStartMonth >= 4 ? fyStartYear : fyStartYear + 1;
  const qStart = `${qStartYear}-${String(qStartMonth).padStart(2, '0')}-01`;
  const qLabel = `Q${fyQuarter} ${fyLabel}`;

  // Selected period range
  const bdStart = bdPeriod === 'fy' ? fyStart : bdPeriod === 'quarter' ? qStart : thisMonth + '-01';

  // Filter expenses by period + search/category/status
  const expenses = allExpenses.filter(expense => {
    const inPeriod = expense.expenseDate >= bdStart && expense.expenseDate <= today;
    const matchesSearch = !search ||
      expense.expenseNumber.toLowerCase().includes(search.toLowerCase()) ||
      expense.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      expense.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    const matchesStatus = !statusFilter || expense.paymentStatus === statusFilter;

    return inPeriod && matchesSearch && matchesCategory && matchesStatus;
  });

  // Expense & inventory breakdown for selected period
  const bd = getExpenseBreakdown(allExpenses, bdStart, today);
  const stockValue = productService.getStockValue();

  const getCategoryLabel = (category: ExpenseCategory) => {
    return EXPENSE_CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
  };

  const getStatusBadge = (status: ExpensePaymentStatus) => {
    return <StatusBadge status={status} />;
  };

  const columns: Column<Expense>[] = [
    {
      key: 'expense',
      header: 'Expense',
      sortValue: (expense) => expense.expenseNumber,
      render: (expense) => (
        <div>
          <Link
            to={`/admin/expenses/${expense.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600"
          >
            {expense.expenseNumber}
          </Link>
          <p className="text-sm text-gray-500">{expense.description}</p>
        </div>
      ),
    },
    {
      key: 'vendor',
      header: 'Vendor',
      sortValue: (expense) => expense.vendorName.toLowerCase(),
      render: (expense) => (
        <span className="text-gray-600">{expense.vendorName}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortValue: (expense) => expense.category,
      render: (expense) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          expense.category === 'procurement' ? 'bg-purple-100 text-purple-700' :
          expense.category === 'rent' ? 'bg-blue-100 text-blue-700' :
          expense.category === 'utilities' ? 'bg-cyan-100 text-cyan-700' :
          expense.category === 'salaries' ? 'bg-green-100 text-green-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {getCategoryLabel(expense.category)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (expense) => expense.expenseDate,
      render: (expense) => (
        <span className="text-gray-600 whitespace-nowrap">{formatDate(expense.expenseDate)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortValue: (expense) => expense.totalAmount,
      align: 'right' as const,
      render: (expense) => (
        <div className="text-right">
          <div className="font-medium text-gray-900">{formatCurrency(expense.totalAmount)}</div>
          {expense.paymentStatus !== 'paid' && expense.amountPaid > 0 && (
            <div className="text-sm text-gray-500">Paid: {formatCurrency(expense.amountPaid)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (expense) => expense.paymentStatus,
      render: (expense) => getStatusBadge(expense.paymentStatus),
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      render: (expense) => (
        <div className="flex gap-2 justify-end">
          <Link to={`/admin/expenses/${expense.id}/edit`}>
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
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track and manage studio expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/expenses/new?category=procurement')}>
            Record Purchase
          </Button>
          <Button onClick={() => navigate('/admin/expenses/new')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
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

      {/* Expense & Inventory Overview */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <h3 className="text-base font-medium text-gray-900">Expense & Inventory</h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { key: 'fy' as BreakdownPeriod, label: fyLabel },
              { key: 'quarter' as BreakdownPeriod, label: qLabel },
              { key: 'month' as BreakdownPeriod, label: 'Month' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setBdPeriod(key)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap ${
                  bdPeriod === key
                    ? 'bg-white text-indigo-600 shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Spending row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-500 font-medium">Total Spent</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(bd.totalSpent)}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-xs text-purple-600 font-medium">Procurement</div>
            <div className="text-lg font-bold text-purple-700 mt-0.5">{formatCurrency(bd.procurement)}</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-red-600 font-medium">Studio Expenses</div>
            <div className="text-lg font-bold text-red-700 mt-0.5">{formatCurrency(bd.studioExpenses)}</div>
            <div className="text-xs text-red-400">Rent, utilities, etc.</div>
          </div>
        </div>

        {/* Inventory row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-green-600 font-medium">Products Sold</div>
            <div className="text-lg font-bold text-green-700 mt-0.5">{formatCurrency(bd.salesRevenue)}</div>
            <div className="text-xs text-green-500">Cost: {formatCurrency(bd.salesCost)}</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="text-xs text-orange-600 font-medium">Studio Use</div>
            <div className="text-lg font-bold text-orange-700 mt-0.5">{formatCurrency(bd.consumed)}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">In Stock</div>
            <div className="text-lg font-bold text-blue-700 mt-0.5">{formatCurrency(stockValue.totalCost)}</div>
            <div className="text-xs text-blue-500">Value: {formatCurrency(stockValue.totalValue)} · {stockValue.totalItems} items</div>
          </div>
          <div className={`p-3 rounded-lg ${bd.salesRevenue - bd.salesCost >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`text-xs font-medium ${bd.salesRevenue - bd.salesCost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Sales Profit</div>
            <div className={`text-lg font-bold mt-0.5 ${bd.salesRevenue - bd.salesCost >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(bd.salesRevenue - bd.salesCost)}
            </div>
            {bd.salesRevenue > 0 && (
              <div className={`text-xs ${bd.salesRevenue - bd.salesCost >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {((bd.salesRevenue - bd.salesCost) / bd.salesRevenue * 100).toFixed(0)}% margin
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search by number, vendor, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              ...EXPENSE_CATEGORY_OPTIONS,
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              ...EXPENSE_PAYMENT_STATUS_OPTIONS,
            ]}
          />
          <div className="flex items-center">
            <span className="text-sm text-gray-600">
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} found
            </span>
          </div>
        </div>
      </Card>

      {/* Expenses table */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={EmptyIcons.document}
          title="No expenses found"
          description={search || categoryFilter || statusFilter
            ? "Try adjusting your filters to find what you're looking for."
            : "Get started by recording your first expense."
          }
          action={
            !search && !categoryFilter && !statusFilter && (
              <Link to="/admin/expenses/new">
                <Button>Add Expense</Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <DataTable
            data={expenses}
            columns={columns}
            keyExtractor={(expense) => expense.id}
          />
        </Card>
      )}
    </div>
  );
}
