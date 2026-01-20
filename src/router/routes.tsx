import { RouteObject, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminLayout } from '../components/layout/AdminLayout';
import { PublicLayout } from '../components/layout/PublicLayout';

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

// Public pages - lazy loaded
const HomePage = lazy(() => import('../pages/public/HomePage').then(m => ({ default: m.HomePage })));
const RegisterPage = lazy(() => import('../pages/public/RegisterPage').then(m => ({ default: m.RegisterPage })));
const BookTrialPage = lazy(() => import('../pages/public/BookTrialPage').then(m => ({ default: m.BookTrialPage })));

// Suspense wrapper for lazy components
function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

export const routes: RouteObject[] = [
  // Login page (no layout)
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Public routes
  {
    element: <PublicLayout />,
    children: [
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
    ],
  },

  // Admin routes (protected)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
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

          // Settings
          {
            path: '/admin/settings',
            element: (
              <SuspenseWrapper>
                <SettingsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },

  // Home page (public landing)
  {
    path: '/',
    element: (
      <SuspenseWrapper>
        <HomePage />
      </SuspenseWrapper>
    ),
  },

  // 404 catch-all
  {
    path: '*',
    element: <Navigate to="/admin/dashboard" replace />,
  },
];
