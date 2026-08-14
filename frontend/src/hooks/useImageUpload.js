import { useState } from "react";
import api from "../services/api.js";
import { toast } from "sonner";

// Shared Cloudinary upload flow used by every admin form with an image field.
export const useImageUpload = (onUploaded) => {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        setUploading(true);
        try {
            const res = await api.post("/api/admin/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onUploaded(res.data.image_url);
            toast.success("Image uploaded!");
        } catch {
            toast.error("Upload not available right now, paste a URL instead.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    return { uploading, handleImageUpload };
};
