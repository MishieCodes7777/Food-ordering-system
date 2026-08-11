import { useCallback } from "react";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { usePollingNotifications } from "./usePollingNotifications.js";

// seenRef.current tracks which order IDs we've already seen, plus whether
// this is the first poll (so existing orders don't all fire as "new" on load)
const createSeenState = () => ({ knownOrderIds: new Set(), initialLoad: true });

const useAdminOrderNotifications = () => {
    const { admin } = useAdminAuth();

    const buildNotifications = useCallback((orders, seenRef) => {
        const { knownOrderIds } = seenRef.current;

        if (seenRef.current.initialLoad) {
            // First load — just record existing order IDs, don't notify
            orders.forEach((o) => knownOrderIds.add(o.id));
            seenRef.current.initialLoad = false;
            return [];
        }

        const fresh = [];
        for (const order of orders) {
            if (!knownOrderIds.has(order.id)) {
                knownOrderIds.add(order.id);
                fresh.push({
                    id: `new-order-${order.id}-${Date.now()}`,
                    orderId: order.id,
                    message: `New order #${order.id} received! ₹${order.total_amount}`,
                    customerName: order.customer_name || "Customer",
                    time: new Date(order.created_at),
                    read: false,
                });
            }
        }
        return fresh;
    }, []);

    return usePollingNotifications({
        enabled: !!admin,
        endpoint: "/api/admin/orders",
        intervalMs: 10000,
        maxNotifications: 30,
        createSeenState,
        buildNotifications,
    });
};

export default useAdminOrderNotifications;
