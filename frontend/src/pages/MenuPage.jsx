import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import api from "../services/api.js";
import { toast } from "sonner";
import MenuSearchHeader from "../components/menu/MenuSearchHeader.jsx";
import CategoryGrid from "../components/menu/CategoryGrid.jsx";
import ViewAllItems from "../components/menu/ViewAllItems.jsx";
import CategoryItemList from "../components/menu/CategoryItemList.jsx";
import ItemDetailModal from "../components/menu/ItemDetailModal.jsx";

const MenuPage = () => {
    const { user } = useAuth();
    const { addToCart, cartItems, updateItem, removeItem } = useCart();
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [foodTypeFilter, setFoodTypeFilter] = useState("all");
    const [viewAll, setViewAll] = useState(false); // "all", "veg", "nonveg"
    const [loading, setLoading] = useState(true);
    const [addingItemId, setAddingItemId] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [itemQuantity, setItemQuantity] = useState(1);
    const [foodTypeChoice, setFoodTypeChoice] = useState(null);

    useEffect(() => {
        fetchMenu();
    }, []);

    const fetchMenu = async () => {
        try {
            setLoading(true);
            const [catRes, itemRes] = await Promise.all([
                api.get("/api/menu/categories"),
                api.get("/api/menu/items"),
            ]);
            setCategories(catRes.data.categories || []);
            setMenuItems(itemRes.data.menu_items || []);
        } catch {
            setCategories([]);
            setMenuItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async (itemId, quantity = 1, typeChoice = null) => {
        if (!user) {
            toast.error("Please login to add items");
            return;
        }
        try {
            setAddingItemId(itemId);
            await addToCart(itemId, quantity, typeChoice);
            toast.success("Added to cart!");
            setSelectedItem(null);
            setItemQuantity(1);
            setFoodTypeChoice(null);
        } catch (error) {
            toast.error("Couldn't add to cart");
        } finally {
            setAddingItemId(null);
        }
    };

    const getCartQuantity = (menuItemId) => {
        const cartItem = cartItems.find(ci => ci.menu_item_id === menuItemId);
        return cartItem ? cartItem.quantity : 0;
    };

    const getCartItemId = (menuItemId) => {
        const cartItem = cartItems.find(ci => ci.menu_item_id === menuItemId);
        return cartItem ? cartItem.id : null;
    };

    const handleIncrement = async (menuItemId) => {
        if (!user) { toast.error("Please login"); return; }
        try {
            setAddingItemId(menuItemId);
            await addToCart(menuItemId, 1);
        } catch { toast.error("Couldn't update"); }
        finally { setAddingItemId(null); }
    };

    const handleDecrement = async (menuItemId) => {
        const cartItemId = getCartItemId(menuItemId);
        const qty = getCartQuantity(menuItemId);
        if (!cartItemId) return;
        try {
            setAddingItemId(menuItemId);
            if (qty <= 1) {
                await removeItem(cartItemId);
            } else {
                await updateItem(cartItemId, qty - 1);
            }
        } catch { toast.error("Couldn't update"); }
        finally { setAddingItemId(null); }
    };

    const openItemDetail = (item) => {
        setSelectedItem(item);
        setItemQuantity(1);
        // Default food type choice for "both" items
        if (item.food_type === "both") {
            setFoodTypeChoice("veg");
        } else {
            setFoodTypeChoice(null);
        }
    };

    // Suggestions for dropdown — only recomputed when search text or the
    // underlying catalog actually changes, not on every unrelated re-render
    // (e.g. a cart update, which changes cartItems and re-renders this page)
    const suggestionItems = useMemo(() => (
        searchQuery
            ? menuItems.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : []
    ), [searchQuery, menuItems]);

    const suggestionCategories = useMemo(() => (
        searchQuery
            ? categories.filter((cat) =>
                cat.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : []
    ), [searchQuery, categories]);

    // Main search: categories matching directly, or containing a matching item
    const visibleCategories = useMemo(() => {
        if (!searchQuery) return categories;

        const filteredCategories = categories.filter((cat) =>
            cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const categoriesWithMatchingItems = categories.filter((cat) =>
            menuItems.some(
                (item) =>
                    item.category_id === cat.id &&
                    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.description?.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        );

        return [...new Map([...filteredCategories, ...categoriesWithMatchingItems].map(c => [c.id, c])).values()];
    }, [searchQuery, categories, menuItems]);

    // Items for selected category (with local search + food type filter)
    const categoryItems = useMemo(() => (
        menuItems.filter((item) => {
            if (item.category_id !== selectedCategory?.id) return false;
            if (searchQuery && !(
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )) return false;
            // Food type filter
            if (foodTypeFilter === "veg") {
                return item.is_veg || item.food_type === "veg" || item.food_type === "both";
            }
            if (foodTypeFilter === "nonveg") {
                return !item.is_veg || item.food_type === "non-veg" || item.food_type === "both";
            }
            return true;
        })
    ), [menuItems, selectedCategory, searchQuery, foodTypeFilter]);

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream">
            <MenuSearchHeader
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                suggestionItems={suggestionItems}
                suggestionCategories={suggestionCategories}
                categories={categories}
                menuItems={menuItems}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8" onClick={() => setShowSuggestions(false)}>
                {/* Categories View */}
                {!selectedCategory && !viewAll && (
                    <CategoryGrid
                        visibleCategories={visibleCategories}
                        menuItems={menuItems}
                        setSelectedCategory={setSelectedCategory}
                        setSearchQuery={setSearchQuery}
                        setViewAll={setViewAll}
                    />
                )}

                {/* View All Items - grouped by category */}
                {viewAll && !selectedCategory && (
                    <ViewAllItems
                        categories={categories}
                        menuItems={menuItems}
                        foodTypeFilter={foodTypeFilter}
                        setFoodTypeFilter={setFoodTypeFilter}
                        setViewAll={setViewAll}
                        openItemDetail={openItemDetail}
                        getCartQuantity={getCartQuantity}
                        handleIncrement={handleIncrement}
                        handleDecrement={handleDecrement}
                        handleAddToCart={handleAddToCart}
                    />
                )}

                {/* Items View (inside a category) */}
                {selectedCategory && (
                    <CategoryItemList
                        foodTypeFilter={foodTypeFilter}
                        setFoodTypeFilter={setFoodTypeFilter}
                        categoryItems={categoryItems}
                        searchQuery={searchQuery}
                        openItemDetail={openItemDetail}
                        getCartQuantity={getCartQuantity}
                        addingItemId={addingItemId}
                        handleDecrement={handleDecrement}
                        handleIncrement={handleIncrement}
                        handleAddToCart={handleAddToCart}
                    />
                )}
            </div>

            <ItemDetailModal
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                itemQuantity={itemQuantity}
                setItemQuantity={setItemQuantity}
                foodTypeChoice={foodTypeChoice}
                setFoodTypeChoice={setFoodTypeChoice}
                addingItemId={addingItemId}
                handleAddToCart={handleAddToCart}
            />
        </div>
    );
};

export default MenuPage;
