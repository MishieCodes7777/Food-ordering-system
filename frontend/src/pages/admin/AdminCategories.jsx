import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useAdminCrud } from "../../hooks/useAdminCrud.js";
import { useImageUpload } from "../../hooks/useImageUpload.js";

const INITIAL_FORM = { name: "", description: "", image_url: "", display_order: 0 };

const AdminCategories = () => {
    const {
        items: categories, loading, showModal, setShowModal, editing, form, setForm,
        openCreate, openEdit, handleSubmit, handleDelete,
    } = useAdminCrud({
        endpoint: "/api/admin/categories",
        listKey: "categories",
        initialForm: INITIAL_FORM,
        resourceLabel: "Category",
        saveErrorMessage: "Failed",
        deleteErrorMessage: "Failed to delete",
    });

    const { uploading, handleImageUpload } = useImageUpload((image_url) => setForm((prev) => ({ ...prev, image_url })));

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-charcoal">Categories</h1>
                <button onClick={openCreate} className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors">
                    <Plus size={16} /> Add Category
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
                </div>
            ) : categories.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                    <p className="text-charcoal/50">No categories yet. Add your first one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                        <div key={cat.id} className="bg-white rounded-xl p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-charcoal">{cat.name}</h3>
                                    {cat.description && <p className="text-charcoal/50 text-sm mt-1">{cat.description}</p>}
                                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${cat.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                        {cat.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(cat, (c) => ({ name: c.name, description: c.description || "", image_url: c.image_url || "", display_order: c.display_order || 0 }))} className="text-charcoal/40 hover:text-primary transition-colors" aria-label="Edit">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id)} className="text-charcoal/40 hover:text-red-500 transition-colors" aria-label="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
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
                            <h2 className="text-lg font-semibold text-charcoal">{editing ? "Edit Category" : "New Category"}</h2>
                            <button onClick={() => setShowModal(false)} className="text-charcoal/40 hover:text-charcoal"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Name *</label>
                                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. Pizza" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
                                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Optional description" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Image</label>
                                <div className="space-y-2">
                                    {form.image_url && (
                                        <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                                    )}
                                    <div className="flex gap-2">
                                        <label className="flex-1 cursor-pointer bg-gray-100 hover:bg-gray-200 text-charcoal text-sm font-medium py-2.5 rounded-lg text-center transition-colors">
                                            {uploading ? "Uploading..." : "📷 Camera / Gallery"}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleImageUpload}
                                                disabled={uploading}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" placeholder="Or paste URL directly" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal mb-1">Display Order</label>
                                <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                            </div>
                            <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium transition-all">
                                {editing ? "Update" : "Create"} Category
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCategories;
