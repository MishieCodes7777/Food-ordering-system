import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminTable from "./AdminTable.jsx";

const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "amount", label: "Amount", sortable: true, render: (row) => `₹${row.amount}` },
];

const data = [
    { id: 1, name: "Alice", amount: 100 },
    { id: 2, name: "Bob", amount: 200 },
];

describe("AdminTable", () => {
    it("shows a loading spinner when loading", () => {
        const { container } = render(<AdminTable columns={columns} data={[]} loading />);
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("shows the empty message when there is no data", () => {
        render(<AdminTable columns={columns} data={[]} emptyMessage="Nothing here" />);
        expect(screen.getByText("Nothing here")).toBeInTheDocument();
    });

    it("renders rows using each column's render function when provided", () => {
        render(<AdminTable columns={columns} data={data} />);
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("₹100")).toBeInTheDocument();
        expect(screen.getByText("₹200")).toBeInTheDocument();
    });

    it("calls onSort with the column key when a sortable header is clicked", async () => {
        const onSort = vi.fn();
        const user = userEvent.setup();
        render(<AdminTable columns={columns} data={data} onSort={onSort} />);

        await user.click(screen.getByText("Amount"));
        expect(onSort).toHaveBeenCalledWith("amount");
    });

    it("supports row selection when selectable", async () => {
        const onToggleSelect = vi.fn();
        const user = userEvent.setup();
        render(
            <AdminTable
                columns={columns}
                data={data}
                selectable
                selectedIds={[]}
                onToggleSelect={onToggleSelect}
                onToggleSelectAll={() => {}}
            />
        );

        const rowCheckbox = screen.getByLabelText("Select row 1");
        await user.click(rowCheckbox);
        expect(onToggleSelect).toHaveBeenCalledWith(1);
    });
});
