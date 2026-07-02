import { NavLink } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, FolderOpen, Table2, ClipboardList, BarChart3, Settings, LogOut, X } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import useAdminOrderNotifications from "../hooks/useAdminOrderNotifications.js";
import AdminNotificationBell from "./AdminNotificationBell.jsx";

const AdminSidebar = ({ onClose }) => {
    const { admin, logout } = useAdminAuth();
    const { notifications, unreadCount, markAllRead, clearNotifications } = useAdminOrderNotifications();

    const links = [
        { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
        { to: "/admin/orders", icon: ClipboardList, label: "Orders" },
        { to: "/admin/menu-items", icon: UtensilsCrossed, label: "Menu Items" },
        { to: "/admin/categories", icon: FolderOpen, label: "Categories" },
        { to: "/admin/tables", icon: Table2, label: "Tables" },
        { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
        { to: "/admin/settings", icon: Settings, label: "Settings" },
    ];

    return (
        <aside className="w-64 bg-charcoal min-h-screen flex flex-col">
            {/* Logo + close button */}
            <div className="p-6 border-b border-charcoal-light flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">
                    Aki<span className="text-accent">o</span>
                    <span className="text-white/50 text-sm font-normal ml-2">Admin</span>
                </h1>
                <div className="flex items-center gap-2">
                    <AdminNotificationBell
                        notifications={notifications}
                        unreadCount={unreadCount}
                        markAllRead={markAllRead}
                        clearNotifications={clearNotifications}
                    />
                    <button onClick={onClose} className="lg:hidden text-white/50 hover:text-white" aria-label="Close menu">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                ? "bg-primary text-white"
                                : "text-white/60 hover:bg-charcoal-light hover:text-white"
                            }`
                        }
                    >
                        <link.icon size={18} />
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            {/* Admin Info + Logout */}
            <div className="p-4 border-t border-charcoal-light">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                        {admin?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{admin?.name}</p>
                        <p className="text-white/40 text-xs capitalize">{admin?.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 text-white/50 hover:text-red-400 text-sm transition-colors w-full px-2 py-1"
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
