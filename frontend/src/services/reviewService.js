import api from "./api.js";

export const getHomeStats = async () => {
    const res = await api.get("/api/stats/home");
    return res.data;
};

export const getReviewForOrder = async (orderId) => {
    const res = await api.get(`/api/reviews/order/${orderId}`);
    return res.data;
};

export const submitReview = async (orderId, rating, comment) => {
    const res = await api.post("/api/reviews", { order_id: orderId, rating, comment });
    return res.data;
};

export const getPublicReviews = async (limit = 6) => {
    const res = await api.get("/api/reviews/public", { params: { limit } });
    return res.data;
};
