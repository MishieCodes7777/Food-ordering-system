import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import OfflineBanner from "./components/OfflineBanner.jsx";
import PillNav from "./components/PillNav.jsx";
import CardNav from "./components/CardNav.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import MenuPage from "./pages/MenuPage.jsx";
import Cart from "./pages/Cart.jsx";
import Orders from "./pages/Orders.jsx";
import Profile from "./pages/Profile.jsx";
import Contact from "./pages/Contact.jsx";

// The entire admin panel is code-split out of the customer bundle — customers
// never load this JS, and an admin loads the customer pages' JS only once
// (this file), not the admin panel until they actually navigate there.
const AdminLayout = lazy(() => import("./components/AdminLayout.jsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.jsx"));
const AdminMenuItems = lazy(() => import("./pages/admin/AdminMenuItems.jsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.jsx"));
const AdminTables = lazy(() => import("./pages/admin/AdminTables.jsx"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics.jsx"));
const AdminLedger = lazy(() => import("./pages/admin/AdminLedger.jsx"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.jsx"));

const AdminLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <BrowserRouter>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <CartProvider>
              <AdminAuthProvider>
              <Routes>
                {/* Auth pages — full screen, no nav/footer */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Customer Routes with nav/footer */}
                <Route
                  path="/*"
                  element={
                    <div className="flex flex-col min-h-screen">
                      <PillNav />
                      <CardNav />
                      <main className="flex-1 pt-20">
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/menu" element={<MenuPage />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        </Routes>
                      </main>
                      <Footer />
                    </div>
                  }
                />

                {/* Admin Routes — all lazy-loaded, so this whole subtree's JS
                    only downloads once someone actually navigates here */}
                <Route
                  path="/admin/*"
                  element={
                    <Suspense fallback={<AdminLoadingFallback />}>
                      <Routes>
                        <Route path="login" element={<AdminLogin />} />
                        <Route
                          path=""
                          element={
                            <AdminProtectedRoute>
                              <AdminLayout />
                            </AdminProtectedRoute>
                          }
                        >
                          <Route index element={<Dashboard />} />
                          <Route path="orders" element={<AdminOrders />} />
                          <Route path="menu-items" element={<AdminMenuItems />} />
                          <Route path="categories" element={<AdminCategories />} />
                          <Route path="tables" element={<AdminTables />} />
                          <Route path="analytics" element={<AdminAnalytics />} />
                          <Route path="ledger" element={<AdminLedger />} />
                          <Route path="reviews" element={<AdminReviews />} />
                          <Route path="settings" element={<AdminSettings />} />
                        </Route>
                      </Routes>
                    </Suspense>
                  }
                />
              </Routes>

              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  duration: 3000,
                }}
              />
              </AdminAuthProvider>
            </CartProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
