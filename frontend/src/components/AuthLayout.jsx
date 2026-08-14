import { Link } from "react-router-dom";
import FloatingFoodBackground from "./FloatingFoodBackground.jsx";

// Shared shell for Login/Register: a rounded split card (branding + floating
// food panel on the left, form on the right) on desktop, collapsing to just
// the form panel (with its own lighter ambient food layer) on mobile.
const AuthLayout = ({ children, tagline }) => (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden bg-charcoal">
        <FloatingFoodBackground />

        <div className="w-full max-w-5xl relative z-10 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex bg-[#0d1f1a]">
            {/* Branding panel — desktop only */}
            <div className="hidden lg:flex flex-col justify-between w-[46%] p-10 relative bg-gradient-to-br from-[#0f2620] via-charcoal to-black overflow-hidden">
                <FloatingFoodBackground />
                <Link to="/" className="relative z-10 text-3xl font-bold text-white w-fit">
                    Aki<span className="text-accent">o</span>
                </Link>
                <div className="relative z-10">
                    <p className="text-white/80 text-2xl font-semibold leading-snug mb-3">
                        {tagline || "Fresh ingredients, unforgettable taste."}
                    </p>
                    <p className="text-white/40 text-sm">
                        Order your favorite meals in just a few clicks.
                    </p>
                </div>
            </div>

            {/* Form panel */}
            <div className="w-full lg:w-[54%] p-8 sm:p-10 dark-inputs max-h-[92vh] overflow-y-auto">
                {children}
            </div>
        </div>
    </div>
);

export default AuthLayout;
