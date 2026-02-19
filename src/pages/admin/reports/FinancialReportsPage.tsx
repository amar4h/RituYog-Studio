import { useState } from 'react';
import { Card, PageLoading } from '../../../components/common';
import { paymentService, expenseService, invoiceService, inventoryService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { getToday, formatDate } from '../../../utils/dateUtils';
import { useFreshData } from '../../../hooks';
import { EXPENSE_CATEGORY_OPTIONS } from '../../../constants';
import type { ExpenseCategory } from '../../../types';

type PeriodPreset = 'current-fy' | 'prev-fy' | 'current-qtr' | 'prev-qtr' | 'this-month' | 'custom';

function getIndianFYDates(today: string) {
  const todayYear = parseInt(today.substring(0, 4), 10);
  const todayMonth = parseInt(today.substring(5, 7), 10);

  // Current FY: Apr 1 - Mar 31
  const fyStartYear = todayMonth >= 4 ? todayYear : todayYear - 1;
  const currentFYStart = `${fyStartYear}-04-01`;
  const currentFYEnd = `${fyStartYear + 1}-03-31`;
  const currentFYLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;

  // Previous FY
  const prevFYStart = `${fyStartYear - 1}-04-01`;
  const prevFYEnd = `${fyStartYear}-03-31`;
  const prevFYLabel = `FY ${fyStartYear - 1}-${String(fyStartYear).slice(2)}`;

  // Indian FY quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
  const fyQuarter = todayMonth >= 4 ? Math.ceil((todayMonth - 3) / 3) : Math.ceil((todayMonth + 9) / 3);
  const qStartMonth = ((fyQuarter - 1) * 3 + 4) > 12 ? ((fyQuarter - 1) * 3 + 4) - 12 : (fyQuarter - 1) * 3 + 4;
  const qStartYear = qStartMonth >= 4 ? fyStartYear : fyStartYear + 1;
  const qEndMonth = qStartMonth + 2 > 12 ? qStartMonth + 2 - 12 : qStartMonth + 2;
  const qEndYear = qEndMonth < qStartMonth ? qStartYear + 1 : qStartYear;
  const qEndDay = new Date(qEndYear, qEndMonth, 0).getDate();
  const currentQtrStart = `${qStartYear}-${String(qStartMonth).padStart(2, '0')}-01`;
  const currentQtrEnd = `${qEndYear}-${String(qEndMonth).padStart(2, '0')}-${String(qEndDay).padStart(2, '0')}`;
  const currentQtrLabel = `Q${fyQuarter} ${currentFYLabel}`;

  // Previous quarter
  const prevQ = fyQuarter === 1 ? 4 : fyQuarter - 1;
  const prevQFYStartYear = fyQuarter === 1 ? fyStartYear - 1 : fyStartYear;
  const prevQStartMonth = ((prevQ - 1) * 3 + 4) > 12 ? ((prevQ - 1) * 3 + 4) - 12 : (prevQ - 1) * 3 + 4;
  const prevQStartYear = prevQStartMonth >= 4 ? prevQFYStartYear : prevQFYStartYear + 1;
  const prevQEndMonth = prevQStartMonth + 2 > 12 ? prevQStartMonth + 2 - 12 : prevQStartMonth + 2;
  const prevQEndYear = prevQEndMonth < prevQStartMonth ? prevQStartYear + 1 : prevQStartYear;
  const prevQEndDay = new Date(prevQEndYear, prevQEndMonth, 0).getDate();
  const prevQtrStart = `${prevQStartYear}-${String(prevQStartMonth).padStart(2, '0')}-01`;
  const prevQtrEnd = `${prevQEndYear}-${String(prevQEndMonth).padStart(2, '0')}-${String(prevQEndDay).padStart(2, '0')}`;
  const prevQtrFYLabel = fyQuarter === 1 ? prevFYLabel : currentFYLabel;
  const prevQtrLabel = `Q${prevQ} ${prevQtrFYLabel}`;

  return {
    currentFYStart, currentFYEnd, currentFYLabel,
    prevFYStart, prevFYEnd, prevFYLabel,
    currentQtrStart, currentQtrEnd, currentQtrLabel,
    prevQtrStart, prevQtrEnd, prevQtrLabel,
  };
}

export function FinancialReportsPage() {
  const { isLoading } = useFreshData(['payments', 'expenses', 'invoices', 'inventory']);

  // Date range for reports
  const today = getToday();
  const fy = getIndianFYDates(today);
  const [activePreset, setActivePreset] = useState<PeriodPreset>('current-fy');
  const [startDate, setStartDate] = useState(fy.currentFYStart);
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

  // Monthly trend data based on selected period
  const getMonthlyData = () => {
    const allPayments = paymentService.getAll().filter(p => p.status === 'completed');
    const allExpensesList = expenseService.getAll();

    // Generate months between startDate and endDate
    const startYear = parseInt(startDate.substring(0, 4), 10);
    const startMonth = parseInt(startDate.substring(5, 7), 10);
    const endYear = parseInt(endDate.substring(0, 4), 10);
    const endMonth = parseInt(endDate.substring(5, 7), 10);

    const months: { month: string; revenue: number; expenses: number; profit: number }[] = [];
    let y = startYear;
    let m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;
      const monthStart = monthStr + '-01';
      const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;

      const monthRevenue = allPayments
        .filter(p => p.paymentDate >= monthStart && p.paymentDate <= monthEnd)
        .reduce((sum, p) => sum + p.amount, 0);

      const monthExp = allExpensesList
        .filter(e => e.expenseDate >= monthStart && e.expenseDate <= monthEnd)
        .reduce((sum, e) => sum + e.totalAmount, 0);

      const date = new Date(y, m - 1);
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        expenses: monthExp,
        profit: monthRevenue - monthExp,
      });

      m++;
      if (m > 12) { m = 1; y++; }
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

      {/* Period Selection */}
      <Card>
        <div className="space-y-3">
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-1.5 bg-gray-100 rounded-lg p-1">
            {([
              { key: 'current-fy' as PeriodPreset, label: fy.currentFYLabel, start: fy.currentFYStart, end: today },
              { key: 'current-qtr' as PeriodPreset, label: fy.currentQtrLabel, start: fy.currentQtrStart, end: today },
              { key: 'this-month' as PeriodPreset, label: 'This Month', start: today.substring(0, 7) + '-01', end: today },
              { key: 'prev-qtr' as PeriodPreset, label: fy.prevQtrLabel, start: fy.prevQtrStart, end: fy.prevQtrEnd },
              { key: 'prev-fy' as PeriodPreset, label: fy.prevFYLabel, start: fy.prevFYStart, end: fy.prevFYEnd },
              { key: 'custom' as PeriodPreset, label: 'Custom', start: '', end: '' },
            ]).map(({ key, label, start, end }) => (
              <button
                key={key}
                onClick={() => {
                  setActivePreset(key);
                  if (key !== 'custom') {
                    setStartDate(start);
                    setEndDate(end);
                  }
                }}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                  activePreset === key
                    ? 'bg-white text-indigo-600 shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date range (shown only when Custom is selected) */}
          {activePreset === 'custom' && (
            <div className="flex flex-wrap items-end gap-4 pt-1">
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
            </div>
          )}

          {/* Active period label */}
          <div className="text-xs text-gray-500">
            Showing: {formatDate(startDate)} — {formatDate(endDate)}
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-green-600 font-medium">Total Revenue</div>
            <div className="text-lg font-bold text-green-700 mt-0.5">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-green-500">{payments.length} payments</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-xs text-red-600 font-medium">Total Expenses</div>
            <div className="text-lg font-bold text-red-700 mt-0.5">{formatCurrency(totalExpenses)}</div>
            <div className="text-xs text-red-500">{expenses.length} records</div>
          </div>
          <div className={`p-3 rounded-lg ${grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`text-xs font-medium ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Net Profit</div>
            <div className={`text-lg font-bold mt-0.5 ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(grossProfit)}
            </div>
            <div className={`text-xs ${grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}% margin
            </div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg">
            <div className="text-xs text-indigo-600 font-medium">Product Profit</div>
            <div className="text-lg font-bold text-indigo-700 mt-0.5">{formatCurrency(productProfit)}</div>
            <div className="text-xs text-indigo-500">Rev: {formatCurrency(productRevenue)} · COGS: {formatCurrency(cogs.cogs)}</div>
          </div>
        </div>
      </Card>

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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trend</h3>
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
