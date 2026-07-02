import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { registerUser } from "../services/authService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "sonner";
import SmoothInput from "../components/SmoothInput.jsx";
import GoogleLoginButton from "../components/GoogleLoginButton.jsx";
import api from "../services/api.js";
import AuroraBackground from "../components/AuroraBackground.jsx";
const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = await registerUser(name, email, password, phone);
            login(data.user);
            localStorage.setItem('akio_show_onboarding', 'true');
            toast.success("Account created! Welcome to Akio.");
            navigate("/");
        } catch (err) {
            const msg = err.response?.data?.message || "";
            if (msg.includes("Unable to create account") || msg.includes("different credentials")) {
                setError("An account with this email already exists. Please sign in instead.");
            } else if (msg.includes("Validation failed")) {
                const errors = err.response?.data?.errors;
                if (errors && errors.length > 0) {
                    setError(errors.map(e => e.message).join(". "));
                } else {
                    setError("Please check your details and try again.");
                }
            } else if (msg.includes("Too many")) {
                setError("Too many attempts. Please wait 15 minutes and try again.");
            } else {
                setError("Something went wrong. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
            <AuroraBackground />
            <div className="w-full max-w-md relative z-10">
                <div className="dark-inputs bg-[#0d1f1a]/90 border border-white/10 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white">
                            Create Account
                        </h1>
                        <p className="text-white/50 mt-2">Sign up to get started</p>
                    </div>

                    {/* Inline error message */}
                    {error && (
                        <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-300 text-sm">
                                {error}
                                {error.includes("already exists") && (
                                    <>
                                        {" "}
                                        <Link to="/login" className="text-accent font-medium hover:underline">
                                            Go to Sign In →
                                        </Link>
                                    </>
                                )}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-1">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => { setName(e.target.value); setError(""); }}
                                required
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                required
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-white/70 mb-1">Phone Number</label>
                            <input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setError(""); }}
                                required
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="7012XXXXXX"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12"
                                    placeholder="Min 8 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-light text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Creating account..." : "Create Account"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-white/30 text-sm">or</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    {/* Google Signup */}
                    <GoogleLoginButton
                        onSuccess={async (credentialResponse) => {
                            try {
                                const res = await api.post("/api/auth/google", { credential: credentialResponse.credential });
                                login(res.data.user);
                                toast.success(`Welcome, ${res.data.user.name}!`);
                                navigate("/menu");
                            } catch (err) {
                                setError(err.response?.data?.message || "Google sign up failed");
                            }
                        }}
                        onError={() => setError("Google sign up failed. Please try again.")}
                        text="signup_with"
                    />

                    <p className="text-center text-white/40 mt-6">
                        Already have an account?{" "}
                        <Link to="/login" className="text-accent font-medium hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
