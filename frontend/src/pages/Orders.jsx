import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Clock, CheckCircle, XCircle, ArrowRight, Star } from "lucide-react";
import { getOrders, cancelOrder } from "../services/orderService.js";
import { getReviewForOrder, submitReview } from "../services/reviewService.js";
import { toast } from "sonner";
import Counter from "../components/Counter.jsx";

const statusConfig = {
    pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "Pending" },
    confirmed: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Confirmed" },
    accepted: { color: "bg-blue-100 text-blue-700", icon: CheckCircle, label: "Accepted" },
    preparing: { color: "bg-purple-100 text-purple-700", icon: Clock, label: "Preparing" },
    ready: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Ready" },
    completed: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Completed" },
    cancelled: { color: "bg-red-100 text-red-700", icon: XCircle, label: "Cancelled" },
};

// Rating + optional written review shown on completed orders — feeds real home page stats & testimonials
const OrderRating = ({ orderId, review, onSubmitted }) => {
    const [selected, setSelected] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (review === undefined) return null;

    if (review) {
        return (
            <div className="mt-2">
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={14} className={n <= review.rating ? "text-accent fill-accent" : "text-gray-300"} />
                    ))}
                    <span className="text-xs text-charcoal/50 ml-1">Thanks for your feedback</span>
                </div>
                {review.comment && <p className="text-xs text-charcoal/60 italic mt-1">"{review.comment}"</p>}
            </div>
        );
    }

    const handleSubmit = async () => {
        if (!selected || submitting) return;
        try {
            setSubmitting(true);
            const data = await submitReview(orderId, selected, comment.trim() || undefined);
            toast.success("Thanks for your feedback!");
            onSubmitted(orderId, data.review);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit review");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1">
                <span className="text-xs text-charcoal/50 mr-1">Rate this order:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        disabled={submitting}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setSelected(n)}
                        className="disabled:opacity-50"
                    >
                        <Star size={16} className={n <= (hover || selected) ? "text-accent fill-accent" : "text-gray-300"} />
                    </button>
                ))}
            </div>
            {selected > 0 && (
                <div className="flex items-start gap-2">
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={1000}
                        rows={2}
                        placeholder="Share your experience (optional)"
                        disabled={submitting}
                        className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none resize-none disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                        {submitting ? "Submitting..." : "Submit"}
                    </button>
                </div>
            )}
        </div>
    );
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState({});

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await getOrders();
            const fetchedOrders = data.orders || [];
            setOrders(fetchedOrders);

            const completed = fetchedOrders.filter((o) => o.status === "completed");
            const entries = await Promise.all(
                completed.map(async (o) => {
                    try {
                        const r = await getReviewForOrder(o.id);
                        return [o.id, r.review];
                    } catch {
                        return [o.id, null];
                    }
                })
            );
            setReviews(Object.fromEntries(entries));
        } catch (error) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleReviewSubmitted = (orderId, review) => {
        setReviews((prev) => ({ ...prev, [orderId]: review }));
    };

    const handleCancel = async (orderId) => {
        if (!confirm("Cancel this order? Items will be restored to your cart.")) return;
        try {
            await cancelOrder(orderId);
            toast.success("Order cancelled, items restored to cart");
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to cancel order");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream">
            <div className="bg-primary py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-white">Your Orders</h1>
                    <p className="text-white/70 mt-1">Track and manage your orders</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {orders.length === 0 ? (
                    <div className="text-center py-16">
                        <Package size={64} className="text-primary/30 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-charcoal">No orders yet</h2>
                        <p className="text-charcoal/60 mt-2">Your order history will appear here</p>
                        <Link
                            to="/menu"
                            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-full font-medium mt-6 transition-all"
                        >
                            Start Ordering <ArrowRight size={18} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const config = statusConfig[order.status] || statusConfig.pending;
                            const StatusIcon = config.icon;

                            return (
                                <div key={order.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold text-charcoal">Order #{order.id}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
                                                    <StatusIcon size={12} />
                                                    {config.label}
                                                </span>
                                            </div>
                                            <p className="text-charcoal/50 text-sm mt-1">
                                                {new Date(order.created_at).toLocaleDateString("en-IN", {
                                                    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                                })}
                                            </p>
                                            {order.items && order.items.length > 0 && (
                                                <div className="mt-2 text-sm text-charcoal/70">
                                                    {order.items.map((item, idx) => (
                                                        <span key={idx}>
                                                            {item.name || `Item #${item.menu_item_id}`} × {item.quantity}
                                                            {idx < order.items.length - 1 ? ", " : ""}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {order.status === "completed" && (
                                                <OrderRating
                                                    orderId={order.id}
                                                    review={reviews[order.id]}
                                                    onSubmitted={handleReviewSubmitted}
                                                />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-bold text-primary">₹<Counter value={Math.round(parseFloat(order.total_amount))} fontSize={18} textColor="#1a3c34" fontWeight={700} /></span>
                                            {order.status === "pending" && (
                                                <button
                                                    onClick={() => handleCancel(order.id)}
                                                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
