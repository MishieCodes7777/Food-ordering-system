import { useState, useRef, useEffect } from "react";

// Open/close state + click-outside-to-close for a dropdown/popover.
// onOpen fires whenever the dropdown transitions from closed to open
// (e.g. marking notifications as read on open).
export const useDropdown = ({ onOpen } = {}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggle = () => {
        setOpen((prev) => {
            const next = !prev;
            if (next) onOpen?.();
            return next;
        });
    };

    return { open, toggle, ref };
};
