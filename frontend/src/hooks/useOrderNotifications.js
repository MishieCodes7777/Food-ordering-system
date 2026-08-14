import { useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext.jsx";
import { usePollingNotifications } from "./usePollingNotifications.js";

const STATUS_MESSAGES = {
    ready: (id) => `Your order #${id} is ready for pickup! 🎉`,
    confirmed: (id) => `Your order #${id} has been confirmed ✓`,
    preparing: (id) => `Your order #${id} is being prepared 🍳`,
    completed: (id) => `Your order #${id} is complete. Enjoy! 😊`,
};

// seenRef.current maps orderId -> last known status
const createSeenState = () => ({});

const useOrderNotifications = () => {
    const { user } = useAuth();

    const buildNotifications = useCallback((orders, seenRef) => {
        const fresh = [];

        for (const order of orders) {
            const prevStatus = seenRef.current[order.id];

            // Only notify on meaningful transitions
            if (prevStatus && prevStatus !== order.status) {
                const message = STATUS_MESSAGES[order.status]?.(order.id);
                if (message) {
                    fresh.push({
                        id: `${order.id}-${order.status}-${Date.now()}`,
                        orderId: order.id,
                        message,
                        status: order.status,
                        time: new Date(),
                        read: false,
                    });

                    // "Ready" is the one status a customer actively needs to act
                    // on (go collect it) — surface it as a toast, not just a
                    // badge count the customer might not notice in time.
                    if (order.status === "ready") {
                        toast.success(message, { duration: 8000 });
                    }
                }
            }

            seenRef.current[order.id] = order.status;
        }

        return fresh;
    }, []);

    return usePollingNotifications({
        enabled: !!user,
        endpoint: "/api/orders",
        intervalMs: 15000,
        maxNotifications: 20,
        createSeenState,
        buildNotifications,
    });
};

export default useOrderNotifications;
