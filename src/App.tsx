import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';

// Customer Pages
import { HomePage } from './pages/HomePage.tsx';
import { MarketplacePage } from './pages/MarketplacePage.tsx';
import { ListingDetailPage } from './pages/ListingDetailPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.tsx';
import { TrackOrderPage } from './pages/TrackOrderPage.tsx';
import { OrderDetailPage } from './pages/OrderDetailPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { SignupPage } from './pages/SignupPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AccountSecurityPage } from './pages/AccountSecurityPage.tsx';
import { SetupOwnerPage } from './pages/SetupOwnerPage.tsx';
import { AdminInvitePage } from './pages/AdminInvitePage.tsx';

// Admin Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage.tsx';
import { ListingsPage } from './pages/admin/ListingsPage.tsx';
import { ListingCreatePage } from './pages/admin/ListingCreatePage.tsx';
import { ListingEditPage } from './pages/admin/ListingEditPage.tsx';
import { ListingPreviewPage } from './pages/admin/ListingPreviewPage.tsx';
import { CategoriesPage } from './pages/admin/CategoriesPage.tsx';
import { OrdersPage } from './pages/admin/OrdersPage.tsx';
import { OrderDetailAdminPage } from './pages/admin/OrderDetailAdminPage.tsx';
import { PaymentsPage } from './pages/admin/PaymentsPage.tsx';
import { EmailAutomationPage } from './pages/admin/EmailAutomationPage.tsx';
import { EmailTemplatesPage } from './pages/admin/EmailTemplatesPage.tsx';
import { EmailTemplateEditorPage } from './pages/admin/EmailTemplateEditorPage.tsx';
import { EmailLogsPage } from './pages/admin/EmailLogsPage.tsx';
import { AdministratorsPage } from './pages/admin/AdministratorsPage.tsx';
import { AuditLogPage } from './pages/admin/AuditLogPage.tsx';
import { StoreSettingsPage } from './pages/admin/StoreSettingsPage.tsx';

// Guard for Admin Pages
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isLoading, isAdmin, bootstrapState } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0D14] text-[#9CA3AF] text-xs font-mono">
        Authenticating administrator session...
      </div>
    );
  }

  // If bootstrap is not claimed yet, route to owner setup
  if (bootstrapState && !bootstrapState.claimed) {
    return <Navigate to="/setup/owner" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 404 Not Found Page
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0D14] p-4 text-center">
      <div className="max-w-md bg-[#111622] p-8 rounded-2xl border border-[#1F2637] shadow-xl">
        <h1 className="font-display font-bold text-4xl text-[#FACC15] mb-2 font-mono">404</h1>
        <h2 className="font-bold text-base text-white mb-2">Page Not Found</h2>
        <p className="text-xs text-[#9CA3AF] mb-6">
          The requested page route does not exist in THEEYA'S DELUXE HUB.
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-block"
        >
          Return to Marketplace
        </Link>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:slug" element={<ListingDetailPage />} />
          <Route path="/checkout/:listingId" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/security" element={<AccountSecurityPage />} />
          <Route path="/setup/owner" element={<SetupOwnerPage />} />
          <Route path="/admin/invite/:token" element={<AdminInvitePage />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminOverviewPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/listings"
            element={
              <AdminRoute>
                <ListingsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/listings/new"
            element={
              <AdminRoute>
                <ListingCreatePage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/listings/:id/edit"
            element={
              <AdminRoute>
                <ListingEditPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/listings/:id/preview"
            element={
              <AdminRoute>
                <ListingPreviewPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <AdminRoute>
                <CategoriesPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <OrdersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders/:id"
            element={
              <AdminRoute>
                <OrderDetailAdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <AdminRoute>
                <PaymentsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/emails"
            element={
              <AdminRoute>
                <EmailAutomationPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/emails/templates"
            element={
              <AdminRoute>
                <EmailTemplatesPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/emails/templates/:templateId"
            element={
              <AdminRoute>
                <EmailTemplateEditorPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/emails/logs"
            element={
              <AdminRoute>
                <EmailLogsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/admins"
            element={
              <AdminRoute>
                <AdministratorsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/audit-log"
            element={
              <AdminRoute>
                <AuditLogPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <StoreSettingsPage />
              </AdminRoute>
            }
          />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
