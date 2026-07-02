import { useState, useEffect, useRef } from "react";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import api from "../services/api.js";

const useAdminOrderNotifications = () => {
    const { admin } = useAdminAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const knownOrderIds = useRef(new Set());
    const intervalRef = useRef(null);
    const initialLoad = useRef(true);

    useEffect(() => {
        if (admin) {
            checkNewOrders();
            intervalRef.current = setInterval(checkNewOrders, 10000);
        } else {
            setNotifications([]);
            setUnreadCount(0);
            knownOrderIds.current = new Set();
            initialLoad.current = true;
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [admin]);

    const checkNewOrders = async () => {
        try {
            const res = await api.get("/api/admin/orders");
            const orders = res.data.orders || [];

            if (initialLoad.current) {
                // First load — just record existing order IDs, don't notify
                orders.forEach((o) => knownOrderIds.current.add(o.id));
                initialLoad.current = false;
                return;
            }

            // Check for new orders we haven't seen
            for (const order of orders) {
                if (!knownOrderIds.current.has(order.id)) {
                    knownOrderIds.current.add(order.id);

                    const newNotification = {
                        id: `new-order-${order.id}-${Date.now()}`,
                        orderId: order.id,
                        message: `New order #${order.id} received! ₹${order.total_amount}`,
                        customerName: order.customer_name || "Customer",
                        time: new Date(order.created_at),
                        read: false,
                    };
                    setNotifications((prev) => [newNotification, ...prev].slice(0, 30));
                    setUnreadCount((prev) => prev + 1);
                }
            }
        } catch {
            // Silently fail
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

export default useAdminOrderNotifications;
