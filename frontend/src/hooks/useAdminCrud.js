import { useState, useEffect, useCallback } from "react";
import api from "../services/api.js";
import { toast } from "sonner";

// Shared list + create/edit modal + delete plumbing for simple admin
// resource pages (categories, menu items, tables, ...). Each page keeps
// its own form fields and JSX — this only centralizes the fetch/open/
// submit/delete mechanics that were duplicated near-identically across them.
export const useAdminCrud = ({
    endpoint,
    listKey,
    initialForm,
    resourceLabel,
    transformPayload,
    saveErrorMessage = "Couldn't save, try again",
    deleteErrorMessage = "Couldn't delete, try again",
    deleteConfirmMessage = `Delete this ${resourceLabel.toLowerCase()}?`,
}) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(initialForm);

    const fetchItems = useCallback(async () => {
        try {
            const res = await api.get(endpoint);
            setItems(res.data[listKey] || []);
        } catch {
            // leave items as-is on a failed refresh
        } finally {
            setLoading(false);
        }
    }, [endpoint, listKey]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const openCreate = (overrides = {}) => {
        setEditing(null);
        setForm({ ...initialForm, ...overrides });
        setShowModal(true);
    };

    const openEdit = (item, toForm) => {
        setEditing(item);
        setForm(toForm ? toForm(item) : item);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = transformPayload ? transformPayload(form) : form;
        try {
            if (editing) {
                await api.put(`${endpoint}/${editing.id}`, payload);
                toast.success(`${resourceLabel} updated`);
            } else {
                await api.post(endpoint, payload);
                toast.success(`${resourceLabel} created`);
            }
            setShowModal(false);
            fetchItems();
        } catch (error) {
            toast.error(error.response?.data?.message || saveErrorMessage);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(deleteConfirmMessage)) return;
        try {
            await api.delete(`${endpoint}/${id}`);
            toast.success(`${resourceLabel} deleted`);
            fetchItems();
        } catch (error) {
            toast.error(error.response?.data?.message || deleteErrorMessage);
        }
    };

    return {
        items, loading, showModal, setShowModal, editing, form, setForm,
        openCreate, openEdit, handleSubmit, handleDelete, fetchItems,
    };
};
