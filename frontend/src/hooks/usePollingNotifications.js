import { useState, useEffect, useRef, useCallback } from "react";
import api from "../services/api.js";

// Generic polling-and-diff notification engine shared by the customer and
// admin order-notification hooks. Each caller supplies how to detect what's
// "new" since the last poll (buildNotifications) — the polling lifecycle,
// unread-count bookkeeping, and reset-on-logout behavior live here once.
export const usePollingNotifications = ({
    enabled,
    endpoint,
    intervalMs,
    maxNotifications = 20,
    createSeenState,
    buildNotifications, // (orders, seenRef) => newNotification[]
}) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const seenRef = useRef(createSeenState());
    const intervalRef = useRef(null);

    const poll = useCallback(async () => {
        try {
            const res = await api.get(endpoint);
            const orders = res.data.orders || [];
            const fresh = buildNotifications(orders, seenRef);

            if (fresh.length > 0) {
                setNotifications((prev) => [...fresh, ...prev].slice(0, maxNotifications));
                setUnreadCount((prev) => prev + fresh.length);
            }
        } catch {
            // Silently fail — don't break the app
        }
    }, [endpoint, buildNotifications, maxNotifications]);

    useEffect(() => {
        if (enabled) {
            poll();
            intervalRef.current = setInterval(poll, intervalMs);
        } else {
            setNotifications([]);
            setUnreadCount(0);
            seenRef.current = createSeenState();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [enabled, intervalMs, poll, createSeenState]);

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
