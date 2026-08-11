import { useRef, useEffect } from "react";

// Segmented digit-box OTP input — value/onChange work on the full string
// (e.g. "12" while mid-entry) so the parent doesn't need to know about the
// per-box mechanics, same shape as a plain text input's onChange contract.
const OtpInput = ({ length = 6, value, onChange, autoFocus, disabled }) => {
    const inputsRef = useRef([]);
    const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

    useEffect(() => {
        if (autoFocus) inputsRef.current[0]?.focus();
    }, [autoFocus]);

    const commit = (nextDigits) => onChange(nextDigits.join(""));

    const handleChange = (idx, e) => {
        const raw = e.target.value.replace(/\D/g, "");
        if (!raw) {
            const next = digits.slice();
            next[idx] = "";
            commit(next);
            return;
        }
        // A multi-char value here means the browser delivered a paste through
        // this box's onChange rather than a paste event (happens on some
        // mobile keyboards) — spread it across the remaining boxes.
        const next = digits.slice();
        for (let i = 0; i < raw.length && idx + i < length; i++) next[idx + i] = raw[i];
        commit(next);
        inputsRef.current[Math.min(idx + raw.length, length - 1)]?.focus();
    };

    const handleKeyDown = (idx, e) => {
        if (e.key === "Backspace" && !digits[idx] && idx > 0) {
            inputsRef.current[idx - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (!pasted) return;
        commit(pasted.split("").concat(Array(length).fill("")).slice(0, length));
        inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
    };

    return (
        <div className="flex gap-2 sm:gap-3 justify-center">
            {digits.map((digit, idx) => (
                <input
                    key={idx}
                    ref={(el) => (inputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    disabled={disabled}
                    onChange={(e) => handleChange(idx, e)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-xl bg-white/5 border border-white/15 text-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all disabled:opacity-50"
                />
            ))}
        </div>
    );
};

export default OtpInput;
