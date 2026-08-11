import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAdminCrud } from "./useAdminCrud.js";
import api from "../services/api.js";

vi.mock("../services/api.js", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

describe("useAdminCrud", () => {
    const baseConfig = {
        endpoint: "/api/admin/categories",
        listKey: "categories",
        initialForm: { name: "" },
        resourceLabel: "Category",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.confirm = vi.fn(() => true);
    });

    it("fetches items on mount", async () => {
        api.get.mockResolvedValue({ data: { categories: [{ id: 1, name: "Pizza" }] } });

        const { result } = renderHook(() => useAdminCrud(baseConfig));
        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(api.get).toHaveBeenCalledWith("/api/admin/categories");
        expect(result.current.items).toEqual([{ id: 1, name: "Pizza" }]);
    });

    it("openCreate resets the form with any overrides and opens the modal", async () => {
        api.get.mockResolvedValue({ data: { categories: [] } });
        const { result } = renderHook(() => useAdminCrud(baseConfig));
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.openCreate({ name: "New Item" });
        });

        expect(result.current.editing).toBeNull();
        expect(result.current.showModal).toBe(true);
        expect(result.current.form).toEqual({ name: "New Item" });
    });

    it("handleDelete does nothing if the confirm dialog is cancelled", async () => {
        api.get.mockResolvedValue({ data: { categories: [] } });
        window.confirm = vi.fn(() => false);
        const { result } = renderHook(() => useAdminCrud(baseConfig));
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.handleDelete(1);
        });

        expect(api.delete).not.toHaveBeenCalled();
    });

    it("handleDelete calls the API and refetches when confirmed", async () => {
        api.get.mockResolvedValue({ data: { categories: [] } });
        api.delete.mockResolvedValue({});
        const { result } = renderHook(() => useAdminCrud(baseConfig));
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.handleDelete(5);
        });

        expect(api.delete).toHaveBeenCalledWith("/api/admin/categories/5");
        expect(api.get).toHaveBeenCalledTimes(2); // initial mount fetch + refetch after delete
    });
});
