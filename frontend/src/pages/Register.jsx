import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, ArrowLeft } from "lucide-react";
import { sendRegistrationOtp, verifyRegistrationOtp } from "../services/authService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { toast } from "sonner";
import GoogleLoginButton from "../components/GoogleLoginButton.jsx";
import SmoothInput from "../components/SmoothInput.jsx";
import OtpInput from "../components/OtpInput.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../services/api.js";

const RESEND_COOLDOWN_SECONDS = 60;

const Register = () => {
    const [step, setStep] = useState("details"); // "details" | "otp"
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState("");
    const [devOtp, setDevOtp] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [cooldown, setCooldown] = useState(0);
    const cooldownRef = useRef(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        return () => clearInterval(cooldownRef.current);
    }, []);

    const startCooldown = () => {
        setCooldown(RESEND_COOLDOWN_SECONDS);
        clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const describeError = (err, fallback) => {
        const msg = err.response?.data?.message || "";
        if (msg.includes("Unable to create account") || msg.includes("different credentials")) {
            return "An account with this email or phone already exists. Please sign in instead.";
        }
        if (msg.includes("Validation failed")) {
            const errors = err.response?.data?.errors;
            return errors?.length ? errors.map((e) => e.message).join(". ") : "Please check your details and try again.";
        }
        if (msg.includes("Too many") || msg.includes("wait")) {
            return msg;
        }
        return msg || fallback;
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = await sendRegistrationOtp(name, email, password, phone);
            setDevOtp(data.dev_otp || null);
            setStep("otp");
            startCooldown();
            toast.success(`OTP sent to ${phone}`);
        } catch (err) {
            setError(describeError(err, "Something went wrong. Please try again later."));
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (cooldown > 0) return;
        setError("");
        try {
            const data = await sendRegistrationOtp(name, email, password, phone);
            setDevOtp(data.dev_otp || null);
            startCooldown();
            toast.success("OTP resent");
        } catch (err) {
            setError(describeError(err, "Couldn't resend OTP. Please try again."));
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = await verifyRegistrationOtp(phone, otp);
            login(data.user);
            localStorage.setItem("akio_show_onboarding", "true");
            toast.success("Account created! Welcome to Akio.");
            navigate("/");
        } catch (err) {
            setError(describeError(err, "Incorrect OTP. Please try again."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout tagline="Join thousands ordering their favorites.">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">
                    {step === "details" ? "Sign up account" : "Enter OTP code"}
                </h1>
                <p className="text-white/50 mt-2">
                    {step === "details"
                        ? "Join now for a faster, smarter ordering experience."
                        : `We've sent a one-time code to +91 ${phone}`}
                </p>
            </div>

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

            {step === "details" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                    <SmoothInput
                        id="name"
                        type="text"
                        label="Name"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(""); }}
                        required
                        placeholder="Enter your name"
                    />

                    <SmoothInput
                        id="email"
                        type="email"
                        label="Email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        required
                        placeholder="Enter your email"
                    />

                    <div>
                        <SmoothInput
                            id="phone"
                            type="tel"
                            label="Phone Number"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                            required
                            pattern="[0-9]{10}"
                            title="Enter a 10-digit mobile number"
                            placeholder="7012XXXXXX"
                        />
                        <p className="text-white/30 text-xs mt-1.5">We'll text a verification code here — it can't be changed later.</p>
                    </div>

                    <SmoothInput
                        id="password"
                        type={showPassword ? "text" : "password"}
                        label="Password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        required
                        minLength={8}
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
                        {loading ? "Sending OTP..." : "Sign up"}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <button
                        type="button"
                        onClick={() => { setStep("details"); setOtp(""); setError(""); clearInterval(cooldownRef.current); setCooldown(0); }}
                        className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
                    >
                        <ArrowLeft size={14} /> Change details
                    </button>

                    <div>
                        <OtpInput length={6} value={otp} onChange={(val) => { setOtp(val); setError(""); }} autoFocus />
                        {devOtp && (
                            <p className="text-accent/70 text-xs text-center mt-3">Dev mode (no SMS provider configured): {devOtp}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                    >
                        {loading ? "Verifying..." : "Continue"}
                    </button>

                    <p className="text-center text-white/40 text-sm">
                        Didn't get OTP?{" "}
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={cooldown > 0}
                            className="text-accent font-medium hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                        >
                            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                        </button>
                    </p>
                </form>
            )}

            {step === "details" && (
                <>
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
                                toast.success(`Welcome, ${res.data.user.name}!`);
                                navigate("/menu");
                            } catch (err) {
                                setError(err.response?.data?.message || "Google sign up failed");
                            }
                        }}
                        onError={() => setError("Google sign up failed. Please try again.")}
                        text="signup_with"
                    />
                </>
            )}

            <p className="text-center text-white/40 mt-6">
                Already have an account?{" "}
                <Link to="/login" className="text-accent font-medium hover:underline">
                    Sign in
                </Link>
            </p>

            <p className="text-center text-white/20 text-xs mt-8">
                By creating an account, you agree to our{" "}
                <Link to="/terms" className="underline hover:text-white/40 transition-colors">Terms & Conditions</Link>
                {" "}and{" "}
                <Link to="/privacy" className="underline hover:text-white/40 transition-colors">Privacy Policy</Link>
            </p>
        </AuthLayout>
    );
};

export default Register;
