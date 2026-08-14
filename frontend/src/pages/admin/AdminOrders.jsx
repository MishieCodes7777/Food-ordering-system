import { useState, useEffect, useCallback } from "react";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../services/api.js";
import { toast } from "sonner";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import { downloadCsv } from "../../utils/csvExport.js";

const statusOptions = ["pending", "accepted", "preparing", "ready", "completed", "cancelled"];

const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-blue-100 text-blue-700",
    preparing: "bg-purple-100 text-purple-700",
    ready: "bg-green-100 text-green-700",
    completed: "bg-green-200 text-green-800",
    cancelled: "bg-red-100 text-red-700",
};

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page, limit });
            if (filter) params.set("status", filter);
            const res = await api.get(`/api/admin/orders?${params.toString()}`);
            setOrders(res.data.orders || []);
            setTotal(res.data.total || 0);
        } catch {
            setOrders([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [filter, page]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
        setPage(1);
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            await api.put(`/api/admin/orders/${orderId}/status`, { status: newStatus });
            toast.success(`Order #${orderId} updated to ${newStatus}`);
            fetchOrders();
        } catch {
            toast.error("Couldn't update order status, try again");
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const params = new URLSearchParams({ export: "true" });
            if (filter) params.set("status", filter);

            const res = await api.get(`/api/admin/orders?${params.toString()}`);
            const rows = res.data.orders || [];
            if (rows.length === 0) {
                toast.error("No orders to export");
                return;
            }

            downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [
                { label: "Order ID", value: (r) => r.id },
                { label: "Date", value: (r) => new Date(r.created_at).toLocaleString("en-IN") },
                { label: "Customer", value: (r) => r.customer_name || "" },
                { label: "Phone", value: (r) => r.customer_phone || "" },
                { label: "Status", value: (r) => r.status },
                { label: "Payment Status", value: (r) => r.payment?.payment_status || "no payment" },
                { label: "Items", value: (r) => (r.items || []).map((i) => `${i.name || `Item #${i.menu_item_id}`} x${i.quantity}`).join("; ") },
                { label: "Amount", value: (r) => r.total_amount },
            ], rows);
        } catch {
            toast.error("Couldn't export orders, try again");
        } finally {
            setExporting(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div>
            <AdminPageHeader
                title="Orders"
                actions={
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-charcoal hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={16} />
                        {exporting ? "Exporting..." : "Export CSV"}
                    </button>
                }
            />

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => handleFilterChange("")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!filter ? "bg-primary text-white" : "bg-white text-charcoal border border-gray-200 hover:border-primary"
                        }`}
                >
                    All
                </button>
                {statusOptions.map((status) => (
                    <button
                        key={status}
                        onClick={() => handleFilterChange(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${filter === status ? "bg-primary text-white" : "bg-white text-charcoal border border-gray-200 hover:border-primary"
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                    <p className="text-charcoal/50">No orders found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl p-5 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-charcoal">Order #{order.id}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || ""}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <p className="text-charcoal/50 text-sm mt-1">
                                        {order.customer_name || "Customer"} • ₹{order.total_amount}
                                        {order.customer_since && (
                                            <span className="ml-2 text-xs text-charcoal/40">
                                                Member since {new Date(order.customer_since).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                                            </span>
                                        )}
                                        {order.payment && (
                                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${order.payment.payment_status === 'completed' ? 'bg-green-100 text-green-700' : order.payment.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                {order.payment.payment_status === 'completed' ? '💳 Paid' : order.payment.payment_status === 'pending' ? '⏳ Payment Pending' : '❌ ' + order.payment.payment_status}
                                            </span>
                                        )}
                                        {!order.payment && (
                                            <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">No payment</span>
                                        )}
                                    </p>
                                    {order.items && order.items.length > 0 && (
                                        <p className="text-charcoal/60 text-xs mt-1">
                                            {order.items.map((item, idx) => (
                                                <span key={idx}>
                                                    {item.name || `Item #${item.menu_item_id}`} × {item.quantity}
                                                    {idx < order.items.length - 1 ? " | " : ""}
                                                </span>
                                            ))}
                                        </p>
                                    )}
                                    <p className="text-charcoal/40 text-xs mt-1">
                                        {new Date(order.created_at).toLocaleString("en-IN")}
                                    </p>
                                </div>

                                {/* Status Update Buttons */}
                                {order.status !== "completed" && order.status !== "cancelled" && (
                                    <div className="flex flex-wrap gap-2">
                                        {order.status === "pending" && (
                                            <button onClick={() => updateStatus(order.id, "accepted")} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">
                                                Accept
                                            </button>
                                        )}
                                        {order.status === "accepted" && (
                                            <button onClick={() => updateStatus(order.id, "preparing")} className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-medium hover:bg-purple-600 transition-colors">
                                                Start Preparing
                                            </button>
                                        )}
                                        {order.status === "preparing" && (
                                            <button onClick={() => updateStatus(order.id, "ready")} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors">
                                                Mark Ready
                                            </button>
                                        )}
                                        {order.status === "ready" && (
                                            <button onClick={() => updateStatus(order.id, "completed")} className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-medium hover:bg-green-800 transition-colors">
                                                Complete
                                            </button>
                                        )}
                                        {order.status === "pending" && (
                                            <button onClick={() => updateStatus(order.id, "cancelled")} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && total > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-charcoal/60">
                    <p>
                        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-colors"
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-2 rounded-lg bg-white border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-colors"
                            aria-label="Next page"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
