import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { useAuth } from "../context/AuthContext.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
    useAuth: vi.fn(),
}));

const renderProtected = () =>
    render(
        <MemoryRouter initialEntries={["/protected"]}>
            <Routes>
                <Route path="/login" element={<div>Login Page</div>} />
                <Route path="/protected" element={<ProtectedRoute><div>Protected Content</div></ProtectedRoute>} />
            </Routes>
        </MemoryRouter>
    );

describe("ProtectedRoute", () => {
    it("shows a loading spinner while auth state is resolving", () => {
        useAuth.mockReturnValue({ user: null, loading: true });
        const { container } = renderProtected();
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
        expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("redirects to /login when there is no authenticated user", () => {
        useAuth.mockReturnValue({ user: null, loading: false });
        renderProtected();
        expect(screen.getByText("Login Page")).toBeInTheDocument();
        expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });

    it("renders the protected content when a user is present", () => {
        useAuth.mockReturnValue({ user: { id: 1, name: "Test User" }, loading: false });
        renderProtected();
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
});
