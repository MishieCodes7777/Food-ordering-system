import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "./useOnlineStatus.js";

const setNavigatorOnLine = (value) => {
    Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
};

describe("useOnlineStatus", () => {
    let originalOnLine;

    beforeEach(() => {
        originalOnLine = window.navigator.onLine;
    });

    afterEach(() => {
        setNavigatorOnLine(originalOnLine);
    });

    it("reflects navigator.onLine on initial render", () => {
        setNavigatorOnLine(true);
        const { result } = renderHook(() => useOnlineStatus());
        expect(result.current).toBe(true);
    });

    it("becomes false when an offline event fires", () => {
        setNavigatorOnLine(true);
        const { result } = renderHook(() => useOnlineStatus());

        act(() => {
            window.dispatchEvent(new Event("offline"));
        });

        expect(result.current).toBe(false);
    });

    it("becomes true when an online event fires", () => {
        setNavigatorOnLine(false);
        const { result } = renderHook(() => useOnlineStatus());
        expect(result.current).toBe(false);

        act(() => {
            window.dispatchEvent(new Event("online"));
        });

        expect(result.current).toBe(true);
    });
});
