const FOOD_EMOJI = ["🍕", "🍔", "🍟", "🌭", "🥤", "🌮", "🍗", "🍩", "🧁", "🍿"];

// Positions/sizes/timings are derived deterministically from index rather
// than Math.random() — keeps them stable across re-renders instead of
// jumping around every time a parent state update re-invokes this component.
const ITEMS = FOOD_EMOJI.map((emoji, i) => ({
    emoji,
    top: `${(i * 37 + 8) % 88}%`,
    left: `${(i * 53 + 6) % 88}%`,
    size: 28 + ((i * 7) % 5) * 12,
    duration: 13 + (i % 5) * 3,
    delay: (i % 6) * 1.4,
    rotate: 8 + (i % 3) * 6,
}));

// Purely decorative, ambient background animation — a handful of food emoji
// gently bobbing/rotating behind the auth cards. Reused both as a full-page
// layer and inside AuthLayout's branding panel (same component, different
// container size naturally changes the apparent density).
const FloatingFoodBackground = ({ className = "" }) => (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`} aria-hidden="true">
        {ITEMS.map((item, idx) => (
            <span
                key={idx}
                className="absolute blur-[1px]"
                style={{
                    top: item.top,
                    left: item.left,
                    fontSize: `${item.size}px`,
                    opacity: 0.18,
                    animation: `float-food ${item.duration}s ease-in-out ${item.delay}s infinite`,
                    "--float-rotate": `${item.rotate}deg`,
                }}
            >
                {item.emoji}
            </span>
        ))}
    </div>
);

export default FloatingFoodBackground;
