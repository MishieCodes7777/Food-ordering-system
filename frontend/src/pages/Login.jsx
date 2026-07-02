import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { loginUser } from "../services/authService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "sonner";
import SmoothInput from "../components/SmoothInput.jsx";
import GoogleLoginButton from "../components/GoogleLoginButton.jsx";
import api from "../services/api.js";
import AuroraBackground from "../components/AuroraBackground.jsx";
const Login = () => {
    const [email, setEmail] = useState("");
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
            const data = await loginUser(email, password);
            login(data.user);
            if (data.is_first_login) {
                localStorage.setItem('akio_show_onboarding', 'true');
                toast.success(`Welcome, ${data.user.name}!`);
            } else {
                toast.success(`Welcome back, ${data.user.name}!`);
            }
            navigate("/");
        } catch (err) {
            const msg = err.response?.data?.message || "";
            if (msg.includes("Invalid email or password")) {
                setError("No account found with these credentials. Please check your details or create a new account.");
            } else if (msg.includes("locked")) {
                setError(msg);
            } else if (msg.includes("Too many")) {
                setError("Too many login attempts. Please wait 15 minutes and try again.");
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
                            Welcome back
                        </h1>
                        <p className="text-white/50 mt-2">Login to your account</p>
                    </div>
                    {/* Inline error message */}
                    {error && (
                        <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                required
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="yourname@email.com"
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
                                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12"
                                    placeholder="••••••••"
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
                            {loading ? "Signing in..." : "Login"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-white/30 text-sm">or</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    {/* Google Login */}
                    <GoogleLoginButton
                        onSuccess={async (credentialResponse) => {
                            try {
                                const res = await api.post("/api/auth/google", { credential: credentialResponse.credential });
                                login(res.data.user);
                                if (res.data.is_first_login) {
                                    toast.success(`Welcome, ${res.data.user.name}!`);
                                } else {
                                    toast.success(`Welcome back, ${res.data.user.name}!`);
                                }
                                navigate("/menu");
                            } catch (err) {
                                setError(err.response?.data?.message || "Google login failed");
                            }
                        }}
                        onError={() => setError("Google login failed. Please try again.")}
                        text="signin_with"
                    />

                    <p className="text-center text-white/40 mt-6">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-accent font-medium hover:underline">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
