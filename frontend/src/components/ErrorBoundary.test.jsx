import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary.jsx";

const ThrowingComponent = () => {
    throw new Error("Test error");
};

describe("ErrorBoundary", () => {
    it("renders children normally when nothing throws", () => {
        render(
            <ErrorBoundary>
                <div>Safe content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText("Safe content")).toBeInTheDocument();
    });

    it("shows the fallback UI when a child throws during render", () => {
        // React logs the caught error to console — silence it for this test only
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText("Oops, something went wrong")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /reload page/i })).toBeInTheDocument();
        // The crashed subtree should not still be rendered
        expect(screen.queryByText("Safe content")).not.toBeInTheDocument();

        consoleSpy.mockRestore();
    });
});
