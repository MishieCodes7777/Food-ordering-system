import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import StarRating from "./StarRating.jsx";
import { submitReview } from "../services/reviewService.js";

// Star pickers for every item in one completed order. Reviews are keyed by
// (customer, menu item) on the backend — not per-order — so rating an item
// here also settles it for any other order that included the same item.
const RateOrderModal = ({ order, onClose }) => {
    const [ratings, setRatings] = useState({});
    const [comments, setComments] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const setRating = (menuItemId, value) => setRatings((prev) => ({ ...prev, [menuItemId]: value }));
    const setComment = (menuItemId, value) => setComments((prev) => ({ ...prev, [menuItemId]: value }));

    const handleSubmit = async () => {
        const toSubmit = Object.entries(ratings).filter(([, rating]) => rating > 0);
        if (toSubmit.length === 0) {
            toast.error("Pick a star rating for at least one item");
            return;
        }
        try {
            setSubmitting(true);
            await Promise.all(
                toSubmit.map(([menuItemId, rating]) =>
                    submitReview(parseInt(menuItemId), rating, comments[menuItemId]?.trim() || null)
                )
            );
            toast.success("Thanks for rating your order!");
            onClose();
        } catch {
            toast.error("Couldn't submit one or more reviews, try again");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
                    <h2 className="text-lg font-bold text-charcoal">Rate Order #{order.id}</h2>
                    <button onClick={onClose} className="text-charcoal/40 hover:text-charcoal" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {(order.items || []).map((item) => (
                        <div key={item.menu_item_id} className="border-b border-gray-50 last:border-0 pb-5 last:pb-0">
                            <p className="font-medium text-charcoal text-sm mb-2">{item.name || `Item #${item.menu_item_id}`}</p>
                            <StarRating
                                size={22}
                                value={ratings[item.menu_item_id] || 0}
                                onChange={(val) => setRating(item.menu_item_id, val)}
                            />
                            {ratings[item.menu_item_id] > 0 && (
                                <textarea
                                    value={comments[item.menu_item_id] || ""}
                                    onChange={(e) => setComment(item.menu_item_id, e.target.value)}
                                    placeholder="Optional comment..."
                                    rows={2}
                                    maxLength={1000}
                                    className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none resize-none"
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t border-gray-100 sticky bottom-0 bg-white">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-full font-medium transition-all disabled:opacity-50"
                    >
                        {submitting ? "Submitting..." : "Submit Rating"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateOrderModal;
