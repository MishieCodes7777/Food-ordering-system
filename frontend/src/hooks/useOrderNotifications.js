import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

const useOrderNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const previousStatuses = useRef({});
    const intervalRef = useRef(null);

    useEffect(() => {
        if (user) {
            // Initial fetch
            checkOrderStatuses();
            // Poll every 15 seconds
            intervalRef.current = setInterval(checkOrderStatuses, 15000);
        } else {
            setNotifications([]);
            setUnreadCount(0);
            previousStatuses.current = {};
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user]);

    const checkOrderStatuses = async () => {
        try {
            const res = await api.get("/api/orders");
            const orders = res.data.orders || [];

            for (const order of orders) {
                const prevStatus = previousStatuses.current[order.id];

                // Only notify on meaningful transitions
                if (prevStatus && prevStatus !== order.status) {
                    let message = null;

                    if (order.status === "ready") {
                        message = `Your order #${order.id} is ready for pickup! 🎉`;
                    } else if (order.status === "confirmed") {
                        message = `Your order #${order.id} has been confirmed ✓`;
                    } else if (order.status === "preparing") {
                        message = `Your order #${order.id} is being prepared 🍳`;
                    } else if (order.status === "completed") {
                        message = `Your order #${order.id} is complete. Enjoy! 😊`;
                    }

                    if (message) {
                        const newNotification = {
                            id: `${order.id}-${order.status}-${Date.now()}`,
                            orderId: order.id,
                            message,
                            status: order.status,
                            time: new Date(),
                            read: false,
                        };
                        setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
                        setUnreadCount((prev) => prev + 1);
                    }
                }

                previousStatuses.current[order.id] = order.status;
            }
        } catch {
            // Silently fail — don't break the app
        }
    };

    const markAllRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const clearNotifications = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    return { notifications, unreadCount, markAllRead, clearNotifications };
};

export default useOrderNotifications;
