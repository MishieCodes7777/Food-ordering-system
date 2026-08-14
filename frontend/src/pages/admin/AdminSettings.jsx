import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import api from "../../services/api.js";
import { toast } from "sonner";

const AdminSettings = () => {
    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: "", description: "", email: "", phone: "",
        address: "", city: "", state: "", postal_code: "",
        opening_time: "", closing_time: "", gst_number: "",
        show_home_stats: true,
    });

    useEffect(() => { fetchRestaurant(); }, []);

    const fetchRestaurant = async () => {
        try {
            const res = await api.get("/api/admin/restaurant");
            const r = res.data.restaurant;
            setRestaurant(r);
            setForm({
                name: r.name || "", description: r.description || "", email: r.email || "",
                phone: r.phone || "", address: r.address || "", city: r.city || "",
                state: r.state || "", postal_code: r.postal_code || "",
                opening_time: r.opening_time || "", closing_time: r.closing_time || "",
                gst_number: r.gst_number || "",
                show_home_stats: r.show_home_stats !== false,
            });
        } catch { } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.put("/api/admin/restaurant", form);
            toast.success("Restaurant settings updated");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-charcoal mb-6">Restaurant Settings</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-5 max-w-3xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-charcoal mb-1">Restaurant Name</label>
                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none resize-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
                        <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-charcoal mb-1">Address</label>
                        <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">City</label>
                        <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">State</label>
                        <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Postal Code</label>
                        <input type="text" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">GST Number</label>
                        <input type="text" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Opening Time</label>
                        <input type="time" value={form.opening_time} onChange={(e) => setForm({ ...form, opening_time: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">Closing Time</label>
                        <input type="time" value={form.closing_time} onChange={(e) => setForm({ ...form, closing_time: e.target.value })} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary outline-none" />
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.show_home_stats}
                            onChange={(e) => setForm({ ...form, show_home_stats: e.target.checked })}
                            className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-charcoal">
                            Show customer count & rating on home page
                        </span>
                    </label>
                    <p className="text-xs text-charcoal/50 mt-1 ml-7">
                        Displays your real customer count and average rating (from completed order reviews) to visitors.
                    </p>
                </div>

                <button type="submit" disabled={saving} className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50">
                    <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
                </button>
            </form>
        </div>
    );
};

export default AdminSettings;
