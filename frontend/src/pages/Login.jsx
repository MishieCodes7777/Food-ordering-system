import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { loginUser } from "../services/authService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "sonner";
import GoogleLoginButton from "../components/GoogleLoginButton.jsx";
import SmoothInput from "../components/SmoothInput.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../services/api.js";

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
        <AuthLayout tagline="Dining like never before.">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Welcome back</h1>
                <p className="text-white/50 mt-2">Login to your account</p>
            </div>

            {error && (
                <div className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                    <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <SmoothInput
                    id="email"
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    required
                    placeholder="yourname@email.com"
                />

                <SmoothInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    required
                    placeholder="Enter your password"
                    rightElement={
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-white/40 hover:text-white"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    }
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>

            <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-white/30 text-sm">or continue with</span>
                <div className="flex-1 h-px bg-white/10"></div>
            </div>

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
                    Register for free
                </Link>
            </p>

            <p className="text-center text-white/20 text-xs mt-8">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="underline hover:text-white/40 transition-colors">Terms & Conditions</Link>
                {" "}and{" "}
                <Link to="/privacy" className="underline hover:text-white/40 transition-colors">Privacy Policy</Link>
            </p>
        </AuthLayout>
    );
};

export default Login;
