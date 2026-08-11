import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// Generic sortable (and optionally bulk-selectable) table shared across
// admin list pages. Sorting is "controlled" — this component doesn't sort
// data itself, it just renders headers and reports clicks via onSort, since
// pages like Ledger sort server-side.
const AdminTable = ({
    columns,
    data,
    sortBy,
    sortDir = "desc",
    onSort,
    selectable = false,
    selectedIds = [],
    onToggleSelect,
    onToggleSelectAll,
    loading = false,
    emptyMessage = "No data found",
    getRowKey = (row) => row.id,
}) => {
    const allSelected = selectable && data.length > 0 && data.every((row) => selectedIds.includes(getRowKey(row)));

    const handleHeaderClick = (col) => {
        if (!col.sortable || !onSort) return;
        onSort(col.key);
    };

    const SortIcon = ({ col }) => {
        if (!col.sortable) return null;
        if (sortBy !== col.key) return <ChevronsUpDown size={14} className="text-charcoal/30" />;
        return sortDir === "asc" ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-primary" />;
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16 bg-white rounded-2xl">
                <div className="w-8 h-8 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-2xl">
                <p className="text-charcoal/40">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-cream border-b border-gray-100">
                            {selectable && (
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={onToggleSelectAll}
                                        className="rounded"
                                        aria-label="Select all rows"
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => handleHeaderClick(col)}
                                    className={`px-4 py-3 text-left font-medium text-charcoal/60 whitespace-nowrap ${col.sortable ? "cursor-pointer select-none hover:text-charcoal" : ""}`}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        {col.label}
                                        <SortIcon col={col} />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((row) => {
                            const rowKey = getRowKey(row);
                            return (
                                <tr key={rowKey} className="hover:bg-cream/50 transition-colors">
                                    {selectable && (
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(rowKey)}
                                                onChange={() => onToggleSelect(rowKey)}
                                                className="rounded"
                                                aria-label={`Select row ${rowKey}`}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-4 py-3 text-charcoal">
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminTable;
