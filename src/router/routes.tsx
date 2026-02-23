import { RouteObject, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { MemberProtectedRoute } from './MemberProtectedRoute';
import { AdminLayout } from '../components/layout/AdminLayout';
import { MemberLayout } from '../components/layout/MemberLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ErrorPage } from '../components/common/ErrorPage';

// Public pages
import { LoginPage } from '../pages/public/LoginPage';

// Lazy load admin pages for better performance
import { lazy, Suspense } from 'react';
import { PageLoading } from '../components/common/LoadingSpinner';

// Admin pages - lazy loaded
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })));
const MemberListPage = lazy(() => import('../pages/admin/MemberListPage').then(m => ({ default: m.MemberListPage })));
const MemberDetailPage = lazy(() => import('../pages/admin/MemberDetailPage').then(m => ({ default: m.MemberDetailPage })));
const MemberFormPage = lazy(() => import('../pages/admin/MemberFormPage').then(m => ({ default: m.MemberFormPage })));
const LeadListPage = lazy(() => import('../pages/admin/LeadListPage').then(m => ({ default: m.LeadListPage })));
const LeadDetailPage = lazy(() => import('../pages/admin/LeadDetailPage').then(m => ({ default: m.LeadDetailPage })));
const LeadFormPage = lazy(() => import('../pages/admin/LeadFormPage').then(m => ({ default: m.LeadFormPage })));
const SessionsPage = lazy(() => import('../pages/admin/SessionsPage').then(m => ({ default: m.SessionsPage })));
const AttendancePage = lazy(() => import('../pages/admin/AttendancePage').then(m => ({ default: m.AttendancePage })));
const PlanListPage = lazy(() => import('../pages/admin/PlanListPage').then(m => ({ default: m.PlanListPage })));
const SubscriptionListPage = lazy(() => import('../pages/admin/SubscriptionListPage').then(m => ({ default: m.SubscriptionListPage })));
const SubscriptionFormPage = lazy(() => import('../pages/admin/SubscriptionFormPage').then(m => ({ default: m.SubscriptionFormPage })));
const InvoiceListPage = lazy(() => import('../pages/admin/InvoiceListPage').then(m => ({ default: m.InvoiceListPage })));
const InvoiceDetailPage = lazy(() => import('../pages/admin/InvoiceDetailPage').then(m => ({ default: m.InvoiceDetailPage })));
const PaymentListPage = lazy(() => import('../pages/admin/PaymentListPage').then(m => ({ default: m.PaymentListPage })));
const RecordPaymentPage = lazy(() => import('../pages/admin/RecordPaymentPage').then(m => ({ default: m.RecordPaymentPage })));
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('../pages/admin/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

// Products, Inventory & Expenses - lazy loaded
const ProductListPage = lazy(() => import('../pages/admin/products/ProductListPage').then(m => ({ default: m.ProductListPage })));
const ProductFormPage = lazy(() => import('../pages/admin/products/ProductFormPage').then(m => ({ default: m.ProductFormPage })));
const InventoryPage = lazy(() => import('../pages/admin/inventory/InventoryPage').then(m => ({ default: m.InventoryPage })));
const ExpenseListPage = lazy(() => import('../pages/admin/expenses/ExpenseListPage').then(m => ({ default: m.ExpenseListPage })));
const ExpenseFormPage = lazy(() => import('../pages/admin/expenses/ExpenseFormPage').then(m => ({ default: m.ExpenseFormPage })));
const ProductSalePage = lazy(() => import('../pages/admin/sales/ProductSalePage').then(m => ({ default: m.ProductSalePage })));
const SalesReportPage = lazy(() => import('../pages/admin/sales/SalesReportPage').then(m => ({ default: m.SalesReportPage })));
const FinancialReportsPage = lazy(() => import('../pages/admin/reports/FinancialReportsPage').then(m => ({ default: m.FinancialReportsPage })));

// Session Planning - lazy loaded
const AsanaListPage = lazy(() => import('../pages/admin/session-planning/AsanaListPage').then(m => ({ default: m.AsanaListPage })));
const AsanaFormPage = lazy(() => import('../pages/admin/session-planning/AsanaFormPage').then(m => ({ default: m.AsanaFormPage })));
const SessionPlanListPage = lazy(() => import('../pages/admin/session-planning/SessionPlanListPage').then(m => ({ default: m.SessionPlanListPage })));
const SessionPlanFormPage = lazy(() => import('../pages/admin/session-planning/SessionPlanFormPage').then(m => ({ default: m.SessionPlanFormPage })));
const SessionPlanDetailPage = lazy(() => import('../pages/admin/session-planning/SessionPlanDetailPage').then(m => ({ default: m.SessionPlanDetailPage })));
const SessionAllocationPage = lazy(() => import('../pages/admin/session-planning/SessionAllocationPage').then(m => ({ default: m.SessionAllocationPage })));
const SessionExecutionListPage = lazy(() => import('../pages/admin/session-planning/SessionExecutionListPage').then(m => ({ default: m.SessionExecutionListPage })));
const RecordExecutionPage = lazy(() => import('../pages/admin/session-planning/RecordExecutionPage').then(m => ({ default: m.RecordExecutionPage })));
const SessionReportsPage = lazy(() => import('../pages/admin/session-planning/SessionReportsPage').then(m => ({ default: m.SessionReportsPage })));

// Public pages - lazy loaded
const HomePage = lazy(() => import('../pages/public/HomePage').then(m => ({ default: m.HomePage })));
const RegisterPage = lazy(() => import('../pages/public/RegisterPage').then(m => ({ default: m.RegisterPage })));
const BookTrialPage = lazy(() => import('../pages/public/BookTrialPage').then(m => ({ default: m.BookTrialPage })));
const LeadCompletionPage = lazy(() => import('../pages/public/LeadCompletionPage').then(m => ({ default: m.LeadCompletionPage })));

// Member portal - lazy loaded
const MemberLoginPage = lazy(() => import('../pages/member/MemberLoginPage').then(m => ({ default: m.MemberLoginPage })));
const MemberHomePage = lazy(() => import('../pages/member/MemberHomePage').then(m => ({ default: m.MemberHomePage })));
const MemberReportPage = lazy(() => import('../pages/member/MemberReportPage').then(m => ({ default: m.MemberReportPage })));
const MemberBatchReportPage = lazy(() => import('../pages/member/BatchReportPage').then(m => ({ default: m.BatchReportPage })));
const MemberSettingsPage = lazy(() => import('../pages/member/MemberSettingsPage').then(m => ({ default: m.MemberSettingsPage })));
const MemberAttendancePage = lazy(() => import('../pages/member/MemberAttendancePage').then(m => ({ default: m.MemberAttendancePage })));
const MemberMembershipPage = lazy(() => import('../pages/member/MemberMembershipPage').then(m => ({ default: m.MemberMembershipPage })));

// Suspense wrapper for lazy components
function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

export const routes: RouteObject[] = [
  // Public routes (with shared header/footer)
  {
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: (
          <SuspenseWrapper>
            <HomePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: (
          <SuspenseWrapper>
            <RegisterPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/book-trial',
        element: (
          <SuspenseWrapper>
            <BookTrialPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/complete-registration/:token',
        element: (
          <SuspenseWrapper>
            <LeadCompletionPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/member/login',
        element: (
          <SuspenseWrapper>
            <MemberLoginPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Admin routes (protected)
  {
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <AdminLayout />,
        errorElement: <ErrorPage />,
        children: [
          // Dashboard
          {
            path: '/admin',
            element: (
              <SuspenseWrapper>
                <DashboardPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/dashboard',
            element: (
              <SuspenseWrapper>
                <DashboardPage />
              </SuspenseWrapper>
            ),
          },

          // Members
          {
            path: '/admin/members',
            element: (
              <SuspenseWrapper>
                <MemberListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/members/new',
            element: (
              <SuspenseWrapper>
                <MemberFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/members/:id',
            element: (
              <SuspenseWrapper>
                <MemberDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/members/:id/edit',
            element: (
              <SuspenseWrapper>
                <MemberFormPage />
              </SuspenseWrapper>
            ),
          },

          // Leads
          {
            path: '/admin/leads',
            element: (
              <SuspenseWrapper>
                <LeadListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/leads/:id',
            element: (
              <SuspenseWrapper>
                <LeadDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/leads/:id/edit',
            element: (
              <SuspenseWrapper>
                <LeadFormPage />
              </SuspenseWrapper>
            ),
          },

          // Sessions
          {
            path: '/admin/sessions',
            element: (
              <SuspenseWrapper>
                <SessionsPage />
              </SuspenseWrapper>
            ),
          },

          // Attendance
          {
            path: '/admin/attendance',
            element: (
              <SuspenseWrapper>
                <AttendancePage />
              </SuspenseWrapper>
            ),
          },

          // Memberships (Plans)
          {
            path: '/admin/memberships',
            element: (
              <SuspenseWrapper>
                <PlanListPage />
              </SuspenseWrapper>
            ),
          },

          // Subscriptions
          {
            path: '/admin/subscriptions',
            element: (
              <SuspenseWrapper>
                <SubscriptionListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/subscriptions/new',
            element: (
              <SuspenseWrapper>
                <SubscriptionFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/subscriptions/:id',
            element: (
              <SuspenseWrapper>
                <SubscriptionFormPage />
              </SuspenseWrapper>
            ),
          },

          // Invoices
          {
            path: '/admin/invoices',
            element: (
              <SuspenseWrapper>
                <InvoiceListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/invoices/:id',
            element: (
              <SuspenseWrapper>
                <InvoiceDetailPage />
              </SuspenseWrapper>
            ),
          },

          // Payments
          {
            path: '/admin/payments',
            element: (
              <SuspenseWrapper>
                <PaymentListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/payments/record',
            element: (
              <SuspenseWrapper>
                <RecordPaymentPage />
              </SuspenseWrapper>
            ),
          },

          // Products
          {
            path: '/admin/products',
            element: (
              <SuspenseWrapper>
                <ProductListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/products/new',
            element: (
              <SuspenseWrapper>
                <ProductFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/products/:id',
            element: (
              <SuspenseWrapper>
                <ProductFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/products/:id/edit',
            element: (
              <SuspenseWrapper>
                <ProductFormPage />
              </SuspenseWrapper>
            ),
          },

          // Inventory
          {
            path: '/admin/inventory',
            element: (
              <SuspenseWrapper>
                <InventoryPage />
              </SuspenseWrapper>
            ),
          },

          // Expenses
          {
            path: '/admin/expenses',
            element: (
              <SuspenseWrapper>
                <ExpenseListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/expenses/new',
            element: (
              <SuspenseWrapper>
                <ExpenseFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/expenses/:id',
            element: (
              <SuspenseWrapper>
                <ExpenseFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/expenses/:id/edit',
            element: (
              <SuspenseWrapper>
                <ExpenseFormPage />
              </SuspenseWrapper>
            ),
          },

          // Product Sales
          {
            path: '/admin/sales/product',
            element: (
              <SuspenseWrapper>
                <ProductSalePage />
              </SuspenseWrapper>
            ),
          },

          // Sales Report
          {
            path: '/admin/sales/report',
            element: (
              <SuspenseWrapper>
                <SalesReportPage />
              </SuspenseWrapper>
            ),
          },

          // Financial Reports
          {
            path: '/admin/reports',
            element: (
              <SuspenseWrapper>
                <FinancialReportsPage />
              </SuspenseWrapper>
            ),
          },

          // Session Planning - Asanas
          {
            path: '/admin/asanas',
            element: (
              <SuspenseWrapper>
                <AsanaListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/asanas/new',
            element: (
              <SuspenseWrapper>
                <AsanaFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/asanas/:id',
            element: (
              <SuspenseWrapper>
                <AsanaFormPage />
              </SuspenseWrapper>
            ),
          },

          // Session Planning - Session Plans
          {
            path: '/admin/session-plans',
            element: (
              <SuspenseWrapper>
                <SessionPlanListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/session-plans/new',
            element: (
              <SuspenseWrapper>
                <SessionPlanFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/session-plans/:id',
            element: (
              <SuspenseWrapper>
                <SessionPlanDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/session-plans/:id/edit',
            element: (
              <SuspenseWrapper>
                <SessionPlanFormPage />
              </SuspenseWrapper>
            ),
          },

          // Session Planning - Allocations
          {
            path: '/admin/session-allocations',
            element: (
              <SuspenseWrapper>
                <SessionAllocationPage />
              </SuspenseWrapper>
            ),
          },

          // Session Planning - Executions
          {
            path: '/admin/session-executions',
            element: (
              <SuspenseWrapper>
                <SessionExecutionListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/admin/session-executions/record',
            element: (
              <SuspenseWrapper>
                <RecordExecutionPage />
              </SuspenseWrapper>
            ),
          },

          // Session Planning - Reports
          {
            path: '/admin/session-reports',
            element: (
              <SuspenseWrapper>
                <SessionReportsPage />
              </SuspenseWrapper>
            ),
          },

          // Settings
          {
            path: '/admin/settings',
            element: (
              <SuspenseWrapper>
                <SettingsPage />
              </SuspenseWrapper>
            ),
          },

          // Notifications
          {
            path: '/admin/notifications',
            element: (
              <SuspenseWrapper>
                <NotificationsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },

  // Member portal - protected
  {
    element: <MemberProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <MemberLayout />,
        children: [
          {
            path: '/member',
            element: (
              <SuspenseWrapper>
                <MemberHomePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/member/my-report',
            element: (
              <SuspenseWrapper>
                <MemberReportPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/member/batch-report',
            element: (
              <SuspenseWrapper>
                <MemberBatchReportPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/member/attendance',
            element: (
              <SuspenseWrapper>
                <MemberAttendancePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/member/membership',
            element: (
              <SuspenseWrapper>
                <MemberMembershipPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/member/settings',
            element: (
              <SuspenseWrapper>
                <MemberSettingsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },

  // 404 catch-all
  {
    path: '*',
    element: <Navigate to="/admin/dashboard" replace />,
  },
];
