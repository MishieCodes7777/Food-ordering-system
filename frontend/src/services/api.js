import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Response interceptor — handles auth redirects, plus a friendly,
// deduplicated toast for server/network failures so pages don't have to
// each handle "the backend is down" individually (previously many pages
// silently swallowed these with no user feedback at all).
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url = error.config?.url || "";
            // Don't redirect for admin endpoints or public menu browsing
            if (!url.includes("/api/admin/") && !url.includes("/api/profile")) {
                const path = window.location.pathname;
                if (["/cart", "/orders", "/profile"].includes(path)) {
                    window.location.href = "/login";
                }
            }
        } else if (!error.response) {
            // No response reached the client at all. If the browser itself
            // is offline, the OfflineBanner already communicates that —
            // skip a redundant toast on top of it.
            if (navigator.onLine) {
                toast.error("Oops! We're having trouble reaching our servers. Please try again in a moment.", {
                    id: "network-error",
                });
            }
        } else if (error.response.status >= 500) {
            toast.error("Oops! Our servers are experiencing heavy load right now. Please try again shortly.", {
                id: "server-error",
            });
        }

        return Promise.reject(error);
    }
);

export default api;
