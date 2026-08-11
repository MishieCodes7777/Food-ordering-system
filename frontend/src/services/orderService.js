import api from "./api.js";

export const placeOrder = async () => {
    const res = await api.post("/api/orders/place");
    return res.data;
};

export const getOrders = async () => {
    const res = await api.get("/api/orders");
    return res.data;
};

export const getRecentlyOrderedItems = async () => {
    const res = await api.get("/api/orders/recent-items");
    return res.data;
};

export const getOrderById = async (orderId) => {
    const res = await api.get(`/api/orders/${orderId}`);
    return res.data;
};

export const getOrderStatus = async (orderId) => {
    const res = await api.get(`/api/orders/${orderId}/status`);
    return res.data;
};

export const cancelOrder = async (orderId) => {
    const res = await api.post(`/api/orders/${orderId}/cancel`);
    return res.data;
};
