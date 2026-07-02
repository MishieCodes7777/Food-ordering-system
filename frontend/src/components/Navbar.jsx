import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import useOrderNotifications from "../hooks/useOrderNotifications.js";
import NotificationBell from "./NotificationBell.jsx";

const Navbar = () => {
    const { user, logout } = useAuth();
    const { itemCount } = useCart();
    const { notifications, unreadCount, markAllRead, clearNotifications } = useOrderNotifications();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <nav className="bg-primary sticky top-0 z-50 shadow-lg hidden md:block">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-white">
                            Aki<span className="text-accent">o</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className="text-white hover:text-accent transition-colors font-medium">
                            Home
                        </Link>
                        <Link to="/menu" className="text-white hover:text-accent transition-colors font-medium">
                            Menu
                        </Link>
                        <Link to="/orders" className="text-white hover:text-accent transition-colors font-medium">
                            Orders
                        </Link>
                        <Link to="/contact" className="text-white hover:text-accent transition-colors font-medium">
                            Contact
                        </Link>
                    </div>

                    {/* Right side */}
                    <div className="hidden md:flex items-center gap-4">
                        {user ? (
                            <>
                                <NotificationBell
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    markAllRead={markAllRead}
                                    clearNotifications={clearNotifications}
                                />
                                <Link to="/cart" className="relative text-white hover:text-accent transition-colors">
                                    <ShoppingCart size={22} />
                                    {itemCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-accent text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                            {itemCount}
                                        </span>
                                    )}
                                </Link>
                                <Link to="/profile" className="text-white hover:text-accent transition-colors">
                                    <User size={22} />
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-white hover:text-accent transition-colors"
                                    aria-label="Logout"
                                >
                                    <LogOut size={22} />
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-accent hover:bg-accent-dark text-white px-5 py-2 rounded-full font-medium transition-colors"
                            >
                                Login
                            </Link>
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden text-white"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden bg-primary-dark border-t border-primary-light">
                    <div className="px-4 py-4 flex flex-col gap-3">
                        <Link to="/" onClick={() => setMobileOpen(false)} className="text-white hover:text-accent py-2">Home</Link>
                        <Link to="/menu" onClick={() => setMobileOpen(false)} className="text-white hover:text-accent py-2">Menu</Link>
                        <Link to="/orders" onClick={() => setMobileOpen(false)} className="text-white hover:text-accent py-2">Orders</Link>
                        <Link to="/contact" onClick={() => setMobileOpen(false)} className="text-white hover:text-accent py-2">Contact</Link>
                        {user ? (
                            <>
                                <Link to="/cart" onClick={() => setMobileOpen(false)} className="text-white hover:text-accent py-2 flex items-center gap-2">
                                    <ShoppingCart size={18} /> Cart ({itemCount})
                                </Link>
                                <Link to="/profile" onClick={() => setMobileOpen(false)} className="text-white hover:text-accent py-2 flex items-center gap-2">
                                    <User size={18} /> Profile
                                </Link>
                                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="text-white hover:text-accent py-2 text-left flex items-center gap-2">
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        ) : (
                            <Link to="/login" onClick={() => setMobileOpen(false)} className="bg-accent text-white px-4 py-2 rounded-full text-center font-medium">Login</Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
