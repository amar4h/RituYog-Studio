import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, DataTable, StatusBadge, EmptyState, EmptyIcons, Alert, PageLoading } from '../../../components/common';
import { expenseService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { formatDate, getToday } from '../../../utils/dateUtils';
import { useFreshData } from '../../../hooks';
import { EXPENSE_CATEGORY_OPTIONS, EXPENSE_PAYMENT_STATUS_OPTIONS } from '../../../constants';
import type { Expense, ExpenseCategory, ExpensePaymentStatus } from '../../../types';
import type { Column } from '../../../components/common';

export function ExpenseListPage() {
  const { isLoading } = useFreshData(['expenses']);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (isLoading) {
    return <PageLoading />;
  }

  const allExpenses = expenseService.getAll();

  // Filter expenses
  const expenses = allExpenses.filter(expense => {
    const matchesSearch = !search ||
      expense.expenseNumber.toLowerCase().includes(search.toLowerCase()) ||
      expense.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      expense.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !categoryFilter || expense.category === categoryFilter;
    const matchesStatus = !statusFilter || expense.paymentStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate totals
  const today = getToday();
  const thisMonth = today.substring(0, 7); // YYYY-MM
  const thisMonthExpenses = allExpenses.filter(e => e.expenseDate.startsWith(thisMonth));
  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const pendingExpenses = allExpenses.filter(e => e.paymentStatus === 'pending' || e.paymentStatus === 'partial');
  const pendingTotal = pendingExpenses.reduce((sum, e) => sum + (e.totalAmount - e.amountPaid), 0);

  const getCategoryLabel = (category: ExpenseCategory) => {
    return EXPENSE_CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
  };

  const getStatusBadge = (status: ExpensePaymentStatus) => {
    // StatusBadge auto-formats and maps status strings to colors
    // paid → green, partial → yellow, pending → yellow
    return <StatusBadge status={status} />;
  };

  const columns: Column<Expense>[] = [
    {
      key: 'expense',
      header: 'Expense',
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
      render: (expense) => (
        <span className="text-gray-600">{expense.vendorName}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
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
      render: (expense) => (
        <span className="text-gray-600">{formatDate(expense.expenseDate)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
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
      render: (expense) => getStatusBadge(expense.paymentStatus),
    },
    {
      key: 'actions',
      header: '',
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Expenses</div>
          <div className="text-2xl font-bold text-gray-900">{allExpenses.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">This Month</div>
          <div className="text-2xl font-bold text-indigo-600">{formatCurrency(thisMonthTotal)}</div>
        </Card>
        <Card className={`p-4 ${pendingTotal > 0 ? 'bg-amber-50 border-amber-200' : ''}`}>
          <div className="text-sm text-gray-500">Pending Payments</div>
          <div className={`text-2xl font-bold ${pendingTotal > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {formatCurrency(pendingTotal)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Pending Count</div>
          <div className="text-2xl font-bold text-gray-900">{pendingExpenses.length}</div>
        </Card>
      </div>

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
