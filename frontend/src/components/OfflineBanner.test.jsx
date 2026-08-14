import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import OfflineBanner from "./OfflineBanner.jsx";

const setNavigatorOnLine = (value) => {
    Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
};

describe("OfflineBanner", () => {
    afterEach(() => {
        setNavigatorOnLine(true);
    });

    it("renders nothing while online", () => {
        setNavigatorOnLine(true);
        render(<OfflineBanner />);
        expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
    });

    it("shows a message when offline", () => {
        setNavigatorOnLine(false);
        render(<OfflineBanner />);
        expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    });
});
