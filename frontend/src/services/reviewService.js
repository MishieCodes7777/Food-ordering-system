import api from "./api.js";

export const submitReview = async (menuItemId, rating, comment) => {
    const res = await api.post("/api/reviews", { menu_item_id: menuItemId, rating, comment });
    return res.data;
};

export const getReviewsForItem = async (itemId) => {
    const res = await api.get(`/api/reviews/item/${itemId}`);
    return res.data;
};
