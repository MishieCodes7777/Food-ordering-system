import cloudinary from "../config/cloudinary.js";
import pool from "../db/db.js";

// POST /api/admin/upload — Upload image to Cloudinary
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "food-ordering",
          resource_type: "image",
          transformation: [
            { width: 800, height: 800, crop: "limit" }, // Max size
            { quality: "auto" }, // Auto optimize
            { fetch_format: "auto" }, // Auto format (webp when possible)
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    res.json({
      message: "Image uploaded successfully",
      image_url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error("Upload error:", error.message);
    next(error);
  }
};

// DELETE /api/admin/upload — Delete image from Cloudinary
export const deleteImage = async (req, res, next) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({ message: "public_id is required" });
    }

    // No public_id column exists on any image-owning table (only the full
    // Cloudinary image_url is stored), so ownership is verified by checking
    // that this public_id appears in a URL belonging to the admin's own
    // restaurant before allowing the delete.
    const restaurantId = req.admin.restaurant_id;
    const owned = await pool.query(
      `SELECT 1 FROM (
         SELECT logo_url AS image_url FROM restaurants WHERE id = $2
         UNION ALL
         SELECT banner_url AS image_url FROM restaurants WHERE id = $2
         UNION ALL
         SELECT image_url FROM categories WHERE restaurant_id = $2
         UNION ALL
         SELECT image_url FROM menu_items WHERE restaurant_id = $2
         UNION ALL
         SELECT mii.image_url FROM menu_item_images mii
           JOIN menu_items mi ON mii.menu_item_id = mi.id
           WHERE mi.restaurant_id = $2
       ) imgs
       WHERE image_url IS NOT NULL AND POSITION($1 IN image_url) > 0
       LIMIT 1`,
      [public_id, restaurantId]
    );

    if (owned.rows.length === 0) {
      return res.status(403).json({ message: "You do not have permission to delete this image" });
    }

    await cloudinary.uploader.destroy(public_id);
    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    next(error);
  }
};
