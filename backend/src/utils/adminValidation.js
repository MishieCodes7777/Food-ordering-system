import { z } from "zod";

// Admin Auth Schemas
export const adminRegisterSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    restaurant_id: z.number().int().positive("Invalid restaurant ID"),
    role: z.enum(["owner", "manager", "staff"], { message: "Role must be owner, manager, or staff" }),
});

export const adminLoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// Restaurant Schemas
export const createRestaurantSchema = z.object({
    name: z.string().min(2, "Restaurant name must be at least 2 characters").max(200),
    description: z.string().optional(),
    logo_url: z.string().url("Invalid logo URL").optional().or(z.literal("")),
    banner_url: z.string().url("Invalid banner URL").optional().or(z.literal("")),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().min(10, "Phone must be at least 10 digits").optional().or(z.literal("")),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    opening_time: z.string().optional(),
    closing_time: z.string().optional(),
    gst_number: z.string().optional(),
});

export const updateRestaurantSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().optional(),
    logo_url: z.string().url().optional().or(z.literal("")),
    banner_url: z.string().url().optional().or(z.literal("")),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(10).optional().or(z.literal("")),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    opening_time: z.string().optional(),
    closing_time: z.string().optional(),
    gst_number: z.string().optional(),
    is_active: z.boolean().optional(),
    show_home_stats: z.boolean().optional(),
});

// Category Schemas
export const createCategorySchema = z.object({
    name: z.string().min(2, "Category name must be at least 2 characters").max(100),
    description: z.string().optional(),
    image_url: z.string().url("Invalid image URL").optional().or(z.literal("")),
    display_order: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal("")),
    display_order: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
});

export const reorderCategoriesSchema = z.object({
    order: z.array(z.object({
        id: z.number().int().positive(),
        display_order: z.number().int().min(0),
    })),
});

// Menu Item Schemas
export const createMenuItemSchema = z.object({
    category_id: z.number().int().positive("Invalid category ID"),
    name: z.string().min(2, "Item name must be at least 2 characters").max(200),
    description: z.string().optional().nullable(),
    price: z.number().positive("Price must be greater than 0"),
    discount_price: z.number().positive().optional().nullable(),
    image_url: z.string().optional().nullable(),
    is_veg: z.boolean().optional(),
    food_type: z.string().optional(),
    is_available: z.boolean().optional(),
    preparation_time: z.number().int().min(0).optional().nullable(),
    calories: z.number().int().min(0).optional().nullable(),
    display_order: z.number().int().min(0).optional(),
});

export const updateMenuItemSchema = z.object({
    category_id: z.number().int().positive().optional(),
    name: z.string().min(2).max(200).optional(),
    description: z.string().optional().nullable(),
    price: z.number().positive().optional(),
    discount_price: z.number().positive().optional().nullable(),
    image_url: z.string().optional().nullable(),
    is_veg: z.boolean().optional(),
    food_type: z.string().optional(),
    is_available: z.boolean().optional(),
    preparation_time: z.number().int().min(0).optional().nullable(),
    calories: z.number().int().min(0).optional().nullable(),
    display_order: z.number().int().min(0).optional(),
});

// Restaurant Table Schemas
export const createTableSchema = z.object({
    table_number: z.number().int().positive("Table number must be positive"),
    table_name: z.string().max(100).optional(),
    capacity: z.number().int().min(1, "Capacity must be at least 1").optional(),
    is_active: z.boolean().optional(),
});

export const updateTableSchema = z.object({
    table_number: z.number().int().positive().optional(),
    table_name: z.string().max(100).optional(),
    qr_code_url: z.string().url().optional().or(z.literal("")),
    capacity: z.number().int().min(1).optional(),
    is_active: z.boolean().optional(),
});

// Order Status Schema
export const updateOrderStatusSchema = z.object({
    status: z.enum(["pending", "accepted", "preparing", "ready", "completed", "cancelled"]),
    remarks: z.string().optional().nullable(),
});

// Coupon Schemas
export const createCouponSchema = z.object({
    code: z.string().trim().min(3, "Code must be at least 3 characters").max(30),
    description: z.string().optional().nullable(),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.number().positive("Discount value must be greater than 0"),
    min_order_amount: z.number().min(0).optional(),
    max_discount_amount: z.number().positive().optional().nullable(),
    usage_limit: z.number().int().positive().optional().nullable(),
    per_user_limit: z.number().int().positive().optional(),
    valid_until: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
}).refine((data) => data.discount_type !== "percentage" || data.discount_value <= 100, {
    message: "Percentage discount can't exceed 100",
    path: ["discount_value"],
});

export const updateCouponSchema = z.object({
    description: z.string().optional().nullable(),
    discount_type: z.enum(["percentage", "fixed"]).optional(),
    discount_value: z.number().positive().optional(),
    min_order_amount: z.number().min(0).optional(),
    max_discount_amount: z.number().positive().optional().nullable(),
    usage_limit: z.number().int().positive().optional().nullable(),
    per_user_limit: z.number().int().positive().optional(),
    valid_until: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
});
