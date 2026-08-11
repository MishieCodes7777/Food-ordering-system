import { useState, useEffect, useCallback } from "react";
import { Receipt, ArrowDownCircle, ArrowUpCircle, Wallet, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api.js";
import AdminPageHeader from "../../components/admin/AdminPageHeader.jsx";
import AdminStatCard from "../../components/admin/AdminStatCard.jsx";
import AdminTable from "../../components/admin/AdminTable.jsx";
import { downloadCsv } from "../../utils/csvExport.js";

const STATUS_FILTERS = ["", "completed", "pending", "refunded", "failed"];

const STATUS_BADGE = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    refunded: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
};

const AdminLedger = () => {
    const [summary, setSummary] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [sortBy, setSortBy] = useState("date");
    const [sortDir, setSortDir] = useState("desc");
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const limit = 20;

    useEffect(() => {
        api.get("/api/admin/ledger/summary")
            .then((res) => setSummary(res.data))
            .catch(() => {});
    }, []);

    const fetchLedger = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page, limit, sortBy, sortDir });
            if (search) params.set("search", search);
            if (status) params.set("status", status);

            const res = await api.get(`/api/admin/ledger?${params.toString()}`);
            setTransactions(res.data.transactions || []);
            setTotal(res.data.total || 0);
        } catch {
            setTransactions([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, sortBy, sortDir, search, status]);

    useEffect(() => {
        fetchLedger();
    }, [fetchLedger]);

    // Reset to page 1 whenever a filter changes, so you don't get stranded on
    // a page number that no longer has results — done in the handlers
    // themselves rather than a separate effect watching for the change.
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleStatusChange = (s) => {
        setStatus(s);
        setPage(1);
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const params = new URLSearchParams({ export: "true", sortBy, sortDir });
            if (search) params.set("search", search);
            if (status) params.set("status", status);

            const res = await api.get(`/api/admin/ledger?${params.toString()}`);
            const rows = res.data.transactions || [];
            if (rows.length === 0) {
                toast.error("No transactions to export");
                return;
            }

            downloadCsv(`ledger-${new Date().toISOString().slice(0, 10)}.csv`, [
                { label: "Transaction ID", value: (r) => r.transaction_id },
                { label: "Date", value: (r) => new Date(r.created_at).toLocaleString("en-IN") },
                { label: "Customer", value: (r) => r.customer_name || "Unknown" },
                { label: "Order ID", value: (r) => r.order_id },
                { label: "Method", value: (r) => r.payment_method },
                { label: "Status", value: (r) => r.payment_status },
                { label: "Amount", value: (r) => r.amount },
            ], rows);
        } catch {
            toast.error("Couldn't export ledger, try again");
        } finally {
            setExporting(false);
        }
    };

    const handleSort = (key) => {
        if (sortBy === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(key);
            setSortDir("desc");
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const columns = [
        {
            key: "date",
            label: "Transaction",
            sortable: true,
            render: (row) => (
                <div>
                    <p className="font-medium text-charcoal">{row.transaction_id}</p>
                    <p className="text-xs text-charcoal/40">{new Date(row.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
            ),
        },
        {
            key: "customer",
            label: "Customer",
            render: (row) => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {row.customer_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <span>{row.customer_name || "Unknown"}</span>
                </div>
            ),
        },
        {
            key: "order",
            label: "Order",
            render: (row) => <span className="text-charcoal/70">#{row.order_id}</span>,
        },
        {
            key: "method",
            label: "Method",
            render: (row) => <span className="text-charcoal/50 text-xs uppercase">{row.payment_method}</span>,
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (row) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[row.payment_status] || "bg-gray-100 text-gray-600"}`}>
                    {row.payment_status}
                </span>
            ),
        },
        {
            key: "amount",
            label: "Amount",
            sortable: true,
            render: (row) => (
                <span className={`font-semibold ${row.payment_status === "refunded" || row.payment_status === "failed" ? "text-red-600" : "text-green-600"}`}>
                    {row.payment_status === "refunded" ? "−" : "+"}₹{parseFloat(row.amount).toFixed(2)}
                </span>
            ),
        },
    ];

    return (
        <div>
            <AdminPageHeader
                title="Ledger"
                subtitle="All payment transactions for your restaurant"
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

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <AdminStatCard
                    label="Total Transactions"
                    value={summary?.total_transactions ?? "—"}
                    icon={<Receipt size={20} />}
                    color="bg-charcoal"
                />
                <AdminStatCard
                    label="Total Received"
                    value={`₹${Math.round(summary?.total_received ?? 0)}`}
                    icon={<ArrowDownCircle size={20} />}
                    color="bg-green-600"
                />
                <AdminStatCard
                    label="Total Refunded"
                    value={`₹${Math.round(summary?.total_refunded ?? 0)}`}
                    icon={<ArrowUpCircle size={20} />}
                    color="bg-red-500"
                />
                <AdminStatCard
                    label="Net Revenue"
                    value={`₹${Math.round(summary?.net_revenue ?? 0)}`}
                    icon={<Wallet size={20} />}
                    color="bg-accent"
                />
            </div>

            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/30" />
                    <input
                        type="text"
                        value={search}
                        onChange={handleSearchChange}
                        placeholder="Search by transaction ID, order ID, or customer name..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {STATUS_FILTERS.map((s) => (
                        <button
                            key={s || "all"}
                            onClick={() => handleStatusChange(s)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all ${status === s ? "bg-primary text-white" : "bg-white text-charcoal border border-gray-200 hover:border-primary"}`}
                        >
                            {s || "All"}
                        </button>
                    ))}
                </div>
            </div>

            <AdminTable
                columns={columns}
                data={transactions}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                loading={loading}
                emptyMessage="No transactions found"
            />

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

export default AdminLedger;
