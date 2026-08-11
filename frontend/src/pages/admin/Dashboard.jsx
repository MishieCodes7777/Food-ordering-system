import { useState, useEffect } from "react";
import { ClipboardList, DollarSign, TrendingUp, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../../services/api.js";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import AdminStatCard from "../../components/admin/AdminStatCard.jsx";

const Dashboard = () => {
    const { admin } = useAdminAuth();
    const [summary, setSummary] = useState(null);
    const [dailyData, setDailyData] = useState([]);
    const [previousDailyData, setPreviousDailyData] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const [summaryRes, dailyRes, ordersRes] = await Promise.all([
                api.get("/api/admin/analytics/summary"),
                api.get("/api/admin/analytics/daily?days=7&compare=true"),
                api.get("/api/admin/orders?status=pending"),
            ]);
            setSummary(summaryRes.data);
            setDailyData(dailyRes.data.analytics || []);
            setPreviousDailyData(dailyRes.data.previous_analytics || []);
            setPendingOrders(ordersRes.data.orders || []);
        } catch { } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
            </div>
        );
    }

    const chartData = dailyData.map((d, idx) => ({
        date: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        revenue: parseFloat(d.total_revenue),
        orders: parseInt(d.total_orders),
        prevRevenue: previousDailyData[idx] ? parseFloat(previousDailyData[idx].total_revenue) : null,
    }));

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-charcoal">Dashboard</h1>
                <p className="text-charcoal/50 text-sm">Welcome back, {admin?.name}!</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <AdminStatCard
                    label="Today's Orders"
                    value={summary?.today?.total_orders || 0}
                    icon={<ClipboardList size={20} />}
                    color="bg-primary"
                    trend={summary?.today?.orders_trend}
                />
                <AdminStatCard
                    label="Today's Revenue"
                    value={`₹${Math.round(parseFloat(summary?.today?.total_revenue || 0))}`}
                    icon={<DollarSign size={20} />}
                    color="bg-accent"
                    trend={summary?.today?.revenue_trend}
                />
                <AdminStatCard
                    label="Weekly Revenue"
                    value={`₹${Math.round(parseFloat(summary?.this_week?.total_revenue || 0))}`}
                    icon={<TrendingUp size={20} />}
                    color="bg-primary"
                    trend={summary?.this_week?.revenue_trend}
                />
                <AdminStatCard
                    label="Avg Order Value"
                    value={`₹${Math.round(parseFloat(summary?.today?.average_order_value || 0))}`}
                    icon={<Clock size={20} />}
                    color="bg-charcoal"
                />
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-charcoal mb-4">Revenue (Last 7 Days vs Previous 7 Days)</h2>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#999" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#999" />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: '1px solid #eee' }}
                                formatter={(value, name) => [`₹${value}`, name === "revenue" ? "This period" : "Previous period"]}
                            />
                            <Legend formatter={(value) => value === "revenue" ? "This period" : "Previous period"} />
                            <Line type="monotone" dataKey="revenue" stroke="#1a3c34" strokeWidth={2.5} dot={{ fill: '#e87a2e', r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="prevRevenue" stroke="#999" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-charcoal/40 text-center py-8">No data for this period</p>
                )}
            </div>

            {/* Daily Revenue Cards */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-charcoal mb-4">Daily Breakdown</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                    {chartData.map((day, idx) => (
                        <div key={idx} className="bg-cream rounded-xl p-3 text-center">
                            <p className="text-xs text-charcoal/50 font-medium">{day.date}</p>
                            <p className="text-lg font-bold text-primary mt-1">₹{day.revenue}</p>
                            <p className="text-xs text-charcoal/40">{day.orders} orders</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pending Orders */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-charcoal mb-4">Pending Orders</h2>
                {pendingOrders.length === 0 ? (
                    <p className="text-charcoal/40 text-sm">No pending orders right now.</p>
                ) : (
                    <div className="space-y-3">
                        {pendingOrders.slice(0, 5).map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-3 bg-cream rounded-xl">
                                <div>
                                    <p className="font-medium text-charcoal text-sm">Order #{order.id}</p>
                                    <p className="text-xs text-charcoal/50">{order.customer_name} • {new Date(order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                                </div>
                                <span className="font-bold text-accent">₹{order.total_amount}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
