// Consistent title + right-aligned action-buttons row, used across admin
// pages instead of each page rendering its own ad hoc <h1>.
const AdminPageHeader = ({ title, subtitle, actions }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
            <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
            {subtitle && <p className="text-charcoal/50 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
);

export default AdminPageHeader;
