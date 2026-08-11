import pool from "../db/db.js";

// Get or create cart for the authenticated user (read-only, no lock)
const getOrCreateCart = async (userId) => {
  let cart = await pool.query("SELECT * FROM carts WHERE user_id = $1", [userId]);

  if (cart.rows.length === 0) {
    cart = await pool.query(
      "INSERT INTO carts (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING *",
      [userId]
    );
  }

  return cart.rows[0];
};

// Get or create cart for the authenticated user, locking the row so
// concurrent mutations (double-clicks, retried requests) on the same cart
// serialize instead of racing. Must be called inside a transaction.
const getOrCreateCartForUpdate = async (client, userId) => {
  let cart = await client.query("SELECT * FROM carts WHERE user_id = $1 FOR UPDATE", [userId]);

  if (cart.rows.length === 0) {
    cart = await client.query(
      "INSERT INTO carts (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING *",
      [userId]
    );
  }

  return cart.rows[0];
};

// GET /api/cart — Get user's cart with all items
export const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cart = await getOrCreateCart(userId);

    const items = await pool.query(
      `SELECT ci.id, ci.menu_item_id, ci.quantity, ci.food_type_choice, ci.created_at,
              mi.name, mi.price, mi.discount_price, mi.image_url
       FROM cart_items ci
       LEFT JOIN menu_items mi ON ci.menu_item_id = mi.id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at DESC`,
      [cart.id]
    );

    res.json({ cart_id: cart.id, items: items.rows });
  } catch (error) {
    next(error);
  }
};

// POST /api/cart/add — Add item to cart (upsert: increment if exists)
export const addToCart = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { menu_item_id, quantity, food_type_choice } = req.body;

    await client.query("BEGIN");

    const cart = await getOrCreateCartForUpdate(client, userId);

    // Look up the item's restaurant
    const menuItem = await client.query("SELECT restaurant_id FROM menu_items WHERE id = $1", [menu_item_id]);
    if (menuItem.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Menu item not found" });
    }
    const itemRestaurantId = menuItem.rows[0].restaurant_id;

    // A cart can only hold items from one restaurant at a time
    const cartRestaurants = await client.query(
      `SELECT DISTINCT mi.restaurant_id FROM cart_items ci
       JOIN menu_items mi ON ci.menu_item_id = mi.id
       WHERE ci.cart_id = $1`,
      [cart.id]
    );
    const otherRestaurant = cartRestaurants.rows.find((r) => r.restaurant_id !== itemRestaurantId);
    if (otherRestaurant) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Your cart has items from a different restaurant. Clear your cart to add items from this restaurant.",
      });
    }

    // Check if item already exists in cart (same item + same food type choice)
    const existingItem = await client.query(
      "SELECT * FROM cart_items WHERE cart_id = $1 AND menu_item_id = $2 AND (food_type_choice = $3 OR (food_type_choice IS NULL AND $3 IS NULL))",
      [cart.id, menu_item_id, food_type_choice || null]
    );

    let item;
    if (existingItem.rows.length > 0) {
      // Increment quantity
      const newQuantity = existingItem.rows[0].quantity + quantity;
      item = await client.query(
        "UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [newQuantity, existingItem.rows[0].id]
      );
    } else {
      // Insert new item
      item = await client.query(
        "INSERT INTO cart_items (cart_id, menu_item_id, quantity, food_type_choice, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *",
        [cart.id, menu_item_id, quantity, food_type_choice || null]
      );
    }

    // Update cart's updated_at
    await client.query("UPDATE carts SET updated_at = NOW() WHERE id = $1", [cart.id]);

    await client.query("COMMIT");

    res.status(201).json({ message: "Item added to cart", item: item.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// PUT /api/cart/update — Update item quantity (set to 0 removes it)
export const updateCartItem = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { item_id, quantity } = req.body;

    await client.query("BEGIN");

    // Lock the user's cart so this can't interleave with addToCart/clearCart
    await client.query("SELECT id FROM carts WHERE user_id = $1 FOR UPDATE", [userId]);

    // Verify the item belongs to this user's cart
    const ownership = await client.query(
      `SELECT ci.id FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = $1 AND c.user_id = $2`,
      [item_id, userId]
    );

    if (ownership.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found in your cart" });
    }

    // If quantity is 0 or less, remove the item
    if (quantity <= 0) {
      await client.query("DELETE FROM cart_items WHERE id = $1", [item_id]);
      await client.query("COMMIT");
      return res.json({ message: "Item removed from cart" });
    }

    const updated = await client.query(
      "UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [quantity, item_id]
    );

    // Update cart's updated_at
    await client.query(
      "UPDATE carts SET updated_at = NOW() WHERE id = (SELECT cart_id FROM cart_items WHERE id = $1)",
      [item_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Cart updated", item: updated.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// DELETE /api/cart/remove/:itemId — Remove specific item from cart
export const removeFromCart = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const itemId = parseInt(req.params.itemId);

    if (isNaN(itemId)) {
      return res.status(400).json({ message: "Invalid item ID" });
    }

    await client.query("BEGIN");

    await client.query("SELECT id FROM carts WHERE user_id = $1 FOR UPDATE", [userId]);

    // Verify ownership before deleting
    const ownership = await client.query(
      `SELECT ci.id FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = $1 AND c.user_id = $2`,
      [itemId, userId]
    );

    if (ownership.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Item not found in your cart" });
    }

    await client.query("DELETE FROM cart_items WHERE id = $1", [itemId]);

    // Update cart's updated_at
    await client.query("UPDATE carts SET updated_at = NOW() WHERE user_id = $1", [userId]);

    await client.query("COMMIT");

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};

// DELETE /api/cart/clear — Empty the entire cart
export const clearCart = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    await client.query("BEGIN");

    const cart = await client.query("SELECT id FROM carts WHERE user_id = $1 FOR UPDATE", [userId]);

    if (cart.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ message: "Cart is already empty" });
    }

    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart.rows[0].id]);

    // Update cart's updated_at
    await client.query("UPDATE carts SET updated_at = NOW() WHERE id = $1", [cart.rows[0].id]);

    await client.query("COMMIT");

    res.json({ message: "Cart cleared" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};
