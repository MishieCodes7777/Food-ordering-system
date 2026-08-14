import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, FolderOpen } from "lucide-react";
import api from "../../services/api.js";
import { toast } from "sonner";
import { useAdminCrud } from "../../hooks/useAdminCrud.js";
import { useImageUpload } from "../../hooks/useImageUpload.js";

const INITIAL_FORM = {
    category_id: "", name: "", description: "", price: "", discount_price: "",
    image_url: "", food_type: "veg", is_available: true, preparation_time: "", calories: "",
};

const toItemForm = (item) => ({
    category_id: item.category_id, name: item.name, description: item.description || "",
    price: item.price, discount_price: item.discount_price || "", image_url: item.image_url || "",
    food_type: item.food_type || (item.is_veg ? "veg" : "non-veg"),
    is_available: item.is_available, preparation_time: item.preparation_time || "", calories: item.calories || "",
});

const transformItemPayload = (form) => {
    const payload = {
        ...form,
        category_id: parseInt(form.category_id),
        price: parseFloat(form.price),
        discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
        preparation_time: form.preparation_time ? parseInt(form.preparation_time) : null,
        calories: form.calories ? parseInt(form.calories) : null,
        is_veg: form.food_type === "veg" || form.food_type === "both",
        food_type: form.food_type,
    };
    delete payload.food_type;
    return payload;
};

const AdminMenuItems = () => {
    const [categories, setCategories] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState("");

    const {
        items, loading, showModal, setShowModal, editing, form, setForm,
        openCreate, openEdit, handleSubmit, handleDelete, fetchItems,
    } = useAdminCrud({
        endpoint: "/api/admin/menu-items",
        listKey: "menu_items",
        initialForm: INITIAL_FORM,
        resourceLabel: "Item",
        transformPayload: transformItemPayload,
        deleteConfirmMessage: "Delete this menu item?",
    });

    const { uploading, handleImageUpload } = useImageUpload((image_url) => setForm((prev) => ({ ...prev, image_url })));

    useEffect(() => {
        api.get("/api/admin/categories")
            .then((res) => setCategories(res.data.categories || []))
            .catch(() => {});
    }, []);

    const toggleAvailability = async (id) => {
        try {
            const res = await api.put(`/api/admin/menu-items/${id}/availability`);
            toast.success(res.data.message);
            fetchItems();
        } catch {
            toast.error("Something went wrong");
        }
    };

    const toggleFeatured = async (id) => {
        try {
            const res = await api.put(`/api/admin/menu-items/${id}/featured`);
            toast.success(res.data.message);
            fetchItems();
        } catch {
            toast.error("Something went wrong");
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-charcoal">Menu Items</h1>
                <button onClick={() => openCreate({ category_id: categories[0]?.id || "" })} className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors">
                    <Plus size={16} /> Add Item
                </button>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setCategoryFilter("")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${!categoryFilter ? "bg-primary text-white" : "bg-white text-charcoal border border-gray-200 hover:border-primary"}`}
                >
                    <FolderOpen size={14} /> All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${categoryFilter === cat.id ? "bg-primary text-white" : "bg-white text-charcoal border border-gray-200 hover:border-primary"}`}
                    >
                        <FolderOpen size={14} /> {cat.name}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl">
                    <p className="text-charcoal/50">No menu items yet. Add your first dish!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {items.filter(item => !categoryFilter || item.category_id === categoryFilter).map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            {/* Image */}
                            <div className="h-40 bg-cream relative overflow-hidden flex items-center justify-center p-4">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="h-full w-auto object-contain group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <span className="text-5xl">🍽️</span>
                                )}
                                {/* Food type badge */}
                                <div className="absolute top-3 left-3">
                                    {item.is_veg ? (
                                        <span className="w-4 h-4 border-2 border-green-600 rounded-sm flex items-center justify-center"><span className="w-2 h-2 bg-green-600 rounded-full"></span></span>
                                    ) : (
                                        <span className="w-4 h-4 border-2 border-red-600 rounded-sm flex items-center justify-center"><span className="w-2 h-2 bg-red-600 rounded-full"></span></span>
                                    )}
                                </div>
                                {/* Featured badge */}
                                {item.is_featured && (
                                    <span className="absolute top-3 right-3 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">Featured</span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <p className="text-xs text-charcoal/40 font-medium">{item.category_name}</p>
                                <h3 className="font-semibold text-charcoal mt-1 text-sm line-clamp-1">{item.name}</h3>

                                {/* Price row */}
                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-accent font-bold text-lg">₹{item.discount_price || item.price}</span>
                                        {item.discount_price && parseFloat(item.discount_price) < parseFloat(item.price) && (
                                            <span className="text-charcoal/30 text-xs line-through">₹{item.price}</span>
                                        )}
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => openEdit(item, toItemForm)} className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary hover:text-white text-primary transition-all">
                                            <Pencil size={12} />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-500 hover:text-white text-red-500 transition-all">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Status toggles */}
                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => toggleAvailability(item.id)}
                                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium text-center transition-all ${item.is_available ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                                    >
                                        {item.is_available ? "Available" : "Unavailable"}
                                    </button>
                                    <button
                                        onClick={() => toggleFeatured(item.id)}
                                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium text-center transition-all ${item.is_featured ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                                    >
                                        {item.is_featured ? "★ Featured" : "☆ Feature"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-charcoal">{editing ? "Edit Item" : "New Menu Item"}</h2>
                            <button onClick={() => setShowModal(false)} className="text-charcoal/40 hover:text-charcoal"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-charcoal mb-1">Name *</label>
                                    <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-charcoal mb-1">Category *</label>
                                    <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm">
                                        <option value="">Select</option>
                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-charcoal mb-1">Price (₹) *</label>
                                    <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-charcoal mb-1">Discount Price</label>
                                    <input type="number" step="0.01" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-charcoal mb-1">Prep Time (mins)</label>
                                    <input type="number" value={form.preparation_time} onChange={(e) => setForm({ ...form, preparation_time: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-charcoal mb-1">Calories</label>
                                    <input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-charcoal mb-1">Image</label>
                                    <div className="space-y-2">
                                        {form.image_url && (
                                            <img src={form.image_url} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                                        )}
                                        <label className="block cursor-pointer bg-gray-100 hover:bg-gray-200 text-charcoal text-xs font-medium py-2 rounded-lg text-center transition-colors">
                                            {uploading ? "Uploading..." : "📷 Upload Image"}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleImageUpload}
                                                disabled={uploading}
                                                className="hidden"
                                            />
                                        </label>
                                        <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm" placeholder="Or paste URL" />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-charcoal mb-1">Description</label>
                                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-primary outline-none text-sm resize-none" />
                                </div>
                                <div className="flex items-center gap-4 col-span-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-charcoal mb-1">Food Type</label>
                                        <div className="flex gap-3">
                                            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm ${form.food_type === "veg" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-charcoal/60"}`}>
                                                <input type="radio" name="food_type" value="veg" checked={form.food_type === "veg"} onChange={(e) => setForm({ ...form, food_type: e.target.value })} className="hidden" />
                                                <span className="w-3 h-3 border-2 border-green-600 rounded-sm flex items-center justify-center"><span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span></span>
                                                Veg
                                            </label>
                                            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm ${form.food_type === "non-veg" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-charcoal/60"}`}>
                                                <input type="radio" name="food_type" value="non-veg" checked={form.food_type === "non-veg"} onChange={(e) => setForm({ ...form, food_type: e.target.value })} className="hidden" />
                                                <span className="w-3 h-3 border-2 border-red-600 rounded-sm flex items-center justify-center"><span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span></span>
                                                Non-Veg
                                            </label>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm mt-2">
                                        <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="rounded" />
                                        Available
                                    </label>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium transition-all">
                                {editing ? "Update" : "Create"} Item
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMenuItems;
