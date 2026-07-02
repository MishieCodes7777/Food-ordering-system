import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, Clock, ChefHat, CheckCircle } from "lucide-react";

const statusIcons = {
    confirmed: <Check size={14} className="text-blue-500" />,
    preparing: <ChefHat size={14} className="text-purple-500" />,
    ready: <Bell size={14} className="text-green-500" />,
    completed: <CheckCircle size={14} className="text-green-600" />,
};

const NotificationBell = ({ notifications, unreadCount, markAllRead, clearNotifications }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = () => {
        setOpen(!open);
        if (!open && unreadCount > 0) {
            markAllRead();
        }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={handleToggle}
                className="pill-action-btn relative"
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="pill-action-badge animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-cream">
                        <h3 className="font-semibold text-charcoal text-sm">Notifications</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={clearNotifications}
                                className="text-charcoal/40 hover:text-red-500 text-xs transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center">
                                <Bell size={32} className="text-charcoal/20 mx-auto mb-2" />
                                <p className="text-charcoal/50 text-sm">No notifications yet</p>
                                <p className="text-charcoal/30 text-xs mt-1">We'll notify you when your order updates</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-3 transition-colors ${!notif.read ? "bg-primary/5" : ""
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {statusIcons[notif.status] || <Bell size={14} className="text-accent" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-charcoal text-sm">{notif.message}</p>
                                        <p className="text-charcoal/40 text-xs mt-1">{timeAgo(notif.time)}</p>
                                    </div>
                                    {!notif.read && (
                                        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2"></span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
