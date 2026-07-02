import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";
import PillNav from "./components/PillNav.jsx";
import CardNav from "./components/CardNav.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/AdminProtectedRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import MenuPage from "./pages/MenuPage.jsx";
import Cart from "./pages/Cart.jsx";
import Orders from "./pages/Orders.jsx";
import Profile from "./pages/Profile.jsx";
import Contact from "./pages/Contact.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminMenuItems from "./pages/admin/AdminMenuItems.jsx";
import AdminCategories from "./pages/admin/AdminCategories.jsx";
import AdminTables from "./pages/admin/AdminTables.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";

function App() {
  return (
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

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
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
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
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
  );
}

export default App;
