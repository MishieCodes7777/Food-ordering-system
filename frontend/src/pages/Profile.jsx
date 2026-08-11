import { useState } from "react";
import { User, Mail, Phone, Lock, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { toast } from "sonner";

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [name, setName] = useState(user?.name || "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            setSavingProfile(true);
            await api.put("/api/profile", { name });
            await checkAuth();
            toast.success("Profile updated");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            setSavingPassword(true);
            await api.put("/api/profile/password", { current_password: currentPassword, new_password: newPassword });
            setCurrentPassword("");
            setNewPassword("");
            toast.success("Password changed successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to change password");
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream">
            <div className="bg-primary py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-white">Your Profile</h1>
                    <p className="text-white/70 mt-1">Manage your account details</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Profile Info Card */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-charcoal flex items-center gap-2 mb-6">
                        <User size={20} className="text-primary" /> Personal Information
                    </h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label htmlFor="profile-name" className="block text-sm font-medium text-charcoal mb-1">Name</label>
                            <input
                                id="profile-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
                            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                                <Mail size={16} className="text-gray-400" />
                                <span className="text-charcoal/70">{user?.email}</span>
                            </div>
                            <p className="text-xs text-charcoal/40 mt-1">Email cannot be changed</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
                            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                                <Phone size={16} className="text-gray-400" />
                                <span className="text-charcoal/70">{user?.phone}</span>
                                {user?.phone_verified && (
                                    <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Verified</span>
                                )}
                            </div>
                            <p className="text-xs text-charcoal/40 mt-1">Phone number cannot be changed — it's your verified identity</p>
                        </div>
                        <button
                            type="submit"
                            disabled={savingProfile}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Save size={16} /> {savingProfile ? "Saving..." : "Save Changes"}
                        </button>
                    </form>
                </div>

                {/* Change Password Card */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-charcoal flex items-center gap-2 mb-6">
                        <Lock size={20} className="text-primary" /> Change Password
                    </h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label htmlFor="current-password" className="block text-sm font-medium text-charcoal mb-1">Current Password</label>
                            <input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-charcoal mb-1">New Password</label>
                            <input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="Min 8 characters"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={savingPassword}
                            className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Lock size={16} /> {savingPassword ? "Changing..." : "Change Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
