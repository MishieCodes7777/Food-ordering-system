import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../services/api.js";
import { useAdminCrud } from "../../hooks/useAdminCrud.js";

const INITIAL_FORM = { table_number: "", table_name: "", capacity: "" };

const toTableForm = (table) => ({
    table_number: table.table_number,
    table_name: table.table_name || "",
    capacity: table.capacity || "",
});

const AdminTables = () => {
    const {
        items: tables, loading, showModal, setShowModal, editing, form, setForm,
        openCreate, openEdit, handleSubmit, handleDelete, fetchItems: fetchTables,
    } = useAdminCrud({
        endpoint: "/api/admin/tables",
        listKey: "tables",
        initialForm: INITIAL_FORM,
        resourceLabel: "Table",
        saveErrorMessage: "Failed",
        deleteErrorMessage: "Failed",
        transformPayload: (f) => ({
            table_number: parseInt(f.table_number),
            table_name: f.table_name || undefined,
            capacity: f.capacity ? parseInt(f.capacity) : undefined,
        }),
    });

    const toggleTable = async (id) => {
        try {
            const res = await api.put(`/api/admin/tables/${id}/toggle`);
            toast.success(res.data.message);
            fetchTables();
        } catch { toast.error("Failed"); }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-charcoal">Tables</h1>
                <button onClick={openCreate} className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors">
                    <Plus size={16} /> Add Table
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
                </div>
            ) : tables.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                    <p className="text-charcoal/50">No tables yet. Add your first one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {tables.map((table) => (
                        <div key={table.id} className="bg-white rounded-xl p-5 shadow-sm text-center">
                            <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                <span className="text-primary font-bold text-lg">{table.table_number}</span>
                            </div>
                            <h3 className="font-semibold text-charcoal">{table.table_name || `Table ${table.table_number}`}</h3>
                            {table.capacity && <p className="text-charcoal/50 text-sm">{table.capacity} seats</p>}
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <button
                                    onClick={() => toggleTable(table.id)}
                                    className={`px-2 py-1 rounded text-xs font-medium ${table.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                >
                                    {table.is_active ? "Active" : "Disabled"}
                                </button>
                                <button onClick={() => openEdit(table, toTableForm)} className="text-charcoal/40 hover:text-primary"><Pencil size={14} /></button>
                                <button onClick={() => handleDelete(table.id)} className="text-charcoal/40 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-charcoal">{editing ? "Edit Table" : "New Table"}</h2>
                            <button onClick={() => setShowModal(false)} className="text-charcoal/40 hover:text-charcoal"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Table Number *</label>
                                <input type="number" value={form.table_number} onChange={(e) => setForm({ ...form, table_number: e.target.value })} required className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Table Name</label>
                                <input type="text" value={form.table_name} onChange={(e) => setForm({ ...form, table_name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" placeholder="e.g. VIP Table" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Capacity (seats)</label>
                                <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                            </div>
                            <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium transition-all">
                                {editing ? "Update" : "Create"} Table
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTables;
