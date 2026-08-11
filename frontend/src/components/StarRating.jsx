import { Star } from "lucide-react";

// Dual-purpose: read-only display (pass `value`) or an interactive picker
// (pass `value` + `onChange`). Half-stars aren't supported — ratings are
// always whole numbers 1-5, same as the backend's CHECK constraint.
const StarRating = ({ value = 0, onChange, size = 16, className = "" }) => {
    const interactive = typeof onChange === "function";
    const rounded = Math.round(value);

    return (
        <div className={`flex items-center gap-0.5 ${className}`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    onClick={() => onChange?.(star)}
                    className={interactive ? "cursor-pointer" : "cursor-default"}
                    aria-label={interactive ? `Rate ${star} star${star > 1 ? "s" : ""}` : undefined}
                >
                    <Star
                        size={size}
                        className={star <= rounded ? "text-accent fill-accent" : "text-charcoal/20"}
                    />
                </button>
            ))}
        </div>
    );
};

export default StarRating;
