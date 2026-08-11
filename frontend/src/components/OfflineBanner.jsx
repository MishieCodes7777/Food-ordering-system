import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus.js";

// A slim bar pinned above everything (including PillNav, which sits at
// z-index 99 — see PillNav.css) so it's always visible regardless of scroll
// position or which page is showing.
const OfflineBanner = () => {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-accent-dark text-white text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-md">
            <WifiOff size={16} />
            You're offline — check your internet connection. We'll reconnect automatically.
        </div>
    );
};

export default OfflineBanner;
