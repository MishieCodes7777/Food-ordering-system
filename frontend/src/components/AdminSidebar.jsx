import { NavLink } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, FolderOpen, Table2, ClipboardList, BarChart3, Wallet, Settings, LogOut, X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import useAdminOrderNotifications from "../hooks/useAdminOrderNotifications.js";
import AdminNotificationBell from "./AdminNotificationBell.jsx";

const linkGroups = [
    {
        label: "Operations",
        links: [
            { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
            { to: "/admin/orders", icon: ClipboardList, label: "Orders" },
            { to: "/admin/tables", icon: Table2, label: "Tables" },
        ],
    },
    {
        label: "Catalog",
        links: [
            { to: "/admin/menu-items", icon: UtensilsCrossed, label: "Menu Items" },
            { to: "/admin/categories", icon: FolderOpen, label: "Categories" },
            { to: "/admin/reviews", icon: Star, label: "Reviews" },
        ],
    },
    {
        label: "Finance",
        links: [
            { to: "/admin/ledger", icon: Wallet, label: "Ledger" },
            { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
        ],
    },
    {
        label: "System",
        links: [
            { to: "/admin/settings", icon: Settings, label: "Settings" },
        ],
    },
];

const AdminSidebar = ({ onClose, collapsed, onToggleCollapse }) => {
    const { admin, logout } = useAdminAuth();
    const { notifications, unreadCount, markAllRead, clearNotifications } = useAdminOrderNotifications();

    return (
        <aside className={`${collapsed ? "w-20" : "w-64"} bg-charcoal min-h-screen flex flex-col transition-all duration-200`}>
            {/* Logo + collapse/close buttons */}
            <div className="p-6 border-b border-charcoal-light flex items-center justify-between">
                {!collapsed && (
                    <h1 className="text-2xl font-bold text-white">
                        Aki<span className="text-accent">o</span>
                        <span className="text-white/50 text-sm font-normal ml-2">Admin</span>
                    </h1>
                )}
                <div className={`flex items-center gap-2 ${collapsed ? "w-full justify-center" : ""}`}>
                    {!collapsed && (
                        <AdminNotificationBell
                            notifications={notifications}
                            unreadCount={unreadCount}
                            markAllRead={markAllRead}
                            clearNotifications={clearNotifications}
                        />
                    )}
                    <button
                        onClick={onToggleCollapse}
                        className="hidden lg:flex text-white/50 hover:text-white p-1"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    <button onClick={onClose} className="lg:hidden text-white/50 hover:text-white" aria-label="Close menu">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Nav Links, grouped */}
            <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
                {linkGroups.map((group) => (
                    <div key={group.label}>
                        {!collapsed && (
                            <p className="px-4 text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">
                                {group.label}
                            </p>
                        )}
                        <div className="space-y-1">
                            {group.links.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    end={link.end}
                                    onClick={onClose}
                                    title={collapsed ? link.label : undefined}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${collapsed ? "justify-center" : ""} ${isActive
                                            ? "bg-primary text-white"
                                            : "text-white/60 hover:bg-charcoal-light hover:text-white"
                                        }`
                                    }
                                >
                                    <link.icon size={18} />
                                    {!collapsed && link.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Admin Info + Logout */}
            <div className="p-4 border-t border-charcoal-light">
                <div className={`flex items-center gap-3 mb-3 ${collapsed ? "justify-center" : ""}`}>
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {admin?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{admin?.name}</p>
                            <p className="text-white/40 text-xs capitalize">{admin?.role}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={logout}
                    title={collapsed ? "Logout" : undefined}
                    className={`flex items-center gap-2 text-white/50 hover:text-red-400 text-sm transition-colors w-full px-2 py-1 ${collapsed ? "justify-center" : ""}`}
                >
                    <LogOut size={16} /> {!collapsed && "Logout"}
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
