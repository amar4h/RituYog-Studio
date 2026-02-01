import { useState, useMemo } from 'react';
import { Card, Button, Select, PageLoading } from '../../../components/common';
import { paymentService, expenseService, invoiceService, inventoryService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { getToday, formatDate } from '../../../utils/dateUtils';
import { useFreshData } from '../../../hooks';
import { EXPENSE_CATEGORY_OPTIONS } from '../../../constants';
import type { ExpenseCategory } from '../../../types';

export function FinancialReportsPage() {
  const { isLoading } = useFreshData(['payments', 'expenses', 'invoices', 'inventory']);

  // Date range for reports
  const today = getToday();
  const thisMonthStart = today.substring(0, 7) + '-01';
  const [startDate, setStartDate] = useState(thisMonthStart);
  const [endDate, setEndDate] = useState(today);

  if (isLoading) {
    return <PageLoading />;
  }

  // Calculate revenue breakdown
  const payments = paymentService.getAll().filter(p =>
    p.paymentDate >= startDate && p.paymentDate <= endDate && p.status === 'completed'
  );
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  // Get invoices to separate membership vs product revenue
  const invoices = invoiceService.getAll();
  const membershipRevenue = payments
    .filter(p => {
      const invoice = invoices.find(i => i.id === p.invoiceId);
      return invoice && invoice.invoiceType !== 'product-sale';
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const productRevenue = payments
    .filter(p => {
      const invoice = invoices.find(i => i.id === p.invoiceId);
      return invoice && invoice.invoiceType === 'product-sale';
    })
    .reduce((sum, p) => sum + p.amount, 0);

  // Calculate COGS (Cost of Goods Sold)
  const cogs = inventoryService.getCostOfGoodsSold(startDate, endDate);
  const productProfit = productRevenue - cogs.cogs;

  // Calculate expenses
  const expenses = expenseService.getAll().filter(e =>
    e.expenseDate >= startDate && e.expenseDate <= endDate
  );
  const totalExpenses = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

  // Expense breakdown by category
  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.totalAmount;
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  // Net profit
  const grossProfit = totalRevenue - totalExpenses;

  // Get category label
  const getCategoryLabel = (category: ExpenseCategory) => {
    return EXPENSE_CATEGORY_OPTIONS.find(c => c.value === category)?.label || category;
  };

  // Monthly trend data
  const getMonthlyData = () => {
    const allPayments = paymentService.getAll().filter(p => p.status === 'completed');
    const allExpenses = expenseService.getAll();

    // Get last 6 months
    const months: { month: string; revenue: number; expenses: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().substring(0, 7);
      const monthStart = monthStr + '-01';
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      const monthRevenue = allPayments
        .filter(p => p.paymentDate >= monthStart && p.paymentDate <= monthEnd)
        .reduce((sum, p) => sum + p.amount, 0);

      const monthExpenses = allExpenses
        .filter(e => e.expenseDate >= monthStart && e.expenseDate <= monthEnd)
        .reduce((sum, e) => sum + e.totalAmount, 0);

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }
    return months;
  };

  const monthlyData = getMonthlyData();
  const maxMonthlyValue = Math.max(...monthlyData.map(m => Math.max(m.revenue, m.expenses)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600">Revenue, expenses, and profit analysis</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(thisMonthStart);
                setEndDate(today);
              }}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                const lastMonthStart = lastMonth.toISOString().substring(0, 7) + '-01';
                const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0];
                setStartDate(lastMonthStart);
                setEndDate(lastMonthEnd);
              }}
            >
              Last Month
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {formatDate(startDate)} - {formatDate(endDate)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Expenses</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-gray-500 mt-1">{expenses.length} expense records</div>
        </Card>
        <Card className={`p-4 ${grossProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-sm text-gray-500">Net Profit</div>
          <div className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(grossProfit)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}% margin
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Product Sales Profit</div>
          <div className="text-2xl font-bold text-indigo-600">{formatCurrency(productProfit)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Revenue: {formatCurrency(productRevenue)} | COGS: {formatCurrency(cogs.cogs)}
          </div>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Membership Revenue</div>
                <div className="text-sm text-gray-500">Subscription payments</div>
              </div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(membershipRevenue)}</div>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Product Revenue</div>
                <div className="text-sm text-gray-500">Product sales</div>
              </div>
              <div className="text-xl font-bold text-purple-600">{formatCurrency(productRevenue)}</div>
            </div>
            {productRevenue > 0 && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Product COGS</div>
                  <div className="text-sm text-gray-500">Cost of goods sold</div>
                </div>
                <div className="text-xl font-bold text-gray-600">({formatCurrency(cogs.cogs)})</div>
              </div>
            )}
          </div>

          {/* Revenue pie chart visualization */}
          {totalRevenue > 0 && (
            <div className="mt-6">
              <div className="h-4 rounded-full overflow-hidden bg-gray-200 flex">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${(membershipRevenue / totalRevenue) * 100}%` }}
                  title={`Membership: ${formatCurrency(membershipRevenue)}`}
                />
                <div
                  className="bg-purple-500 h-full"
                  style={{ width: `${(productRevenue / totalRevenue) * 100}%` }}
                  title={`Products: ${formatCurrency(productRevenue)}`}
                />
              </div>
              <div className="flex justify-center gap-6 mt-2 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-500 rounded-full" />
                  Membership ({((membershipRevenue / totalRevenue) * 100).toFixed(0)}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-purple-500 rounded-full" />
                  Products ({((productRevenue / totalRevenue) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expense Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(expensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{getCategoryLabel(category as ExpenseCategory)}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${(amount / totalExpenses) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {((amount / totalExpenses) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            {Object.keys(expensesByCategory).length === 0 && (
              <p className="text-gray-500 text-center py-4">No expenses in this period</p>
            )}
          </div>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">6-Month Trend</h3>
        <div className="space-y-4">
          {/* Chart */}
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((month, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end h-40">
                  {/* Revenue bar */}
                  <div
                    className="flex-1 bg-green-400 rounded-t"
                    style={{ height: `${maxMonthlyValue > 0 ? (month.revenue / maxMonthlyValue) * 100 : 0}%` }}
                    title={`Revenue: ${formatCurrency(month.revenue)}`}
                  />
                  {/* Expense bar */}
                  <div
                    className="flex-1 bg-red-400 rounded-t"
                    style={{ height: `${maxMonthlyValue > 0 ? (month.expenses / maxMonthlyValue) * 100 : 0}%` }}
                    title={`Expenses: ${formatCurrency(month.expenses)}`}
                  />
                </div>
                <span className="text-xs text-gray-500">{month.month}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-400 rounded" />
              Revenue
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-400 rounded" />
              Expenses
            </span>
          </div>

          {/* Monthly breakdown table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Month</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Expenses</th>
                  <th className="text-right py-2">Profit</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{month.month}</td>
                    <td className="text-right text-green-600">{formatCurrency(month.revenue)}</td>
                    <td className="text-right text-red-600">{formatCurrency(month.expenses)}</td>
                    <td className={`text-right font-medium ${month.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(month.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
