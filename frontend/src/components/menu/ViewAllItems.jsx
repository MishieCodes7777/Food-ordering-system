import { Plus, Minus } from "lucide-react";

const ViewAllItems = ({
    categories, menuItems, foodTypeFilter, setFoodTypeFilter, setViewAll,
    openItemDetail, getCartQuantity, handleIncrement, handleDecrement, handleAddToCart,
}) => {
    return (
        <div>
            <div className="flex items-center gap-3 mb-5">
                <button
                    onClick={() => setViewAll(false)}
                    className="px-4 py-2 bg-white text-charcoal border border-gray-200 rounded-lg text-sm font-medium hover:border-primary transition-all"
                >
                    ← Back to Categories
                </button>
                <button
                    onClick={() => setFoodTypeFilter("all")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${foodTypeFilter === "all" ? "bg-primary text-white" : "bg-white text-charcoal border border-gray-200"}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFoodTypeFilter("veg")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${foodTypeFilter === "veg" ? "bg-green-500 text-white" : "bg-white text-charcoal border border-gray-200"}`}
                >
                    <span className="w-3 h-3 border-2 border-current rounded-sm flex items-center justify-center"><span className="w-1.5 h-1.5 bg-current rounded-full"></span></span>
                    Veg
                </button>
                <button
                    onClick={() => setFoodTypeFilter("nonveg")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${foodTypeFilter === "nonveg" ? "bg-red-500 text-white" : "bg-white text-charcoal border border-gray-200"}`}
                >
                    <span className="w-3 h-3 border-2 border-current rounded-sm flex items-center justify-center"><span className="w-1.5 h-1.5 bg-current rounded-full"></span></span>
                    Non-Veg
                </button>
            </div>

            {categories.map((cat) => {
                const catItems = menuItems.filter(i => {
                    if (i.category_id !== cat.id) return false;
                    if (foodTypeFilter === "veg") return i.is_veg || i.food_type === "veg" || i.food_type === "both";
                    if (foodTypeFilter === "nonveg") return !i.is_veg || i.food_type === "non-veg" || i.food_type === "both";
                    return true;
                });
                if (catItems.length === 0) return null;
                return (
                    <div key={cat.id} className="mb-8">
                        <h2 className="text-lg font-bold text-charcoal mb-3 flex items-center gap-2">
                            <span className="w-1 h-6 bg-accent rounded-full"></span>
                            {cat.name}
                            <span className="text-sm font-normal text-charcoal/40">({catItems.length})</span>
                        </h2>
                        <div className="space-y-3">
                            {catItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => openItemDetail(item)}
                                >
                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-cream">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-charcoal text-sm">{item.name}</h3>
                                            {item.is_veg ? (
                                                <span className="w-3 h-3 border-2 border-green-600 rounded-sm flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span></span>
                                            ) : (
                                                <span className="w-3 h-3 border-2 border-red-600 rounded-sm flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span></span>
                                            )}
                                        </div>
                                        <span className="font-bold text-accent text-sm">₹{item.discount_price || item.price}</span>
                                    </div>
                                    {getCartQuantity(item.id) > 0 ? (
                                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleDecrement(item.id)} className="w-7 h-7 rounded-full bg-cream flex items-center justify-center hover:bg-accent hover:text-white transition-all"><Minus size={12} /></button>
                                            <span className="w-6 text-center font-semibold text-charcoal text-xs">{getCartQuantity(item.id)}</span>
                                            <button onClick={() => handleIncrement(item.id)} className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-dark transition-all"><Plus size={12} /></button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAddToCart(item.id); }}
                                            className="bg-accent hover:bg-accent-dark text-white w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ViewAllItems;
