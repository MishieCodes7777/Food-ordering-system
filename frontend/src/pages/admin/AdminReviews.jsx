import { useState, useEffect, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api.js";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import AdminTable from "../../components/admin/AdminTable.jsx";
import StarRating from "../../components/StarRating.jsx";

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const limit = 20;

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/admin/reviews?page=${page}&limit=${limit}`);
            setReviews(res.data.reviews || []);
            setTotal(res.data.total || 0);
        } catch {
            setReviews([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleDelete = async (id) => {
        if (!confirm("Remove this review? This can't be undone.")) return;
        try {
            await api.delete(`/api/admin/reviews/${id}`);
            toast.success("Review removed");
            fetchReviews();
        } catch {
            toast.error("Couldn't remove review, try again");
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const columns = [
        { key: "item_name", label: "Item", render: (row) => <span className="font-medium">{row.item_name}</span> },
        { key: "customer_name", label: "Customer" },
        { key: "rating", label: "Rating", render: (row) => <StarRating value={row.rating} size={14} /> },
        { key: "comment", label: "Comment", render: (row) => <span className="text-charcoal/60">{row.comment || "—"}</span> },
        { key: "created_at", label: "Date", render: (row) => new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
        {
            key: "actions",
            label: "",
            render: (row) => (
                <button
                    onClick={() => handleDelete(row.id)}
                    className="text-charcoal/40 hover:text-red-600 transition-colors"
                    aria-label="Delete review"
                >
                    <Trash2 size={16} />
                </button>
            ),
        },
    ];

    return (
        <div>
            <AdminPageHeader title="Reviews" subtitle="Customer ratings and comments on your menu items" />

            <AdminTable
                columns={columns}
                data={reviews}
                loading={loading}
                emptyMessage="No reviews yet"
            />

            {!loading && total > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-charcoal/60">
                    <p>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-colors"
                        >
                            Prev
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReviews;
