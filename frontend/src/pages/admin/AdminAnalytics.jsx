import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Wallet, DollarSign } from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import api from "../../services/api.js";
import AdminStatCard from "../../components/admin/AdminStatCard.jsx";

const COLORS = ['#1a3c34', '#e87a2e', '#2d5c4f', '#c55f1a', '#0f2620'];

const AdminAnalytics = () => {
    const [summary, setSummary] = useState(null);
    const [dailyData, setDailyData] = useState([]);
    const [previousDailyData, setPreviousDailyData] = useState([]);
    const [popularItems, setPopularItems] = useState([]);
    const [revenueBreakdown, setRevenueBreakdown] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [summaryRes, dailyRes, popularRes, revenueRes] = await Promise.all([
                api.get("/api/admin/analytics/summary"),
                api.get("/api/admin/analytics/daily?days=30&compare=true"),
                api.get("/api/admin/analytics/popular-items?limit=5"),
                api.get("/api/admin/analytics/revenue"),
            ]);
            setSummary(summaryRes.data);
            setDailyData(dailyRes.data.analytics || []);
            setPreviousDailyData(dailyRes.data.previous_analytics || []);
            setPopularItems(popularRes.data.popular_items || []);
            setRevenueBreakdown(revenueRes.data.revenue_breakdown || []);
        } catch { } finally {
            setLoading(false);
        }
    };

    // Calendar helpers
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const changeMonth = (dir) => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + dir);
        setSelectedMonth(newDate);
    };

    // Builds a plain "YYYY-MM-DD" key from a Date's own local year/month/day —
    // deliberately NOT date.toISOString(), which converts through UTC and
    // shifts the date backward by a day in any timezone ahead of UTC (e.g.
    // IST). Matches the backend's TO_CHAR(created_at, 'YYYY-MM-DD') format,
    // so this stays correct regardless of what timezone the server runs in.
    const toDateKey = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // Parses a "YYYY-MM-DD" string as a local date, not UTC midnight — avoids
    // the same class of off-by-one shift when displaying it back.
    const parseDateKey = (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const getRevenueForDate = (date) => {
        const day = dailyData.find(d => d.date === toDateKey(date));
        return day ? parseFloat(day.total_revenue) : 0;
    };

    const getOrdersForDate = (date) => {
        const day = dailyData.find(d => d.date === toDateKey(date));
        return day ? parseInt(day.total_orders) : 0;
    };

    // Chart data — backend already returns both series oldest-to-newest and
    // equal length, so we can zip current[i] with previous[i] by index
    // ("day i of this period" vs "day i of the prior period").
    const lineChartData = dailyData.map((d, idx) => ({
        date: parseDateKey(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        revenue: Math.round(parseFloat(d.total_revenue)),
        prevRevenue: previousDailyData[idx] ? Math.round(parseFloat(previousDailyData[idx].total_revenue)) : null,
    }));

    const pieData = revenueBreakdown.map(r => ({
        name: r.payment_status,
        value: Math.round(parseFloat(r.total_amount)),
    }));

    const barData = popularItems.map(item => ({
        name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
        quantity: parseInt(item.total_quantity),
    }));

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
            </div>
        );
    }

    // Calendar rendering
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    return (
        <div>
            <h1 className="text-2xl font-bold text-charcoal mb-6">Analytics</h1>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <AdminStatCard
                    label="This Month"
                    value={`₹${Math.round(parseFloat(summary?.this_month?.total_revenue || 0))}`}
                    icon={<Wallet size={20} />}
                    color="bg-charcoal"
                    trend={summary?.this_month?.revenue_trend}
                />
                <AdminStatCard
                    label="This Week"
                    value={`₹${Math.round(parseFloat(summary?.this_week?.total_revenue || 0))}`}
                    icon={<TrendingUp size={20} />}
                    color="bg-primary"
                    trend={summary?.this_week?.revenue_trend}
                />
                <AdminStatCard
                    label="Today"
                    value={`₹${Math.round(parseFloat(summary?.today?.total_revenue || 0))}`}
                    icon={<DollarSign size={20} />}
                    color="bg-accent"
                    trend={summary?.today?.revenue_trend}
                />
            </div>

            {/* Revenue Line Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="text-lg font-semibold text-charcoal mb-4">Revenue Trend (30 Days vs Previous 30 Days)</h2>
                {lineChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={lineChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#999" />
                            <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #eee' }} />
                            <Line type="monotone" dataKey="revenue" stroke="#1a3c34" strokeWidth={2.5} dot={{ fill: '#e87a2e', r: 3 }} name="This period (₹)" />
                            <Line type="monotone" dataKey="prevRevenue" stroke="#999" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Previous period (₹)" />
                            <Legend />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-charcoal/40 text-center py-8">No data yet</p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Popular Items Bar Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-charcoal mb-4">Most Ordered Items</h2>
                    {barData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#999" />
                                <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #eee' }} />
                                <Bar dataKey="quantity" fill="#1a3c34" radius={[6, 6, 0, 0]} name="Times Ordered" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-charcoal/40 text-center py-8">No data yet</p>
                    )}
                </div>

                {/* Payment Pie Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-charcoal mb-4">Payment Breakdown</h2>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `₹${value}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-charcoal/40 text-center py-8">No payment data yet</p>
                    )}
                </div>
            </div>

            {/* Calendar Revenue View */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-charcoal flex items-center gap-2">
                        <Calendar size={20} className="text-primary" />
                        Monthly Revenue Calendar
                    </h2>
                    <div className="flex items-center gap-3">
                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-cream rounded-lg transition-colors">
                            <ChevronLeft size={20} className="text-charcoal" />
                        </button>
                        <span className="text-sm font-medium text-charcoal min-w-[120px] text-center">
                            {selectedMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-cream rounded-lg transition-colors">
                            <ChevronRight size={20} className="text-charcoal" />
                        </button>
                    </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs font-medium text-charcoal/40 py-1">{d}</div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, idx) => {
                        if (!day) return <div key={idx} />;
                        const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
                        const revenue = getRevenueForDate(date);
                        const orders = getOrdersForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (revenue > 0 || isToday) setSelectedDate(date);
                                }}
                                className={`rounded-xl p-2 text-center min-h-[60px] flex flex-col justify-center cursor-pointer transition-all hover:ring-2 hover:ring-accent/30 ${isToday ? 'bg-primary text-white' : selectedDate?.toDateString() === date.toDateString() ? 'bg-accent/10 ring-2 ring-accent' : revenue > 0 ? 'bg-cream' : 'bg-gray-50'}`}
                            >
                                <p className={`text-xs font-medium ${isToday ? 'text-white/70' : 'text-charcoal/50'}`}>{day}</p>
                                {revenue > 0 && (
                                    <>
                                        <p className={`text-xs font-bold mt-0.5 ${isToday ? 'text-white' : 'text-primary'}`}>₹{Math.round(revenue)}</p>
                                        <p className={`text-[10px] ${isToday ? 'text-white/60' : 'text-charcoal/40'}`}>{orders}ord</p>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Selected date detail */}
                {selectedDate && (
                    <div className="mt-4 p-4 bg-cream rounded-xl border border-accent/20">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-charcoal">
                                {selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                            </h3>
                            <button onClick={() => setSelectedDate(null)} className="text-charcoal/40 hover:text-charcoal text-sm">✕</button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">₹{Math.round(getRevenueForDate(selectedDate))}</p>
                                <p className="text-xs text-charcoal/50">Revenue</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-charcoal">{getOrdersForDate(selectedDate)}</p>
                                <p className="text-xs text-charcoal/50">Orders</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-accent">
                                    ₹{getOrdersForDate(selectedDate) > 0 ? Math.round(getRevenueForDate(selectedDate) / getOrdersForDate(selectedDate)) : 0}
                                </p>
                                <p className="text-xs text-charcoal/50">Avg Order</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAnalytics;
