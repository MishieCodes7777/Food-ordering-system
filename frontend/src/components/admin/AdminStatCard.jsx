// Shared stat-card used by Dashboard and Ledger. `trend` is optional so this
// works today (plain number) and later once period-over-period comparison
// is wired up (adds a delta line) without needing another prop/shape change.
const AdminStatCard = ({ label, value, icon, color = "bg-primary", trend }) => (
    <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-charcoal/50 text-xs font-medium">{label}</p>
                <p className="text-2xl font-bold text-charcoal mt-1">{value}</p>
            </div>
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                {icon}
            </div>
        </div>
        {trend && (
            <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${trend.direction === "up" ? "text-green-600" : "text-red-600"}`}>
                {trend.direction === "up" ? "↗" : "↘"} {trend.percent}% vs previous period
            </p>
        )}
    </div>
);

export default AdminStatCard;
