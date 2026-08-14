import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const addToCartSchema = z.object({
  menu_item_id: z.number().int().positive("Invalid menu item ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(20, "Maximum 20 items allowed"),
  food_type_choice: z.string().optional().nullable(),
});

export const updateCartSchema = z.object({
  item_id: z.number().int().positive("Invalid item ID"),
  quantity: z.number().int().min(0, "Quantity cannot be negative").max(20, "Maximum 20 items allowed"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
});

export const createPaymentSchema = z.object({
  order_id: z.number().int().positive("Invalid order ID"),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay signature is required"),
  order_id: z.number().int().positive("Invalid order ID"),
});

export const refundPaymentSchema = z.object({
  order_id: z.number().int().positive("Invalid order ID"),
});

export const createReviewSchema = z.object({
  order_id: z.number().int().positive("Invalid order ID"),
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.string().max(1000, "Comment must be under 1000 characters").optional().nullable(),
});
