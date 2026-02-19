import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input, EmptyState, EmptyIcons, PageLoading } from '../../../components/common';
import { invoiceService, memberService, productService } from '../../../services';
import { formatCurrency } from '../../../utils/formatUtils';
import { formatDate, getToday } from '../../../utils/dateUtils';
import { useFreshData } from '../../../hooks';

type PeriodMode = 'monthly' | 'quarterly' | 'annual';

interface SaleRow {
  invoice: { id: string; invoiceNumber: string; invoiceDate: string; memberId: string };
  memberName: string;
  itemsSummary: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface PeriodRow {
  label: string;
  sortKey: string;
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

function getMonthKey(date: string) {
  return date.substring(0, 7);
}

function getQuarterKey(date: string) {
  const year = date.substring(0, 4);
  const month = parseInt(date.substring(5, 7), 10);
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

function getYearKey(date: string) {
  return date.substring(0, 4);
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatQuarterLabel(key: string) {
  const [year, q] = key.split('-');
  return `${q} ${year}`;
}

export function SalesReportPage() {
  const { isLoading } = useFreshData(['invoices', 'members', 'products']);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const today = getToday();
  const thisMonth = today.substring(0, 7);

  // All hooks MUST be above the loading check (React hooks order rule)
  const allSales: SaleRow[] = useMemo(() => {
    if (isLoading) return [];

    // Build product name → costPrice lookup for invoices missing cost data
    const productCostMap = new Map<string, number>();
    for (const p of productService.getAll()) {
      productCostMap.set(p.name.toLowerCase(), p.costPrice);
    }

    const allInvoices = invoiceService.getAll();
    return allInvoices
      .filter(inv => inv.invoiceType === 'product-sale')
      .map(inv => {
        const member = memberService.getById(inv.memberId);
        const memberName = member ? `${member.firstName} ${member.lastName}`.trim() : 'Unknown';
        const items = inv.items || [];
        // Use totalAmount (after discounts + shipping) for actual revenue
        const revenue = inv.totalAmount;
        const cost = items.reduce((sum, item) => {
          const unitCost = item.cost ?? productCostMap.get(item.description.toLowerCase()) ?? 0;
          return sum + unitCost * (item.quantity || 1);
        }, 0);
        const profit = revenue - cost;
        const itemsSummary = items
          .map(item => `${item.quantity}x ${item.description}`)
          .join(', ');
        return { invoice: inv, memberName, itemsSummary, revenue, cost, profit };
      })
      .sort((a, b) => b.invoice.invoiceDate.localeCompare(a.invoice.invoiceDate));
  }, [isLoading]);

  const filteredSales = useMemo(() => {
    return allSales.filter(sale => {
      if (dateFrom && sale.invoice.invoiceDate < dateFrom) return false;
      if (dateTo && sale.invoice.invoiceDate > dateTo) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !sale.invoice.invoiceNumber.toLowerCase().includes(q) &&
          !sale.memberName.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allSales, dateFrom, dateTo, search]);

  const periodRows: PeriodRow[] = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number; cost: number }>();

    for (const sale of filteredSales) {
      const date = sale.invoice.invoiceDate;
      let key: string;
      if (periodMode === 'monthly') key = getMonthKey(date);
      else if (periodMode === 'quarterly') key = getQuarterKey(date);
      else key = getYearKey(date);

      const existing = map.get(key) || { count: 0, revenue: 0, cost: 0 };
      existing.count += 1;
      existing.revenue += sale.revenue;
      existing.cost += sale.cost;
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([key, data]) => {
        const profit = data.revenue - data.cost;
        const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
        let label: string;
        if (periodMode === 'monthly') label = formatMonthLabel(key);
        else if (periodMode === 'quarterly') label = formatQuarterLabel(key);
        else label = key;
        return { label, sortKey: key, ...data, profit, margin };
      })
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [filteredSales, periodMode]);

  // Summary stats (all-time)
  const totalRevenue = allSales.reduce((sum, s) => sum + s.revenue, 0);
  const totalCost = allSales.reduce((sum, s) => sum + s.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const thisMonthSales = allSales.filter(s => s.invoice.invoiceDate.startsWith(thisMonth));
  const thisMonthRevenue = thisMonthSales.reduce((sum, s) => sum + s.revenue, 0);

  if (isLoading) {
    return <PageLoading />;
  }

  // Quick date presets
  const setPreset = (preset: string) => {
    const now = new Date();
    if (preset === 'this-month') {
      setDateFrom(thisMonth + '-01');
      setDateTo(today);
    } else if (preset === 'this-quarter') {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      setDateFrom(qStart.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (preset === 'this-year') {
      // Indian Financial Year: Apr 1 - Mar 31
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setDateFrom(`${fyStartYear}-04-01`);
      setDateTo(today);
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
          <p className="text-gray-600">Product sales, costs, and profit analysis</p>
        </div>
        <Link to="/admin/sales/product">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Sale
          </Button>
        </Link>
      </div>

      {/* Summary Tiles */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-green-600 font-medium">Total Sales</div>
            <div className="text-lg font-bold text-green-700 mt-0.5">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-green-500">{allSales.length} invoices</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 font-medium">Total Cost</div>
            <div className="text-lg font-bold text-gray-700 mt-0.5">{formatCurrency(totalCost)}</div>
            <div className="text-xs text-gray-400">Cost of goods sold</div>
          </div>
          <div className={`p-3 rounded-lg ${totalProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div className={`text-xs font-medium ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Total Profit</div>
            <div className={`text-lg font-bold mt-0.5 ${totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(totalProfit)}
            </div>
            {totalRevenue > 0 && (
              <div className={`text-xs ${totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {((totalProfit / totalRevenue) * 100).toFixed(0)}% margin
              </div>
            )}
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">This Month</div>
            <div className="text-lg font-bold text-blue-700 mt-0.5">{formatCurrency(thisMonthRevenue)}</div>
            <div className="text-xs text-blue-500">{thisMonthSales.length} sales</div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Search invoice # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="From"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="To"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreset('this-month')}>This Month</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('this-quarter')}>This Quarter</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('this-year')}>This FY</Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('all')}>All Time</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Period Toggle + Period Breakdown */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="text-lg font-medium text-gray-900">Period Breakdown</h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['monthly', 'quarterly', 'annual'] as PeriodMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setPeriodMode(mode)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  periodMode === mode
                    ? 'bg-white text-indigo-600 shadow-sm font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {periodRows.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No sales in selected period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Period</th>
                  <th className="text-right py-2 font-medium"># Sales</th>
                  <th className="text-right py-2 font-medium">Revenue</th>
                  <th className="text-right py-2 font-medium hidden sm:table-cell">Cost</th>
                  <th className="text-right py-2 font-medium">Profit</th>
                  <th className="text-right py-2 font-medium hidden sm:table-cell">Margin</th>
                </tr>
              </thead>
              <tbody>
                {periodRows.map(row => (
                  <tr key={row.sortKey} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{row.label}</td>
                    <td className="py-2 text-right text-gray-600">{row.count}</td>
                    <td className="py-2 text-right text-green-600">{formatCurrency(row.revenue)}</td>
                    <td className="py-2 text-right text-gray-500 hidden sm:table-cell">{formatCurrency(row.cost)}</td>
                    <td className={`py-2 text-right font-medium ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.profit)}
                    </td>
                    <td className={`py-2 text-right hidden sm:table-cell ${row.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                {periodRows.length > 1 && (() => {
                  const totR = filteredSales.reduce((s, r) => s + r.revenue, 0);
                  const totC = filteredSales.reduce((s, r) => s + r.cost, 0);
                  const totP = totR - totC;
                  const totM = totR > 0 ? (totP / totR) * 100 : 0;
                  return (
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-2 text-gray-900">Total</td>
                      <td className="py-2 text-right text-gray-600">{filteredSales.length}</td>
                      <td className="py-2 text-right text-green-700">{formatCurrency(totR)}</td>
                      <td className="py-2 text-right text-gray-600 hidden sm:table-cell">{formatCurrency(totC)}</td>
                      <td className={`py-2 text-right ${totP >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(totP)}
                      </td>
                      <td className={`py-2 text-right hidden sm:table-cell ${totM >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {totM.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Individual Sales */}
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Individual Sales
          <span className="text-sm font-normal text-gray-500 ml-2">
            {filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'}
          </span>
        </h3>

        {filteredSales.length === 0 ? (
          <EmptyState
            icon={EmptyIcons.document}
            title="No sales found"
            description={search || dateFrom || dateTo
              ? "Try adjusting your filters."
              : "Product sales will appear here once recorded."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 font-medium">Invoice</th>
                  <th className="text-left py-2 font-medium hidden md:table-cell">Date</th>
                  <th className="text-left py-2 font-medium">Customer</th>
                  <th className="text-left py-2 font-medium hidden lg:table-cell">Items</th>
                  <th className="text-right py-2 font-medium">Revenue</th>
                  <th className="text-right py-2 font-medium hidden sm:table-cell">Cost</th>
                  <th className="text-right py-2 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.invoice.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      <Link
                        to={`/admin/invoices/${sale.invoice.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {sale.invoice.invoiceNumber}
                      </Link>
                      <div className="text-xs text-gray-400 md:hidden">
                        <span className="whitespace-nowrap">{formatDate(sale.invoice.invoiceDate)}</span>
                      </div>
                    </td>
                    <td className="py-2 text-gray-600 hidden md:table-cell">
                      <span className="whitespace-nowrap">{formatDate(sale.invoice.invoiceDate)}</span>
                    </td>
                    <td className="py-2 text-gray-700">{sale.memberName}</td>
                    <td className="py-2 text-gray-500 hidden lg:table-cell max-w-xs truncate" title={sale.itemsSummary}>
                      {sale.itemsSummary}
                    </td>
                    <td className="py-2 text-right text-green-600">{formatCurrency(sale.revenue)}</td>
                    <td className="py-2 text-right text-gray-500 hidden sm:table-cell">{formatCurrency(sale.cost)}</td>
                    <td className={`py-2 text-right font-medium ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(sale.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
