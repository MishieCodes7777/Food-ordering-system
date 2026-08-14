import { useState, useEffect } from "react"; 
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Receipt, Tag } from "lucide-react";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { placeOrder } from "../services/orderService.js";
import { toast } from "sonner";
import Counter from "../components/Counter.jsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const Cart = () => {
    const { cartItems, itemCount, updateItem, removeItem, clearCartItems, fetchCart } = useCart();
    const { user } = useAuth();
    const [placingOrder, setPlacingOrder] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [updatingItemId, setUpdatingItemId] = useState(null);
    const [gst, setGst] = useState({ gst_enabled: false, gst_percentage: 0, gst_label: 'GST' });
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/api/menu/gst").then(res => {
            if (res.data.gst) setGst(res.data.gst);
        }).catch(() => {});
    }, []);

    // Calculate bill
    const subtotal = cartItems.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        return sum + price * item.quantity;
    }, 0);

    const totalDiscount = cartItems.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const discountPrice = parseFloat(item.discount_price) || price;
        if (discountPrice < price) {
            return sum + (price - discountPrice) * item.quantity;
        }
        return sum;
    }, 0);

    const totalBeforeGst = subtotal - totalDiscount;
    const gstAmount = gst.gst_enabled ? Math.round(totalBeforeGst * gst.gst_percentage / 100) : 0;
    const totalBill = totalBeforeGst + gstAmount;

    const handleUpdateQuantity = async (itemId, newQuantity) => {
        if (updatingItemId === itemId) return; // ignore clicks while a request for this item is in flight
        try {
            setUpdatingItemId(itemId);
            if (newQuantity <= 0) {
                await removeItem(itemId);
                toast.success("Item removed");
            } else {
                await updateItem(itemId, newQuantity);
            }
        } catch (error) {
            toast.error("Couldn't update cart");
        } finally {
            setUpdatingItemId(null);
        }
    };

    const handlePlaceOrder = async () => {
        try {
            setPlacingOrder(true);

            // Step 1: Create Razorpay payment order from cart (without placing the order yet)
            const orderData = await placeOrder();
            const orderId = orderData.order?.id;

            if (!orderId) {
                toast.error("Couldn't process your order");
                return;
            }

            // Step 2: Create Razorpay payment order
            let paymentData;
            try {
                const paymentRes = await api.post("/api/payments/create-order", { order_id: orderId });
                paymentData = paymentRes.data;
            } catch (payErr) {
                // Payment creation failed — cancel the order and restore cart
                try {
                    await api.post(`/api/orders/${orderId}/cancel`);
                } catch { /* best effort */ }
                toast.error("Payment setup failed. Your cart is unchanged.");
                return;
            }

            const { razorpay_order_id, amount, currency, key_id } = paymentData;

            // Step 3: Open Razorpay checkout
            const options = {
                key: key_id,
                amount: amount,
                currency: currency,
                name: "Akio Restaurant",
                description: `Order #${orderId}`,
                order_id: razorpay_order_id,
                handler: async (response) => {
                    // Step 4: Verify payment on backend
                    try {
                        await api.post("/api/payments/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            order_id: orderId,
                        });
                        await fetchCart(); // Refresh cart state
                        // Show success animation
                        setShowSuccess(true);
                        setTimeout(() => {
                            setShowSuccess(false);
                            navigate("/orders");
                        }, 2500);
                    } catch {
                        toast.error("Payment verification failed. Contact support.");
                        navigate("/orders");
                    }
                },
                prefill: {
                    name: user?.name || "",
                    email: user?.email || "",
                    contact: user?.phone || "",
                },
                theme: {
                    color: "#1a3c34",
                },
                modal: {
                    ondismiss: async () => {
                        // User closed popup without paying — cancel order, restore cart
                        try {
                            await api.post(`/api/orders/${orderId}/cancel`);
                        } catch { /* best effort */ }
                        await fetchCart(); // Refresh cart state
                        toast("Payment cancelled. Items are still in your cart.", { duration: 4000 });
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setPlacingOrder(false);
        }
    };

    const handleClearCart = async () => {
        try {
            await clearCartItems();
            toast.success("Cart cleared");
        } catch {
            toast.error("Couldn't clear cart");
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
                <DotLottieReact
                    src="/Success.lottie"
                    autoplay
                    loop={false}
                    style={{ width: 200, height: 200 }}
                />
                <p className="text-xl font-bold text-charcoal mt-4">Order Placed!</p>
                <p className="text-charcoal/60 text-sm mt-1">Redirecting to your orders...</p>
            </div>
        );
    }

    if (itemCount === 0) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center px-4">
                <div className="text-center">
                    <ShoppingBag size={64} className="text-primary/30 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-charcoal">Your cart is empty</h2>
                    <p className="text-charcoal/60 mt-2">Add some delicious items from our menu</p>
                    <Link
                        to="/menu"
                        className="inline-flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-full font-medium mt-6 transition-all"
                    >
                        Browse Menu <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream">
            <div className="bg-primary py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-white">Your Cart</h1>
                    <p className="text-white/70 mt-1">{itemCount} item{itemCount !== 1 ? "s" : ""} in your cart</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
                {/* Cart Items */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {cartItems.map((item) => (
                            <div key={item.id} className="p-5 flex items-center gap-4">
                                <div className="w-14 h-14 bg-primary-light/10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl">🍽️</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-charcoal">{item.name || `Item #${item.menu_item_id}`}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-charcoal/50 text-sm">
                                            ₹{item.discount_price && item.discount_price < item.price
                                                ? <><span className="line-through text-charcoal/30">₹{item.price}</span> ₹{item.discount_price}</>
                                                : item.price || 0
                                            }
                                        </p>
                                        {item.food_type_choice && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${item.food_type_choice === 'veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {item.food_type_choice === 'veg' ? '🟢 Veg' : '🔴 Non-Veg'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Quantity controls */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                        disabled={updatingItemId === item.id}
                                        className="w-8 h-8 rounded-full bg-cream flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className="w-8 text-center font-semibold text-charcoal">{item.quantity}</span>
                                    <button
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                        disabled={updatingItemId === item.id}
                                        className="w-8 h-8 rounded-full bg-cream flex items-center justify-center hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                                        aria-label="Increase quantity"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {/* Item total */}
                                <p className="font-semibold text-charcoal text-sm w-16 text-right">
                                    ₹{((parseFloat(item.discount_price) || parseFloat(item.price) || 0) * item.quantity).toFixed(0)}
                                </p>
                                {/* Remove button */}
                                <button
                                    onClick={() => handleUpdateQuantity(item.id, 0)}
                                    disabled={updatingItemId === item.id}
                                    className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                    aria-label="Remove item"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bill Summary */}
                <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                    <h3 className="font-semibold text-charcoal flex items-center gap-2">
                        <Receipt size={18} className="text-primary" />
                        Bill Summary
                    </h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-charcoal/70">
                            <span>Item total</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>

                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span className="flex items-center gap-1">
                                    <Tag size={14} />
                                    Discount
                                </span>
                                <span>-₹{totalDiscount.toFixed(2)}</span>
                            </div>
                        )}

                        {gst.gst_enabled && gstAmount > 0 && (
                            <div className="flex justify-between text-charcoal/60 text-sm">
                                <span>{gst.gst_label} ({gst.gst_percentage}%)</span>
                                <span>+₹{gstAmount}</span>
                            </div>
                        )}

                        <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between font-semibold text-charcoal text-base">
                            <span>Total</span>
                            <div className="text-right">
                                <span className="text-lg">₹<Counter value={Math.round(totalBill)} fontSize={18} textColor="#1a1a1a" fontWeight={700} /></span>
                                {totalDiscount > 0 && (
                                    <p className="text-xs text-green-600 font-medium mt-0.5">You save ₹<Counter value={Math.round(totalDiscount)} fontSize={12} textColor="#16a34a" fontWeight={600} /></p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2">
                    <button
                        onClick={handleClearCart}
                        className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors"
                    >
                        Clear Cart
                    </button>
                    <button
                        onClick={handlePlaceOrder}
                        disabled={placingOrder}
                        className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-full font-medium flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
                    >
                        {placingOrder ? "Placing..." : `Place Order • ₹${Math.round(totalBill)}`} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Cart;
