import { Bell, ShoppingBag } from "lucide-react";
import { useDropdown } from "../hooks/useDropdown.js";
import { timeAgo } from "../utils/timeAgo.js";

const AdminNotificationBell = ({ notifications, unreadCount, markAllRead, clearNotifications }) => {
    const { open, toggle, ref: dropdownRef } = useDropdown({
        onOpen: () => unreadCount > 0 && markAllRead(),
    });

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggle}
                className="relative text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-charcoal-light"
                aria-label="Order Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute left-full top-0 ml-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-cream">
                        <h3 className="font-semibold text-charcoal text-sm">New Orders</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={clearNotifications}
                                className="text-charcoal/40 hover:text-red-500 text-xs transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center">
                                <ShoppingBag size={32} className="text-charcoal/20 mx-auto mb-2" />
                                <p className="text-charcoal/50 text-sm">No new orders</p>
                                <p className="text-charcoal/30 text-xs mt-1">New orders will appear here</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`px-4 py-3 border-b border-gray-50 last:border-0 flex items-start gap-3 ${!notif.read ? "bg-accent/5" : ""}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <ShoppingBag size={14} className="text-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-charcoal text-sm font-medium">{notif.message}</p>
                                        <p className="text-charcoal/40 text-xs mt-0.5">{notif.customerName} • {timeAgo(notif.time)}</p>
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

export default AdminNotificationBell;
