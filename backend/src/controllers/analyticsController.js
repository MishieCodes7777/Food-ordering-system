import pool from "../db/db.js";

// current vs previous period -> {direction, percent} for AdminStatCard, or
// null when there's no previous-period baseline to compare against
const computeTrend = (current, previous) => {
    const curr = parseFloat(current) || 0;
    const prev = parseFloat(previous) || 0;
    if (prev === 0) return null;
    const percent = ((curr - prev) / prev) * 100;
    return { direction: percent >= 0 ? "up" : "down", percent: Math.abs(Math.round(percent)) };
};

// GET /api/admin/analytics/summary — today/week/month stats plus their
// immediately-preceding period of the same length, for trend deltas
export const getAnalyticsSummary = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        // One scan over the last 60 days (the widest window needed, for
        // month-over-month) with FILTER-based buckets for each period pair.
        const result = await pool.query(
            `SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE), 0) as today_revenue,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE) as yesterday_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE), 0) as yesterday_revenue,

        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as week_revenue,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days') as prev_week_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'), 0) as prev_week_revenue,

        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as month_revenue,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days') as prev_month_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '60 days' AND created_at < CURRENT_DATE - INTERVAL '30 days'), 0) as prev_month_revenue
      FROM orders
      WHERE restaurant_id = $1 AND status NOT IN ('pending', 'cancelled') AND created_at >= CURRENT_DATE - INTERVAL '60 days'`,
            [restaurantId]
        );

        const r = result.rows[0];
        const avg = (revenue, orders) => (orders > 0 ? revenue / orders : 0);

        res.json({
            today: {
                total_orders: r.today_orders,
                total_revenue: r.today_revenue,
                average_order_value: avg(r.today_revenue, r.today_orders),
                orders_trend: computeTrend(r.today_orders, r.yesterday_orders),
                revenue_trend: computeTrend(r.today_revenue, r.yesterday_revenue),
            },
            this_week: {
                total_orders: r.week_orders,
                total_revenue: r.week_revenue,
                average_order_value: avg(r.week_revenue, r.week_orders),
                orders_trend: computeTrend(r.week_orders, r.prev_week_orders),
                revenue_trend: computeTrend(r.week_revenue, r.prev_week_revenue),
            },
            this_month: {
                total_orders: r.month_orders,
                total_revenue: r.month_revenue,
                average_order_value: avg(r.month_revenue, r.month_orders),
                orders_trend: computeTrend(r.month_orders, r.prev_month_orders),
                revenue_trend: computeTrend(r.month_revenue, r.prev_month_revenue),
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/analytics/daily — gap-free daily series (zero-filled via
// generate_series) for a date range, optionally with the immediately-preceding
// period of equal length for a current-vs-previous chart overlay
export const getDailyAnalytics = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const days = parseInt(req.query.days) || 30;
        const compare = req.query.compare === "true";

        const dailySeries = (startOffset, endOffset) =>
            pool.query(
                `SELECT
          TO_CHAR(gs.day, 'YYYY-MM-DD') as date,
          COALESCE(COUNT(o.id), 0) as total_orders,
          COALESCE(SUM(o.total_amount), 0) as total_revenue,
          COALESCE(AVG(o.total_amount), 0) as average_order_value
        FROM generate_series(CURRENT_DATE - $2::int, CURRENT_DATE - $3::int, '1 day'::interval) AS gs(day)
        LEFT JOIN orders o ON DATE(o.created_at) = gs.day AND o.restaurant_id = $1 AND o.status NOT IN ('pending', 'cancelled')
        GROUP BY gs.day
        ORDER BY gs.day ASC`,
                [restaurantId, startOffset, endOffset]
            );

        const current = await dailySeries(days - 1, 0);
        const previous = compare ? await dailySeries(days * 2 - 1, days) : null;

        res.json({
            analytics: current.rows,
            previous_analytics: previous ? previous.rows : null,
            period_days: days,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/analytics/popular-items — Get most popular menu items
export const getPopularItems = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;
        const limit = parseInt(req.query.limit) || 10;

        const popular = await pool.query(
            `SELECT
        mi.id, mi.name, mi.price, mi.image_url, mi.is_veg,
        COUNT(oi.id) as times_ordered,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE mi.restaurant_id = $1 AND o.status != 'cancelled'
      GROUP BY mi.id, mi.name, mi.price, mi.image_url, mi.is_veg
      ORDER BY total_quantity DESC
      LIMIT $2`,
            [restaurantId, limit]
        );

        res.json({ popular_items: popular.rows });
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/analytics/revenue — Revenue breakdown by payment status
export const getRevenueBreakdown = async (req, res, next) => {
    try {
        const restaurantId = req.admin.restaurant_id;

        const revenue = await pool.query(
            `SELECT
        p.payment_status,
        COUNT(*) as count,
        COALESCE(SUM(p.amount), 0) as total_amount
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE o.restaurant_id = $1
      GROUP BY p.payment_status`,
            [restaurantId]
        );

        res.json({ revenue_breakdown: revenue.rows });
    } catch (error) {
        next(error);
    }
};
