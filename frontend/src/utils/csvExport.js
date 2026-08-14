// Client-side CSV export — no backend endpoint needed since we already have
// the row data in memory (or fetched it just for export).
const escapeCsvValue = (value) => {
    let str = String(value ?? "");
    // Neutralize formula injection: a leading =, +, -, or @ makes Excel/Sheets
    // interpret the cell as a formula when it's opened (e.g. a crafted customer
    // name like "=HYPERLINK(...)"). Prefixing with a single quote forces text.
    if (/^[=+\-@]/.test(str)) str = `'${str}`;
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// columns: [{ label: "Column Header", value: (row) => cellValue }]
export const downloadCsv = (filename, columns, rows) => {
    const lines = [
        columns.map((c) => escapeCsvValue(c.label)).join(","),
        ...rows.map((row) => columns.map((c) => escapeCsvValue(c.value(row))).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
